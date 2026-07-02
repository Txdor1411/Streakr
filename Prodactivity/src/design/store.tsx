/**
 * App data layer — real, persisted habit tracking.
 *
 * AsyncStorage is the source of truth. Mutations write locally first, then
 * push to Supabase. If the push fails (offline), the operation is appended
 * to a persistent pending queue and replayed the next time the app comes to
 * the foreground. On sign-in, local state is merged with the server snapshot
 * (local wins per entry) so no offline work is ever lost.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './auth';
import {
  drainQueue,
  pullAll,
  reconcileAndPush,
  replayOp,
  savePending,
  uuidv4,
  type PendingOp,
} from './sync';
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

export type Profile = { name: string; emoji: string; username?: string; avatar_url?: string };

/** habitId → (YYYY-MM-DD → amount logged that day). */
export type Logs = Record<string, Record<string, number>>;

export type Persisted = { habits: HabitDef[]; logs: Logs; profile: Profile; freezes?: number; frozenArr?: string[] };

/** On-disk shape: the exportable data plus which account the cache belongs to. */
type Cached = Persisted & { ownerId?: string | null };

/** A habit projected onto a given day, ready for the existing card UI. */
export type HabitView = HabitDef & {
  value: number;
  streak: number;
  done: boolean;
};

const STORAGE_KEY = 'streakr:v1';
const ALL_DAYS = [true, true, true, true, true, true, true];

/** Streak-freeze tokens every account starts with (spend to save a missed day). */
export const MAX_FREEZES = 3;

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
export function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Display-only week-start preference. Habit schedules are always stored Mon→Sun (see `HabitDef.days`). */
export type WeekStart = 'monday' | 'sunday';

/** Start of the displayed week containing `d`, per the week-start preference. */
export function weekStartDate(d: Date, weekStart: WeekStart = 'monday'): Date {
  const idx = weekdayMon0(d);
  const back = weekStart === 'sunday' ? (idx + 1) % 7 : idx;
  return addDays(d, -back);
}

// ------------------------------------------------------------ streak compute

function isComplete(habit: HabitDef, amount: number | undefined): boolean {
  return (amount ?? 0) >= habit.goal;
}

/**
 * Current streak: consecutive *scheduled* days, counting back from today,
 * that were completed. Today not-yet-done is a grace day (doesn't break it);
 * unscheduled days are skipped. Frozen dates count as completed.
 */
