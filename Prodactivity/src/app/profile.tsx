import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useStore } from '@/design/store';
import { useTheme } from '@/design/theme';

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐧', '🦉', '🐲', '🌟', '🚀', '🔥', '🌈', '🧠', '💪', '🌱', '⚡️'];

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { profile, setProfile } = useStore();

  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [username, setUsername] = useState(profile.username ?? '');

  const sheetBg = dark ? '#16161e' : 'rgba(248,247,250,0.98)';
  const trimmed = name.trim();
  // Usernames are lowercase letters, numbers and underscores (used for @search).
  const handle = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const save = () => {
    setProfile({ name: trimmed || 'You', emoji, ...(handle ? { username: handle } : null) });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: insets.bottom + 26 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: theme.fillStrong, alignSelf: 'center', marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Display size={22} weight="600">
            Edit profile
          </Display>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Live preview */}
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: dark ? '#4a3f5a' : '#FFCFA0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Body size={44}>{emoji}</Body>
          </View>
          <Display size={18} weight="600" style={{ marginTop: 12 }}>
            {trimmed || 'You'}
          </Display>
        </View>

        <Body size={12} weight="600" muted style={{ marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Name
        </Body>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.textMuted}
          maxLength={24}
          style={{ backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Batica', fontSize: 16, fontWeight: '600', color: theme.textStrong, marginBottom: 20 }}
        />

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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {AVATARS.map((a) => {
            const on = a === emoji;
            return (
              <Pressable
                key={a}
                onPress={() => setEmoji(a)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? theme.accent + '26' : theme.fill,
                  borderWidth: on ? 2 : 0,
                  borderColor: theme.accent,
                }}>
                <Body size={26}>{a}</Body>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={save}
          style={{ height: 54, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accent, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
          <Display size={16} weight="600" color="#fff">
            Save profile
          </Display>
        </Pressable>
      </ScrollView>
    </View>
  );
}
