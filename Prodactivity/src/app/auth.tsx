/**
 * Sign-in / sign-up modal.
 *
 * Email + password plus Apple and Google. Signing in flips the store's sync
 * engine on: local data migrates up on a fresh account, or the account's data
 * is pulled down. Closing without signing in keeps the app fully local-first.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useAuth } from '@/design/auth';
import { useTheme } from '@/design/theme';
import { Palette } from '@/design/tokens';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { configured, session, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sheetBg = dark ? '#16161e' : 'rgba(248,247,250,0.98)';

  // Close automatically once a session lands (e.g. after OAuth round-trip).
  useEffect(() => {
    if (session) router.back();
  }, [session, router]);

  const run = async (fn: () => Promise<void>, signup = false) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (signup) setNotice('Check your email to confirm your account, then sign in.');
    } catch (e) {
      setError((e as Error)?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && !busy;

  const submit = () =>
    mode === 'signin'
      ? run(() => signInWithEmail(email, password))
      : run(() => signUpWithEmail(email, password), true);

  const inputStyle = {
    backgroundColor: theme.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Batica',
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.textStrong,
    marginBottom: 12,
  };

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: insets.bottom + 26 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: theme.fillStrong, alignSelf: 'center', marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Display size={22} weight="600">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Display>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        <Body size={13} secondary style={{ marginBottom: 20, lineHeight: 19 }}>
          Sync your habits across devices and back them up. Your on-device data moves up to your account automatically.
        </Body>

        {!configured && (
          <View style={{ padding: 13, borderRadius: 14, backgroundColor: Palette.coral + '1f', marginBottom: 16 }}>
            <Body size={12.5} color={Palette.coral} weight="600">
              Backend not configured. Add EXPO_PUBLIC_SUPABASE_URL and …_ANON_KEY to .env.local to enable accounts.
            </Body>
          </View>
        )}

        {/* Social */}
        <Pressable
          disabled={busy || !configured}
          onPress={() => run(() => signInWithApple())}
          style={{ height: 52, borderRadius: 16, backgroundColor: dark ? '#fff' : '#000', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: configured ? 1 : 0.5, marginBottom: 10 }}>
          <Body size={17} color={dark ? '#000' : '#fff'}></Body>
          <Display size={15} weight="600" color={dark ? '#000' : '#fff'}>
            Continue with Apple
          </Display>
        </Pressable>

        <Pressable
          disabled={busy || !configured}
          onPress={() => run(() => signInWithGoogle())}
          style={{ height: 52, borderRadius: 16, backgroundColor: theme.fill, borderWidth: 1, borderColor: theme.glassBorder, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: configured ? 1 : 0.5, marginBottom: 18 }}>
          <Display size={15} weight="600">
            Continue with Google
          </Display>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
          <Body size={12} muted>
            or with email
          </Body>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.hairline }} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={configured && !busy}
          style={inputStyle}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (min 6 chars)"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          secureTextEntry
          textContentType={mode === 'signin' ? 'password' : 'newPassword'}
          editable={configured && !busy}
          onSubmitEditing={() => canSubmit && submit()}
          style={inputStyle}
        />

        {error && (
          <Body size={12.5} color={Palette.coral} style={{ marginBottom: 12, marginTop: 2 }}>
            {error}
          </Body>
        )}
        {notice && (
          <Body size={12.5} color={Palette.emerald} style={{ marginBottom: 12, marginTop: 2 }}>
            {notice}
          </Body>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{ height: 54, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: canSubmit ? 1 : 0.5, marginTop: 4, shadowColor: theme.accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Display size={16} weight="600" color="#fff">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Display>
          )}
        </Pressable>

        <Pressable onPress={() => { setMode((m) => (m === 'signin' ? 'signup' : 'signin')); setError(null); setNotice(null); }} style={{ marginTop: 18, alignItems: 'center' }}>
          <Body size={13.5} secondary>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Body size={13.5} weight="700" color={theme.accent}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </Body>
          </Body>
        </Pressable>
      </ScrollView>
    </View>
  );
}
