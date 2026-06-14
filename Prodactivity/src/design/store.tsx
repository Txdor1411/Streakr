/**
 * App data layer — real, persisted habit tracking.
 *
 * Everything the UI used to fake (habit list, today's progress, streaks,
 * the profile) lives here, backed by AsyncStorage so it survives reloads.
 *
 * When a Supabase account is signed in, the same state syncs to the backend:
 * the local cache is the optimistic source of truth, and mutations push to the
 * server best-effort. On first sign-in we either adopt the account's remote
 * data or migrate the on-device data up to it (see the sync effect below).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './auth';
import { deleteHabit, migrateLocalToRemote, pullAll, pushHabit, pushLog, pushProfile, uuidv4 } from './sync';
import { Palette } from './tokens';

export type HabitType = 'count' | 'timer' | 'done';

/** A habit definition. Day-to-day progress is kept separately in `logs`. */
export type HabitDef = {
  id: string;
  emoji: string;
  name: string;
  /** Unit label, e.g. "glasses" / "minutes". */
  sub: string;
  accent: string;
  type: HabitType;
  /** Target per day. `done`/`timer` habits use a goal of 1. */
  goal: number;
  /** Mon→Sun schedule. A day that isn't scheduled never breaks a streak. */
  days: boolean[];
};

export type Profile = { name: string; emoji: string; username?: string };

/** habitId → (YYYY-MM-DD → amount logged that day). */
export type Logs = Record<string, Record<string, number>>;

type Persisted = { habits: HabitDef[]; logs: Logs; profile: Profile };

/** On-disk shape: the exportable data plus which account the cache belongs to. */
type Cached = Persisted & { ownerId?: string | null };

/** A habit projected onto a given day, ready for the existing card UI. */
export type HabitView = HabitDef & {
  value: number;
  streak: number;
  done: boolean;
};

const STORAGE_KEY = 'prodactivity:v1';
const ALL_DAYS = [true, true, true, true, true, true, true];

const SEED_HABITS: HabitDef[] = [
  { id: 'water', emoji: '💧', name: 'Drink water', sub: 'glasses', accent: Palette.water, type: 'count', goal: 8, days: ALL_DAYS },
  { id: 'med', emoji: '🧘', name: 'Meditate', sub: 'minutes', accent: Palette.meditate, type: 'timer', goal: 1, days: ALL_DAYS },
  { id: 'run', emoji: '🏃', name: 'Morning run', sub: 'session', accent: Palette.run, type: 'done', goal: 1, days: [true, true, true, true, true, false, false] },
  { id: 'read', emoji: '📚', name: 'Read', sub: 'session', accent: Palette.read, type: 'done', goal: 1, days: ALL_DAYS },
  { id: 'greens', emoji: '🥗', name: 'Eat greens', sub: 'servings', accent: Palette.greens, type: 'done', goal: 1, days: ALL_DAYS },
];

const SEED_PROFILE: Profile = { name: 'Budi', emoji: '🦊' };

// ---------------------------------------------------------------- date utils

/** Local YYYY-MM-DD key (avoids UTC off-by-one from toISOString). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

/** Monday = 0 … Sunday = 6, matching the `days` schedule array. */
function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ------------------------------------------------------------ streak compute

function isComplete(habit: HabitDef, amount: number | undefined): boolean {
  return (amount ?? 0) >= habit.goal;
}

/**
 * Current streak: consecutive *scheduled* days, counting back from today,
 * that were completed. Today not-yet-done is a grace day (doesn't break it);
 * unscheduled days are skipped.
 */
