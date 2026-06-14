/**
 * First-run onboarding flag.
 *
 * A tiny persisted boolean: once the user finishes (or skips) onboarding we set
 * it and never show the flow again — even when signed out, keeping the app
 * local-first. The route gate in `app/_layout.tsx` reads `onboarded` to decide
 * whether to show the onboarding screen or the tabs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'prodactivity:onboarded:v1';

type OnboardingValue = {
  /** False until the persisted flag has been read. */
  ready: boolean;
  onboarded: boolean;
  /** Mark onboarding finished (or skipped) and persist it. */
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive) {
          setOnboarded(v === 'done');
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const complete = useCallback(() => {
    setOnboarded(true);
    AsyncStorage.setItem(STORAGE_KEY, 'done').catch(() => {});
  }, []);

  const value = useMemo<OnboardingValue>(() => ({ ready, onboarded, complete }), [ready, onboarded, complete]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
