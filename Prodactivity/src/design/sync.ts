/**
 * Supabase sync helpers for the habit store.
 *
 * Local state (AsyncStorage) is always the source of truth. Failed remote
 * pushes are appended to a persistent pending queue and replayed when the
 * app comes back online. On sign-in, local state is merged with the server
 * snapshot (local wins per entry) and the result is pushed up so the server
 * stays consistent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { HabitDef, Logs, Profile } from './store';

// --------------------------------------------------------------------- types

type DbHabit = {
  id: string;
  user_id: string;
  emoji: string;
  name: string;
  sub: string;
  accent: string;
  type: HabitDef['type'];
  goal: number;
  days: boolean[];
  position: number;
  archived_at: string | null;
};

type DbLog = { habit_id: string; day: string; amount: number };

export type RemoteSnapshot = { habits: HabitDef[]; logs: Logs; profile: Profile | null };

export type PendingOp =
  | { type: 'log'; habitId: string; day: string; amount: number }
  | { type: 'habit'; def: HabitDef; position: number }
  | { type: 'deleteHabit'; id: string }
  | { type: 'profile'; profile: Profile };

// ----------------------------------------------------------------- uuid util

/** RFC-4122 v4. Client-generated so optimistic inserts have a stable id. */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function rowToDef(row: DbHabit): HabitDef {
  return {
    id: row.id,
    emoji: row.emoji,
    name: row.name,
    sub: row.sub,
    accent: row.accent,
    type: row.type,
    goal: row.goal,
    days: row.days,
  };
}

function defToRow(userId: string, def: HabitDef, position: number): DbHabit {
  return {
    id: def.id,
    user_id: userId,
    emoji: def.emoji,
    name: def.name,
    sub: def.sub,
    accent: def.accent,
    type: def.type,
    goal: def.goal,
    days: def.days,
    position,
    archived_at: null,
  };
}

// -------------------------------------------------------------------- reads

/** Pull the full account state. Returns null fields when nothing exists yet. */
export async function pullAll(userId: string): Promise<RemoteSnapshot> {
  if (!supabase) return { habits: [], logs: {}, profile: null };

  const [habitsRes, logsRes, profileRes] = await Promise.all([
    supabase.from('habits').select('*').is('archived_at', null).order('position', { ascending: true }),
    supabase.from('habit_logs').select('habit_id, day, amount'),
    supabase.from('profiles').select('name, emoji, username, avatar_url').eq('id', userId).maybeSingle(),
  ]);

  if (habitsRes.error) throw habitsRes.error;
  if (logsRes.error) throw logsRes.error;
  if (profileRes.error) throw profileRes.error;

  const habits = (habitsRes.data as DbHabit[]).map(rowToDef);

  const logs: Logs = {};
  for (const row of (logsRes.data as DbLog[]) ?? []) {
    (logs[row.habit_id] ??= {})[row.day] = row.amount;
  }

  const profile = profileRes.data
    ? {
        name: profileRes.data.name,
        emoji: profileRes.data.emoji,
        username: profileRes.data.username ?? undefined,
        avatar_url: profileRes.data.avatar_url ?? undefined,
      }
    : null;
  return { habits, logs, profile };
}

// ------------------------------------------------------------------- writes

