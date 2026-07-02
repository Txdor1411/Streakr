/**
 * First-run onboarding: welcome → profile (name/emoji/@username).
 *
 * Finishing saves the profile and flips the persisted onboarding flag, which
 * swaps the route gate (see `_layout.tsx`) over to the sign-in gate — Streakr
 * is a social app and requires an account beyond this point.
 */
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wallpaper } from '@/components/wallpaper';
import { Body, Display } from '@/components/text';
import { useOnboarding } from '@/design/onboarding';
import { useStore } from '@/design/store';
import { useTheme } from '@/design/theme';
import { tint } from '@/design/tokens';

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐧', '🦉', '🐲', '🌟', '🚀', '🔥', '🌈', '🧠', '💪', '🌱', '⚡️'];

const FEATURES: { emoji: string; title: string; sub: string }[] = [
  { emoji: '✅', title: 'Build daily habits', sub: 'Track water, runs, reading and more.' },
  { emoji: '🔥', title: 'Keep your streaks', sub: 'Stay consistent and watch them grow.' },
  { emoji: '📸', title: 'Stay accountable', sub: 'Post proof and cheer on friends.' },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { profile, setProfile } = useStore();
  const { complete } = useOnboarding();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name === 'Budi' ? '' : profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [username, setUsername] = useState(profile.username ?? '');

  const trimmed = name.trim();
  const handle = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const finish = useCallback(() => {
    setProfile({ name: trimmed || profile.name, emoji, ...(handle ? { username: handle } : null) });
    complete();
  }, [trimmed, profile.name, emoji, handle, setProfile, complete]);

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
            {[0, 1].map((i) => (
              <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? accent : theme.fillStrong }} />
            ))}
          </View>
          {step < 1 && (
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
                Welcome to Streakr
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
              What should we call you?
            </Display>
            <Body size={14} secondary style={{ marginTop: 6, marginBottom: 22 }}>
              Your name and how friends find you.
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

        {/* Bottom actions */}
        <View style={{ gap: 12, paddingTop: 12 }}>
          {step === 0 && primaryButton('Get started', () => setStep(1))}
          {step === 1 && primaryButton('Continue', finish)}
        </View>
      </View>
    </Wallpaper>
  );
}
