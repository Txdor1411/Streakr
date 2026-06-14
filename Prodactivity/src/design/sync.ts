/**
 * Supabase sync helpers for the habit store.
 *
 * These are thin, resource-shaped functions over the `habits`, `habit_logs`,
 * and `profiles` tables. The store calls them optimistically: local state +
 * AsyncStorage update first, then these push to the backend best-effort.
 */
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
    supabase.from('profiles').select('name, emoji').eq('id', userId).maybeSingle(),
  ]);

  if (habitsRes.error) throw habitsRes.error;
  if (logsRes.error) throw logsRes.error;
  if (profileRes.error) throw profileRes.error;

  const habits = (habitsRes.data as DbHabit[]).map(rowToDef);

  const logs: Logs = {};
  for (const row of (logsRes.data as DbLog[]) ?? []) {
    (logs[row.habit_id] ??= {})[row.day] = row.amount;
  }

  const profile = profileRes.data ? { name: profileRes.data.name, emoji: profileRes.data.emoji } : null;
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
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, name: profile.name, emoji: profile.emoji });
  if (error) throw error;
}

/**
 * First sign-in migration: push on-device data to a fresh account.
 *
 * Seed habits use slug ids ("water") that aren't valid uuids, so we remap them
 * and rewrite the logs to match. Returns the remapped state for the store to
 * adopt, keeping local and remote ids identical from here on.
 */
export async function migrateLocalToRemote(
  userId: string,
  habits: HabitDef[],
  logs: Logs,
  profile: Profile,
): Promise<{ habits: HabitDef[]; logs: Logs }> {
  const idMap = new Map<string, string>();
  const nextHabits = habits.map((h) => {
    const id = isUuid(h.id) ? h.id : uuidv4();
    idMap.set(h.id, id);
    return { ...h, id };
  });

  const nextLogs: Logs = {};
  for (const [oldId, perDay] of Object.entries(logs)) {
    const newId = idMap.get(oldId) ?? oldId;
    if (Object.keys(perDay).length) nextLogs[newId] = perDay;
  }

  await pushProfile(userId, profile);

  if (nextHabits.length) {
    const rows = nextHabits.map((h, i) => defToRow(userId, h, i));
    const { error } = supabase ? await supabase.from('habits').upsert(rows) : { error: null };
    if (error) throw error;
  }

  const logRows = Object.entries(nextLogs).flatMap(([habitId, perDay]) =>
    Object.entries(perDay)
      .filter(([, amount]) => amount > 0)
      .map(([day, amount]) => ({ user_id: userId, habit_id: habitId, day, amount })),
  );
  if (logRows.length && supabase) {
    const { error } = await supabase.from('habit_logs').upsert(logRows, { onConflict: 'habit_id,day' });
    if (error) throw error;
  }

  return { habits: nextHabits, logs: nextLogs };
}
