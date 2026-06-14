/**
 * First-run onboarding: welcome → profile (name/emoji/@username) → account.
 *
 * Optional by design — every step can be skipped and the app stays fully
 * local-first. Finishing saves the profile and flips the persisted onboarding
 * flag, which swaps the route gate (see `_layout.tsx`) over to the tabs.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wallpaper } from '@/components/wallpaper';
import { CheckIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useAuth } from '@/design/auth';
import { useOnboarding } from '@/design/onboarding';
import { useStore } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐧', '🦉', '🐲', '🌟', '🚀', '🔥', '🌈', '🧠', '💪', '🌱', '⚡️'];

const FEATURES: { emoji: string; title: string; sub: string }[] = [
  { emoji: '✅', title: 'Build daily habits', sub: 'Track water, runs, reading and more.' },
  { emoji: '🔥', title: 'Keep your streaks', sub: 'Stay consistent and watch them grow.' },
  { emoji: '📸', title: 'Stay accountable', sub: 'Post proof and cheer on friends.' },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { profile, setProfile } = useStore();
  const { configured, session, user } = useAuth();
  const { complete } = useOnboarding();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name === 'Budi' ? '' : profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [username, setUsername] = useState(profile.username ?? '');

  const trimmed = name.trim();
  const handle = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const finish = () => {
    setProfile({ name: trimmed || 'You', emoji, ...(handle ? { username: handle } : null) });
    complete();
  };

  const accent = theme.accent;
  const inputStyle = {
    backgroundColor: theme.fill,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Batica',
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.textStrong,
  };

  const primaryButton = (text: string, onPress: () => void, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ height: 54, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1, shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
      <Display size={16} weight="600" color="#fff">
        {text}
      </Display>
    </Pressable>
  );

  return (
    <Wallpaper>
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20, paddingHorizontal: 22 }}>
        {/* Top bar: progress dots + skip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? accent : theme.fillStrong }} />
            ))}
          </View>
          {step < 2 && (
            <Pressable onPress={finish} hitSlop={8}>
              <Body size={14} weight="600" color={theme.textSecondary}>
                Skip
              </Body>
            </Pressable>
          )}
        </View>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: tint(accent, dark ? '33' : '22'), alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Body size={52}>🦊</Body>
              </View>
              <Display size={30} weight="700" style={{ textAlign: 'center' }}>
                Welcome to Prodactivity
              </Display>
              <Body size={15} secondary style={{ textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
                Tiny daily wins, real streaks, and friends to keep you honest.
              </Body>
            </View>
            <View style={{ gap: 14 }}>
              {FEATURES.map((f) => (
                <View key={f.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center' }}>
                    <Body size={22}>{f.emoji}</Body>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Display size={15.5} weight="600">
                      {f.title}
                    </Display>
                    <Body size={12.5} secondary style={{ marginTop: 2 }}>
                      {f.sub}
                    </Body>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1 — Profile */}
        {step === 1 && (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 20 }}>
            <Display size={26} weight="700">
              Set up your profile
            </Display>
            <Body size={14} secondary style={{ marginTop: 6, marginBottom: 22 }}>
              This is how you’ll show up to friends.
            </Body>

            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: dark ? '#4a3f5a' : '#FFCFA0', alignItems: 'center', justifyContent: 'center' }}>
                <Body size={44}>{emoji}</Body>
              </View>
              <Display size={18} weight="600" style={{ marginTop: 12 }}>
                {trimmed || 'You'}
                {handle ? (
                  <Body size={14} secondary>
                    {'  @' + handle}
                  </Body>
                ) : null}
              </Display>
            </View>

            <Body size={12} weight="600" muted style={{ marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Name
            </Body>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.textMuted} maxLength={24} style={[inputStyle, { marginBottom: 18 }]} />

            <Body size={12} weight="600" muted style={{ marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Username
            </Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, marginBottom: 6 }}>
              <Body size={16} weight="600" color={theme.textMuted}>
                @
              </Body>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                style={{ flex: 1, paddingVertical: 13, paddingLeft: 2, fontFamily: 'Batica', fontSize: 16, fontWeight: '600', color: theme.textStrong }}
              />
            </View>
            <Body size={11.5} muted style={{ marginBottom: 20 }}>
              How friends find you. Lowercase letters, numbers and underscores.
            </Body>

            <Body size={12} weight="600" muted style={{ marginBottom: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Avatar
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {AVATARS.map((a) => {
                const on = a === emoji;
                return (
                  <Pressable
                    key={a}
                    onPress={() => setEmoji(a)}
                    style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tint(accent, '26') : theme.fill, borderWidth: on ? 2 : 0, borderColor: accent }}>
                    <Body size={26}>{a}</Body>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 26 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: tint(Palette.water, dark ? '33' : '22'), alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Body size={40}>{session ? '✅' : '☁️'}</Body>
              </View>
              <Display size={24} weight="700" style={{ textAlign: 'center' }}>
                {session ? "You're all set" : 'Sync & add friends'}
              </Display>
              <Body size={14} secondary style={{ textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
                {session
                  ? `Signed in as ${user?.email ?? 'your account'}. Your habits back up and friends can find you.`
                  : 'Create an account to back up your habits across devices and connect with friends. You can also keep everything on this device.'}
              </Body>
            </View>

            {!configured && (
              <View style={{ padding: 13, borderRadius: 14, backgroundColor: tint(Palette.coral, '1f'), marginBottom: 16 }}>
                <Body size={12.5} color={Palette.coral} weight="600">
                  Backend not configured — running local-only. Add Supabase keys to .env.local to enable accounts.
                </Body>
              </View>
            )}

            {!session && configured && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16, paddingHorizontal: 4 }}>
                <CheckIcon size={16} width={2.6} color={Palette.emerald} />
                <Body size={12.5} secondary style={{ flex: 1 }}>
                  Sign-in is optional — the app works fully offline without an account.
                </Body>
              </View>
            )}
          </ScrollView>
        )}

        {/* Bottom actions */}
        <View style={{ gap: 12, paddingTop: 12 }}>
          {step === 0 && primaryButton('Get started', () => setStep(1))}

          {step === 1 && primaryButton('Continue', () => setStep(2))}

          {step === 2 && (
            <>
              {session
                ? primaryButton('Start using Prodactivity', finish)
                : configured
                  ? primaryButton('Sign in or create account', () => router.push('/auth'))
                  : primaryButton('Get started', finish)}
              {!session && configured && (
                <Pressable onPress={finish} style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
                  <Body size={14.5} weight="600" color={theme.textSecondary}>
                    Maybe later
                  </Body>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </Wallpaper>
  );
}