export function computeStreak(
  habit: HabitDef,
  log: Record<string, number> = {},
  frozenDates: ReadonlySet<string> = new Set(),
): number {
  let streak = 0;
  let cursor = new Date();
  const today = todayKey();

  for (let i = 0; i < 730; i++) {
    const key = dateKey(cursor);
    const scheduled = habit.days[weekdayMon0(cursor)];
    if (scheduled) {
      if (isComplete(habit, log[key]) || frozenDates.has(key)) {
        streak++;
      } else if (key !== today) {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of completed scheduled days across all history. Frozen dates count as completed. */
export function computeBestStreak(
  habit: HabitDef,
  log: Record<string, number> = {},
  frozenDates: ReadonlySet<string> = new Set(),
): number {
  const keys = Object.keys(log).filter((k) => isComplete(habit, log[k]));
  if (keys.length === 0 && frozenDates.size === 0) return 0;
  const allKeys = [...keys, ...frozenDates].sort();
  if (allKeys.length === 0) return 0;
  const earliest = new Date(allKeys[0]);
  let best = 0;
  let run = 0;
  let cursor = new Date(earliest);
  const end = new Date();
  while (cursor <= end) {
    const key = dateKey(cursor);
    if (habit.days[weekdayMon0(cursor)]) {
      if (isComplete(habit, log[key]) || frozenDates.has(key)) {
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
  /** True while an initial pull/merge with the backend is in flight. */
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
  /** Remaining streak-freeze tokens (starts at MAX_FREEZES). */
  freezes: number;
  /** Dates (YYYY-MM-DD) protected by a streak freeze. */
  frozenDates: ReadonlySet<string>;
  /** Spend one freeze token to protect a day; no-op if out of tokens or day already frozen. */
  freezeDay: (day?: string) => void;
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
  const [freezes, setFreezes] = useState(MAX_FREEZES);
  const [frozenArr, setFrozenArr] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const frozenDates = useMemo(() => new Set(frozenArr), [frozenArr]);

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

  /**
   * Fire-and-queue: try to execute the op remotely; if it fails (offline or
   * transient error), save it to the pending queue for the next drain.
   */
  const fireRemote = useCallback((op: PendingOp) => {
    const uid = userIdRef.current;
    if (!uid || !isSupabaseConfigured) return;
    replayOp(uid, op).catch(() => {
      savePending(op).catch(() => {});
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
          if (typeof data.freezes === 'number') setFreezes(data.freezes);
          if (Array.isArray(data.frozenArr)) setFrozenArr(data.frozenArr);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, logs, profile, freezes, frozenArr, ownerId } satisfies Cached)).catch(() => {});
  }, [ready, habits, logs, profile, freezes, frozenArr, ownerId]);

  // Drain the pending queue whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userIdRef.current && isSupabaseConfigured) {
        drainQueue(userIdRef.current).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Reconcile with the backend whenever a user signs in.
  useEffect(() => {
    if (!ready || !userId || !isSupabaseConfigured) return;
    let alive = true;
    setSyncing(true);
    (async () => {
      try {
        // Flush any queued offline writes before pulling the server snapshot.
        await drainQueue(userId);
        if (!alive) return;

        const remote = await pullAll(userId);
        if (!alive) return;

        if (ownerRef.current !== null && ownerRef.current !== userId) {
          // Different user on this device → their server data wins, start clean.
          if (remote.habits.length) setHabits(remote.habits);
          setLogs(remote.logs);
          if (remote.profile) setProfileState({ ...SEED_PROFILE, ...remote.profile });
        } else {
          // Same user or first login → merge local (wins) + remote, push result.
          const merged = await reconcileAndPush(
            userId,
            habitsRef.current,
            logsRef.current,
            profileRef.current,
            remote,
          );
          if (!alive) return;
          setHabits(merged.habits);
          setLogs(merged.logs);
        }

        if (alive) setOwnerId(userId);
      } catch (e) {
        if (__DEV__) console.warn('[sync] reconcile failed', (e as Error)?.message ?? e);
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
        return { ...h, value, done: isComplete(h, value), streak: computeStreak(h, log, frozenDates) };
      }),
    [habits, logs, frozenDates],
  );

  const setAmount = useCallback(
    (id: string, amount: number, day: string = todayKey()) => {
      setLogs((prev) => {
        const habitLog = { ...(prev[id] ?? {}) };
        if (amount <= 0) delete habitLog[day];
        else habitLog[day] = amount;
        return { ...prev, [id]: habitLog };
      });
      fireRemote({ type: 'log', habitId: id, day, amount });
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
        fireRemote({ type: 'habit', def: habit, position: prev.length });
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
        fireRemote({ type: 'habit', def: next, position: index });
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
      fireRemote({ type: 'deleteHabit', id });
    },
    [fireRemote],
  );

  const setProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfileState((prev) => {
        const next = { ...prev, ...patch };
        fireRemote({ type: 'profile', profile: next });
        return next;
      });
    },
    [fireRemote],
  );

  const freezeDay = useCallback(
    (day: string = todayKey()) => {
      if (freezes <= 0 || frozenArr.includes(day)) return;
      setFrozenArr((prev) => [...prev, day]);
      setFreezes((prev) => prev - 1);
    },
    [freezes, frozenArr],
  );

  const replaceAll = useCallback(
    (data: Persisted) => {
      const nextHabits = data.habits ?? SEED_HABITS;
      const nextLogs = data.logs ?? {};
      const nextProfile = { ...SEED_PROFILE, ...(data.profile ?? {}) };
      setHabits(nextHabits);
      setLogs(nextLogs);
      setProfileState(nextProfile);
      setFreezes(typeof data.freezes === 'number' ? data.freezes : MAX_FREEZES);
      setFrozenArr(Array.isArray(data.frozenArr) ? data.frozenArr : []);
      const uid = userIdRef.current;
      if (uid && isSupabaseConfigured) {
        // Imported data becomes canonical — push it with an empty remote baseline.
        reconcileAndPush(uid, nextHabits, nextLogs, nextProfile, { habits: [], logs: {}, profile: null })
          .then(({ habits: h, logs: l }) => {
            setHabits(h);
            setLogs(l);
          })
          .catch(() => {});
      }
    },
    [],
  );

  const exportData = useCallback((): Persisted => ({ habits, logs, profile, freezes, frozenArr }), [habits, logs, profile, freezes, frozenArr]);

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
      freezes,
      frozenDates,
      freezeDay,
      replaceAll,
      exportData,
    }),
    [ready, syncing, habits, profile, habitsForDay, logFor, logHabit, setAmount, addHabit, updateHabit, removeHabit, setProfile, freezes, frozenDates, freezeDay, replaceAll, exportData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