export async function pushHabit(userId: string, def: HabitDef, position: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('habits').upsert(defToRow(userId, def, position));
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  if (!supabase) return;
  // habit_logs cascade-delete via FK.
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function pushLog(userId: string, habitId: string, day: string, amount: number): Promise<void> {
  if (!supabase) return;
  if (amount <= 0) {
    const { error } = await supabase.from('habit_logs').delete().match({ habit_id: habitId, day });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('habit_logs')
    .upsert({ user_id: userId, habit_id: habitId, day, amount }, { onConflict: 'habit_id,day' });
  if (error) throw error;
}

export async function pushProfile(userId: string, profile: Profile): Promise<void> {
  if (!supabase) return;
  const row: { id: string; name: string; emoji: string; username?: string; avatar_url?: string } = {
    id: userId,
    name: profile.name,
    emoji: profile.emoji,
  };
  if (profile.username) row.username = profile.username.trim().toLowerCase();
  if (profile.avatar_url) row.avatar_url = profile.avatar_url;
  const { error } = await supabase.from('profiles').upsert(row);
  if (error) throw error;
}

/**
 * Upload an avatar image from a local URI to Supabase Storage.
 * Returns the public URL. Uses upsert so re-uploading replaces the old photo.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const path = `${userId}/avatar.jpg`;
  const form = new FormData();
  form.append('file', { uri: localUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);

  const { error } = await supabase.storage.from('avatars').upload(path, form, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so Image components re-fetch after a re-upload.
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ----------------------------------------------------------- pending queue

const QUEUE_KEY = 'prodactivity:pending';

export async function savePending(op: PendingOp): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: PendingOp[] = raw ? JSON.parse(raw) : [];
    queue.push(op);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function replayOp(userId: string, op: PendingOp): Promise<void> {
  switch (op.type) {
    case 'log': return pushLog(userId, op.habitId, op.day, op.amount);
    case 'habit': return pushHabit(userId, op.def, op.position);
    case 'deleteHabit': return deleteHabit(op.id);
    case 'profile': return pushProfile(userId, op.profile);
  }
}

/**
 * Replay all queued operations in order. Failed ops stay in the queue for
 * the next drain attempt; succeeded ops are removed.
 */
export async function drainQueue(userId: string): Promise<void> {
  if (!supabase) return;
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: PendingOp[] = JSON.parse(raw);
  if (!queue.length) return;

  const failed: PendingOp[] = [];
  for (const op of queue) {
    try {
      await replayOp(userId, op);
    } catch {
      failed.push(op);
    }
  }

  if (failed.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

// ------------------------------------------------------------- reconcile

/**
 * Merge local + server state, push the result back up.
 *
 * Local always wins per entry (habit definition, log amount per day).
 * Remote-only habits (e.g. from another device) are appended so they
 * aren't silently dropped. Seed slug-ids ("water") are remapped to UUIDs
 * before the push.
 */
export async function reconcileAndPush(
  userId: string,
  localHabits: HabitDef[],
  localLogs: Logs,
  localProfile: Profile,
  remote: RemoteSnapshot,
): Promise<{ habits: HabitDef[]; logs: Logs }> {
  // Remap slug ids to proper UUIDs
  const idMap = new Map<string, string>();
  const remappedHabits = localHabits.map((h) => {
    const id = isUuid(h.id) ? h.id : uuidv4();
    idMap.set(h.id, id);
    return { ...h, id };
  });

  const remappedLogs: Logs = {};
  for (const [oldId, perDay] of Object.entries(localLogs)) {
    const newId = idMap.get(oldId) ?? oldId;
    if (Object.keys(perDay).length) remappedLogs[newId] = perDay;
  }

  // Merge habits: local wins; remote-only habits (other device) are appended
  const localIds = new Set(remappedHabits.map((h) => h.id));
  const habits = [
    ...remappedHabits,
    ...remote.habits.filter((h) => !localIds.has(h.id)),
  ];

  // Merge logs: remote first, local overwrites per (habit_id, day)
  const logs: Logs = {};
  for (const [id, perDay] of Object.entries(remote.logs)) {
    logs[id] = { ...perDay };
  }
  for (const [id, perDay] of Object.entries(remappedLogs)) {
    logs[id] = { ...(logs[id] ?? {}), ...perDay };
  }

  // Push merged state to server
  await pushProfile(userId, localProfile);

  if (habits.length && supabase) {
    const { error } = await supabase.from('habits').upsert(habits.map((h, i) => defToRow(userId, h, i)));
    if (error) throw error;
  }

  const logRows = Object.entries(logs).flatMap(([habitId, perDay]) =>
    Object.entries(perDay)
      .filter(([, amount]) => amount > 0)
      .map(([day, amount]) => ({ user_id: userId, habit_id: habitId, day, amount })),
  );
  if (logRows.length && supabase) {
    const { error } = await supabase.from('habit_logs').upsert(logRows, { onConflict: 'habit_id,day' });
    if (error) throw error;
  }

  return { habits, logs };
}