export function computeStreak(habit: HabitDef, log: Record<string, number> = {}): number {
  let streak = 0;
  let cursor = new Date();
  const today = todayKey();

  for (let i = 0; i < 730; i++) {
    const key = dateKey(cursor);
    const scheduled = habit.days[weekdayMon0(cursor)];
    if (scheduled) {
      if (isComplete(habit, log[key])) {
        streak++;
      } else if (key !== today) {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of completed scheduled days across all history. */
export function computeBestStreak(habit: HabitDef, log: Record<string, number> = {}): number {
  const keys = Object.keys(log).filter((k) => isComplete(habit, log[k]));
  if (keys.length === 0) return 0;
  keys.sort();
  const earliest = new Date(keys[0]);
  let best = 0;
  let run = 0;
  let cursor = new Date(earliest);
  const end = new Date();
  while (cursor <= end) {
    const key = dateKey(cursor);
    if (habit.days[weekdayMon0(cursor)]) {
      if (isComplete(habit, log[key])) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

// ------------------------------------------------------------------- context

type StoreValue = {
  ready: boolean;
  /** True while an initial pull/migration with the backend is in flight. */
  syncing: boolean;
  habits: HabitDef[];
  profile: Profile;
  /** Habits projected onto a day (default: today), with live streaks. */
  habitsForDay: (key?: string) => HabitView[];
  /** Raw per-day log for one habit. */
  logFor: (id: string) => Record<string, number>;
  /** Tap-to-log: toggles done/timer, increments count (wrapping at goal+1→0). */
  logHabit: (id: string, day?: string) => void;
  /** Set an explicit amount for a day (used by the count stepper / detail). */
  setAmount: (id: string, amount: number, day?: string) => void;
  addHabit: (def: Omit<HabitDef, 'id'>) => string;
  updateHabit: (id: string, patch: Partial<HabitDef>) => void;
  removeHabit: (id: string) => void;
  setProfile: (patch: Partial<Profile>) => void;
  /** Replace everything (used by JSON import). */
  replaceAll: (data: Persisted) => void;
  exportData: () => Persisted;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [habits, setHabits] = useState<HabitDef[]>(SEED_HABITS);
  const [logs, setLogs] = useState<Logs>({});
  const [profile, setProfileState] = useState<Profile>(SEED_PROFILE);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Latest values for use inside effects/callbacks without re-subscribing.
  const habitsRef = useRef(habits);
  const logsRef = useRef(logs);
  const profileRef = useRef(profile);
  const ownerRef = useRef(ownerId);
  const userIdRef = useRef(userId);
  habitsRef.current = habits;
  logsRef.current = logs;
  profileRef.current = profile;
  ownerRef.current = ownerId;
  userIdRef.current = userId;

  /** Best-effort remote write; failures keep local state and just warn in dev. */
  const fireRemote = useCallback((run: () => Promise<void>) => {
    if (!userIdRef.current || !isSupabaseConfigured) return;
    run().catch((e) => {
      if (__DEV__) console.warn('[sync]', e?.message ?? e);
    });
  }, []);

  // Hydrate the local cache once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && alive) {
          const data = JSON.parse(raw) as Partial<Cached>;
          if (data.habits) setHabits(data.habits);
          if (data.logs) setLogs(data.logs);
          if (data.profile) setProfileState({ ...SEED_PROFILE, ...data.profile });
          if (data.ownerId !== undefined) setOwnerId(data.ownerId);
        }
      } catch {
        // Corrupt/empty storage → fall back to seeds.
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist after hydration on any change.
  const first = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, logs, profile, ownerId } satisfies Cached)).catch(() => {});
  }, [ready, habits, logs, profile, ownerId]);

  // Reconcile with the backend whenever a user signs in.
  useEffect(() => {
    if (!ready || !userId || !isSupabaseConfigured) return;
    let alive = true;
    setSyncing(true);
    (async () => {
      try {
        const remote = await pullAll(userId);
        if (!alive) return;

        if (remote.habits.length > 0 || remote.profile) {
          // Account already has data → it wins; adopt it as the new local cache.
          if (remote.habits.length) setHabits(remote.habits);
          setLogs(remote.logs);
          if (remote.profile) setProfileState({ ...SEED_PROFILE, ...remote.profile });
        } else if (ownerRef.current === null || ownerRef.current === userId) {
          // Fresh account + cache is unsynced (or already ours) → migrate it up.
          const migrated = await migrateLocalToRemote(userId, habitsRef.current, logsRef.current, profileRef.current);
          if (!alive) return;
          setHabits(migrated.habits);
          setLogs(migrated.logs);
        } else {
          // Fresh account but the cache belongs to a different user → start clean.
          setHabits(SEED_HABITS);
          setLogs({});
          setProfileState(SEED_PROFILE);
        }
        if (alive) setOwnerId(userId);
      } catch (e) {
        // Offline / transient — keep using the local cache and retry next sign-in.
        if (__DEV__) console.warn('[sync] pull failed', (e as Error)?.message ?? e);
      } finally {
        if (alive) setSyncing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, userId]);

  const logFor = useCallback((id: string) => logs[id] ?? {}, [logs]);

  const habitsForDay = useCallback(
    (key: string = todayKey()): HabitView[] =>
      habits.map((h) => {
        const log = logs[h.id] ?? {};
        const value = log[key] ?? 0;
        return { ...h, value, done: isComplete(h, value), streak: computeStreak(h, log) };
      }),
    [habits, logs],
  );

  const setAmount = useCallback(
    (id: string, amount: number, day: string = todayKey()) => {
      setLogs((prev) => {
        const habitLog = { ...(prev[id] ?? {}) };
        if (amount <= 0) delete habitLog[day];
        else habitLog[day] = amount;
        return { ...prev, [id]: habitLog };
      });
      fireRemote(() => pushLog(userIdRef.current!, id, day, amount));
    },
    [fireRemote],
  );

  const logHabit = useCallback(
    (id: string, day: string = todayKey()) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;
      const current = logs[id]?.[day] ?? 0;
      if (habit.type === 'count') {
        const next = current >= habit.goal ? 0 : current + 1;
        setAmount(id, next, day);
      } else {
        setAmount(id, current >= 1 ? 0 : 1, day);
      }
    },
    [habits, logs, setAmount],
  );

  const addHabit = useCallback(
    (def: Omit<HabitDef, 'id'>) => {
      const id = uuidv4();
      const habit = { ...def, id };
      setHabits((prev) => {
        fireRemote(() => pushHabit(userIdRef.current!, habit, prev.length));
        return [...prev, habit];
      });
      return id;
    },
    [fireRemote],
  );

  const updateHabit = useCallback(
    (id: string, patch: Partial<HabitDef>) => {
      setHabits((prev) => {
        const index = prev.findIndex((h) => h.id === id);
        if (index === -1) return prev;
        const next = { ...prev[index], ...patch };
        fireRemote(() => pushHabit(userIdRef.current!, next, index));
        return prev.map((h) => (h.id === id ? next : h));
      });
    },
    [fireRemote],
  );

  const removeHabit = useCallback(
    (id: string) => {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setLogs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fireRemote(() => deleteHabit(id));
    },
    [fireRemote],
  );

  const setProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfileState((prev) => {
        const next = { ...prev, ...patch };
        fireRemote(() => pushProfile(userIdRef.current!, next));
        return next;
      });
    },
    [fireRemote],
  );

  const replaceAll = useCallback(
    (data: Persisted) => {
      const habits = data.habits ?? SEED_HABITS;
      const logs = data.logs ?? {};
      const profile = { ...SEED_PROFILE, ...(data.profile ?? {}) };
      setHabits(habits);
      setLogs(logs);
      setProfileState(profile);
      // Push the imported data up so the account reflects it too.
      fireRemote(async () => {
        const migrated = await migrateLocalToRemote(userIdRef.current!, habits, logs, profile);
        setHabits(migrated.habits);
        setLogs(migrated.logs);
      });
    },
    [fireRemote],
  );

  const exportData = useCallback((): Persisted => ({ habits, logs, profile }), [habits, logs, profile]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      syncing,
      habits,
      profile,
      habitsForDay,
      logFor,
      logHabit,
      setAmount,
      addHabit,
      updateHabit,
      removeHabit,
      setProfile,
      replaceAll,
      exportData,
    }),
    [ready, syncing, habits, profile, habitsForDay, logFor, logHabit, setAmount, addHabit, updateHabit, removeHabit, setProfile, replaceAll, exportData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
