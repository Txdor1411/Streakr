import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useAuth } from '@/design/auth';
import { useStore } from '@/design/store';
import { uploadAvatar } from '@/design/sync';
import { useTheme } from '@/design/theme';

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐧', '🦉', '🐲', '🌟', '🚀', '🔥', '🌈', '🧠', '💪', '🌱', '⚡️'];

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { profile, setProfile } = useStore();
  const { user } = useAuth();

  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [username, setUsername] = useState(profile.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile.avatar_url);
  const [uploading, setUploading] = useState(false);

  const bg = dark ? '#16161e' : '#f8f7fa';
  const trimmed = name.trim();
  const handle = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;

    if (!user?.id) {
      setAvatarUrl(uri);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, uri);
      setAvatarUrl(url);
    } catch {
      setAvatarUrl(uri);
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    setProfile({
      name: trimmed || 'You',
      emoji,
      ...(handle ? { username: handle } : {}),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Display size={22} weight="600">Edit profile</Display>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Pressable onPress={pickPhoto} style={{ position: 'relative' }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              overflow: 'hidden',
              backgroundColor: dark ? '#4a3f5a' : '#FFCFA0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100 }} />
              ) : (
                <Body size={52}>{emoji}</Body>
              )}
            </View>

            {/* Camera badge */}
            <View style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: bg,
            }}>
              <Body size={14}>📷</Body>
            </View>

            {/* Upload overlay */}
            {uploading && (
              <View style={[StyleSheet.absoluteFill, { borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>

          <Display size={18} weight="600" style={{ marginTop: 14 }}>
            {trimmed || 'You'}
          </Display>
          <Body size={12} secondary style={{ marginTop: 4 }}>
            Tap to change photo
          </Body>
        </View>

        {/* Name */}
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

        {/* Username */}
        <Body size={12} weight="600" muted style={{ marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Username
        </Body>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, marginBottom: 6 }}>
          <Body size={16} weight="600" color={theme.textMuted}>@</Body>
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
        <Body size={11.5} muted style={{ marginBottom: 24 }}>
          How friends find you. Lowercase letters, numbers and underscores.
        </Body>

        {/* Emoji avatar picker — only shown when no photo */}
        {!avatarUrl && (
          <>
            <Body size={12} weight="600" muted style={{ marginBottom: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Avatar
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
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
          </>
        )}

        {/* Remove photo */}
        {avatarUrl && (
          <Pressable
            onPress={() => setAvatarUrl(undefined)}
            style={{ alignSelf: 'center', marginBottom: 24 }}>
            <Body size={13} color={theme.textMuted}>Remove photo</Body>
          </Pressable>
        )}

        {/* Save */}
        <Pressable
          onPress={save}
          style={{ height: 54, borderRadius: 18, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}>
          <Display size={16} weight="600" color="#fff">
            Save profile
          </Display>
        </Pressable>
      </ScrollView>
    </View>
  );
}
