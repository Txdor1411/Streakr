/**
 * Sign-in / sign-up gate.
 *
 * Streakr is online-only, so this is the mandatory screen between onboarding
 * and the app whenever there's no session — see the route guard in
 * `_layout.tsx`. Signing in swaps this screen out for the tabs automatically
 * and flips the store's sync engine on. Sign-up gets a light two-step flow
 * (form → check-your-inbox) so it feels like a continuation of onboarding
 * rather than a bare form.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { Wallpaper } from '@/components/wallpaper';
import { useAuth } from '@/design/auth';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const accent = theme.accent;
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  // Sign-up only: 0 = form, 1 = check-your-inbox.
  const [step, setStep] = useState<0 | 1>(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fade + rise on every step/mode change, matching the onboarding flow's feel.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [mode, step, opacity, translateY]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setStep(0);
    setError(null);
  };

  const run = async (fn: () => Promise<void>, signup = false) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (signup) setStep(1);
    } catch (e) {
      setError((e as Error)?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !busy;

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

  const checkItem = (met: boolean, label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: met ? Palette.emerald : theme.fillStrong }}>
        {met && <CheckIcon size={9} width={2.8} color="#fff" />}
      </View>
      <Body size={11.5} color={met ? theme.textSecondary : theme.textMuted}>
        {label}
      </Body>
    </View>
  );

  const success = mode === 'signup' && step === 1;

  return (
    <Wallpaper>
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20, paddingHorizontal: 22 }}>
        {/* Top bar: progress dots (sign-up's little journey only) */}
        <View style={{ height: 30, flexDirection: 'row', alignItems: 'center' }}>
          {mode === 'signup' && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? accent : theme.fillStrong }} />
              ))}
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <Animated.View style={{ flex: 1, justifyContent: success ? 'center' : undefined, opacity, transform: [{ translateY }] }}>
            {success ? (
              <View style={{ alignItems: 'center', paddingHorizontal: 10 }}>
                <View style={{ width: 92, height: 92, borderRadius: 26, backgroundColor: tint(Palette.emerald, dark ? '33' : '22'), alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Body size={44}>📬</Body>
                </View>
                <Display size={24} weight="700" style={{ textAlign: 'center' }}>
                  Check your inbox
                </Display>
                <Body size={14} secondary style={{ textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
                  We sent a confirmation link to {email.trim()}. Tap it, then come back and sign in.
                </Body>
              </View>
            ) : (
              <>
                <View style={{ alignItems: 'center', marginBottom: 22 }}>
                  <View style={{ width: 74, height: 74, borderRadius: 22, backgroundColor: tint(accent, dark ? '33' : '22'), alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Body size={36}>{mode === 'signin' ? '👋' : '🚀'}</Body>
                  </View>
                  <Display size={24} weight="700" style={{ textAlign: 'center' }}>
                    {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                  </Display>
                  <Body size={13.5} secondary style={{ textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
                    {mode === 'signin'
                      ? 'Sign in to sync your habits and see your friends.'
                      : 'Takes a few seconds — sync your habits and connect with friends.'}
                  </Body>
                </View>

                {/* Social */}
                <Pressable
                  disabled={busy}
                  onPress={() => run(() => signInWithApple())}
                  style={{ height: 52, borderRadius: 16, backgroundColor: dark ? '#fff' : '#000', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <Body size={17} color={dark ? '#000' : '#fff'}></Body>
                  <Display size={15} weight="600" color={dark ? '#000' : '#fff'}>
                    Continue with Apple
                  </Display>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => run(() => signInWithGoogle())}
                  style={{ height: 52, borderRadius: 16, backgroundColor: theme.fill, borderWidth: 1, borderColor: theme.glassBorder, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 18 }}>
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
                  editable={!busy}
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
                  editable={!busy}
                  onSubmitEditing={() => canSubmit && submit()}
                  style={mode === 'signup' ? [inputStyle, { marginBottom: 10 }] : inputStyle}
                />

                {mode === 'signup' && (
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                    {checkItem(emailValid, 'Valid email')}
                    {checkItem(passwordValid, '6+ characters')}
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={{ gap: 14, paddingTop: 12 }}>
          {error && (
            <Body size={12.5} color={Palette.coral} style={{ textAlign: 'center' }}>
              {error}
            </Body>
          )}

          {success ? (
            <Pressable
              onPress={() => switchMode('signin')}
              style={{ height: 54, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
              <Display size={16} weight="600" color="#fff">
                Back to sign in
              </Display>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={submit}
                disabled={!canSubmit}
                style={{ height: 54, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', opacity: canSubmit ? 1 : 0.5, shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Display size={16} weight="600" color="#fff">
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Display>
                )}
              </Pressable>

              <Pressable onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={{ alignItems: 'center' }}>
                <Body size={13.5} secondary>
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <Body size={13.5} weight="700" color={accent}>
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </Body>
                </Body>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Wallpaper>
  );
}
