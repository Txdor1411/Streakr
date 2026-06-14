/**
 * Auth layer — wraps Supabase Auth in a React context.
 *
 * Exposes the current session plus the sign-in surfaces the UI needs:
 * email/password, Apple, and Google. When Supabase isn't configured the
 * provider still mounts (so the app runs local-first) but every action is a
 * no-op and `session` stays null.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Lets the in-app browser dismiss itself when the OAuth redirect returns.
WebBrowser.maybeCompleteAuthSession();

/** Deep link the OAuth provider redirects back to (uses the `prodactivity` scheme). */
const redirectTo = AuthSession.makeRedirectUri();

export type OAuthProvider = 'google' | 'apple';

type AuthValue = {
  /** False until the initial session check resolves. */
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Exchange the `?code=` from an OAuth redirect for a real session. */
async function exchangeCodeFromUrl(url: string): Promise<void> {
  if (!supabase) return;
  const { queryParams } = Linking.parse(url);
  const errorCode = queryParams?.error_code ?? queryParams?.error;
  if (typeof errorCode === 'string') throw new Error(errorCode);
  const code = queryParams?.code;
  if (typeof code !== 'string') return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);

  // Load the persisted session, then track auth changes for the app's lifetime.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle the OAuth redirect both on cold start and while the app is open.
  useEffect(() => {
    if (!supabase) return;
    Linking.getInitialURL().then((url) => {
      if (url) exchangeCodeFromUrl(url).catch(() => {});
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      exchangeCodeFromUrl(url).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Backend not configured');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Backend not configured');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (!supabase) throw new Error('Backend not configured');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await exchangeCodeFromUrl(result.url);
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error('Backend not configured');
    // Native Apple sign-in on iOS (best UX, App Store requirement); web OAuth elsewhere.
    if (Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync())) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      return;
    }
    await signInWithOAuth('apple');
  }, [signInWithOAuth]);

  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      signInWithEmail,
      signUpWithEmail,
      signInWithApple,
      signInWithGoogle,
      signOut,
    }),
    [ready, session, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
