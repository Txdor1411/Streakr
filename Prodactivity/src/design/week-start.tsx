/**
 * Week-start preference — which day the week begins on for weekly UI (Today's
 * strip, Insights' weekday bars, the habit schedule picker). Persisted locally;
 * purely a display preference. Habit schedules stay stored Mon→Sun internally
 * regardless of this setting (see `HabitDef.days` in `store.tsx`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { WeekStart } from './store';

const STORAGE_KEY = 'streakr:weekStart:v1';

type WeekStartValue = { weekStart: WeekStart; setWeekStart: (w: WeekStart) => void };

const WeekStartContext = createContext<WeekStartValue | null>(null);

export function WeekStartProvider({ children }: { children: ReactNode }) {
  const [weekStart, setWeekStartState] = useState<WeekStart>('monday');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'monday' || v === 'sunday') setWeekStartState(v);
      })
      .catch(() => {});
  }, []);

  const setWeekStart = useCallback((w: WeekStart) => {
    setWeekStartState(w);
    AsyncStorage.setItem(STORAGE_KEY, w).catch(() => {});
  }, []);

  const value = useMemo<WeekStartValue>(() => ({ weekStart, setWeekStart }), [weekStart, setWeekStart]);

  return <WeekStartContext.Provider value={value}>{children}</WeekStartContext.Provider>;
}

export function useWeekStart() {
  const ctx = useContext(WeekStartContext);
  if (!ctx) throw new Error('useWeekStart must be used within WeekStartProvider');
  return ctx;
}
