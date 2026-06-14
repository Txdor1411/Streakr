import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Glass } from '@/components/glass';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Body, Display } from '@/components/text';
import { useAuth } from '@/design/auth';
import { useStore } from '@/design/store';
import { useTheme, useThemePref } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

const PREF_LABEL: Record<string, 'light' | 'dark' | 'auto'> = { Light: 'light', Dark: 'dark', Auto: 'auto' };
const LABEL_FROM_PREF: Record<string, string> = { light: 'Light', dark: 'Dark', auto: 'Auto' };

function Toggle({ value, onChange, color = Palette.emerald }: { value: boolean; onChange: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onChange}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? color : 'rgba(120,120,130,0.3)',
        padding: 3,
        flexDirection: 'row',
        justifyContent: value ? 'flex-end' : 'flex-start',
      }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

function IconTile({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: tint(color, '29'),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Body size={15}>{emoji}</Body>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { pref, setPref } = useThemePref();
  const { profile } = useStore();
  const { configured, session, user, signOut } = useAuth();
  const [reminders, setReminders] = useState(true);

  const signedIn = Boolean(session);
  const accountSub = !configured
    ? 'Local-first · no account needed'
    : signedIn
      ? `Synced · ${user?.email ?? 'signed in'}`
      : 'Local-first · sign in to sync';

  return (
    <Screen>
      <Display size={26} weight="600">
        Settings
      </Display>

      {/* Profile */}
      <Pressable onPress={() => router.push('/profile')}>
        <Glass radius={22} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, marginTop: 16 }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: theme.scheme === 'dark' ? '#4a3f5a' : '#FFCFA0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Body size={26}>{profile.emoji}</Body>
          </View>
          <View style={{ flex: 1 }}>
            <Display size={17} weight="600">
              {profile.name}
            </Display>
            <Body size={12} secondary style={{ marginTop: 4 }}>
              {accountSub}
            </Body>
          </View>
          <View style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 11, backgroundColor: theme.fillStrong }}>
            <Body size={12.5} weight="600" secondary>
              Edit
            </Body>
          </View>
        </Glass>
      </Pressable>

      {/* Account / sync */}
      {configured && (
        <Pressable onPress={() => (signedIn ? signOut() : router.push('/auth'))}>
          <Glass radius={22} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, marginTop: 14 }}>
            <IconTile emoji={signedIn ? '☁️' : '🔑'} color={Palette.water} />
            <View style={{ flex: 1 }}>
              <Body size={14.5} weight="500">
                {signedIn ? 'Sign out' : 'Sign in to sync'}
              </Body>
              <Body size={12} secondary style={{ marginTop: 3 }}>
                {signedIn ? 'Your habits back up across devices' : 'Back up and sync across devices'}
              </Body>
            </View>
            <Body size={13.5} weight="500" color={signedIn ? Palette.coral : theme.accent}>
              {signedIn ? 'Sign out' : 'Sign in'} ›
            </Body>
          </Glass>
        </Pressable>
      )}

      {/* Theme + week start */}
      <Glass radius={22} style={{ marginTop: 14, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <IconTile emoji="🎨" color={Palette.meditate} />
            <Body size={14.5} weight="500">
              Theme
            </Body>
          </View>
          <Segmented
            options={['Light', 'Dark', 'Auto']}
            value={LABEL_FROM_PREF[pref]}
            onChange={(v) => setPref(PREF_LABEL[v])}
            paddingH={11}
          />
        </View>
        <View style={{ height: 1, backgroundColor: theme.hairline, marginHorizontal: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <IconTile emoji="📅" color={Palette.water} />
            <Body size={14.5} weight="500">
              Week starts on
            </Body>
          </View>
          <Body size={13.5} weight="500" secondary>
            Monday ›
          </Body>
        </View>
      </Glass>

      {/* Streak freeze */}
      <View style={{ marginTop: 14, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.glassBorder }}>
        <LinearGradient
          colors={[tint(Palette.freeze, theme.scheme === 'dark' ? '38' : '24'), theme.glassBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <Body size={18}>❄️</Body>
            <Display size={15} weight="600">
              Streak freeze
            </Display>
            <Body size={12} secondary style={{ marginLeft: 'auto' }}>
              2 of 3 left
            </Body>
          </View>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {[true, true, false].map((active, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? tint(Palette.freeze, '2e') : theme.fill,
                  borderWidth: active ? 1 : 0,
                  borderColor: tint(Palette.freeze, '4d'),
                  opacity: active ? 1 : 0.4,
                }}>
                <Body size={active ? 18 : 16}>❄️</Body>
              </View>
            ))}
          </View>
          <Body size={11.5} secondary style={{ marginTop: 11, lineHeight: 16 }}>
            Life happens. Spend a token to keep a streak alive on a missed day. Refills monthly.
          </Body>
        </LinearGradient>
      </View>

      {/* Reminders + export */}
      <Glass radius={22} style={{ marginTop: 14, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <IconTile emoji="🔔" color={Palette.read} />
            <Body size={14.5} weight="500">
              Daily reminders
            </Body>
          </View>
          <Toggle value={reminders} onChange={() => setReminders((r) => !r)} />
        </View>
        <View style={{ height: 1, backgroundColor: theme.hairline, marginHorizontal: 14 }} />
        <Pressable onPress={() => router.push('/import')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <IconTile emoji="⬇️" color={Palette.emerald} />
            <Body size={14.5} weight="500">
              Import / export · JSON
            </Body>
          </View>
          <Body size={13.5} weight="500" secondary>
            JSON ›
          </Body>
        </Pressable>
      </Glass>
    </Screen>
  );
}
