/**
 * Supabase client — the app's backend handle.
 *
 * The app is local-first and stays fully usable without a backend: if the env
 * vars below are missing, `supabase` is `null` and every caller falls back to
 * on-device AsyncStorage. Provide credentials in a `.env.local` file (see
 * `.env.example`) to turn on cloud auth + sync.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when credentials are present and cloud features are available. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL-based session detection on native; we exchange OAuth codes by hand.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

// Pause/resume token auto-refresh with app foreground state, per Supabase's
// React Native guidance — refreshing in the background wastes work and can race.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
