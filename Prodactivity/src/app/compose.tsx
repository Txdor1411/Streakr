import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraIcon, CheckIcon, CloseIcon, ImageIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useSocial } from '@/design/social';
import { computeStreak, todayKey, useStore } from '@/design/store';
import { useTheme } from '@/design/theme';
import { tint } from '@/design/tokens';

export default function ComposeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { addPost, preparePhoto } = useSocial();
  const { habits, logFor, setAmount, frozenDates } = useStore();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [markDone, setMarkDone] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const sheetBg = dark ? '#16161e' : 'rgba(248,247,250,0.98)';
  const selected = habits.find((h) => h.id === selectedId) ?? null;

  const pickCamera = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setError('Camera access is needed to capture proof.');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.7 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const pickGallery = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Photo library access is needed to pick a photo.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.7 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const onShare = async () => {
    if (!photoUri || sharing) return;
    setSharing(true);
    const persisted = await preparePhoto(photoUri);
    const text = caption.trim() || undefined;

    if (selected) {
      const baseLog = logFor(selected.id);
      const log = markDone ? { ...baseLog, [todayKey()]: selected.goal } : baseLog;
      const streak = computeStreak(selected, log, frozenDates);
      addPost({ kind: 'habit', habitName: selected.name, habitEmoji: selected.emoji, accent: selected.accent, streak, photoUri: persisted, caption: text });
      if (markDone) setAmount(selected.id, selected.goal);
    } else {
      addPost({ kind: 'free', photoUri: persisted, caption: text });
    }
    router.back();
  };

  const label = (t: string) => (
    <Body size={12} weight="600" muted style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {t}
    </Body>
  );

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: insets.bottom + 26 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: theme.fillStrong, alignSelf: 'center', marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Display size={22} weight="600">
            Post proof
          </Display>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Photo */}
        {label('Photo')}
        {photoUri ? (
          <View style={{ marginBottom: 8 }}>
            <View style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 18, overflow: 'hidden' }}>
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Pressable onPress={pickCamera} style={{ flex: 1, flexDirection: 'row', gap: 7, height: 44, borderRadius: 14, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center' }}>
                <CameraIcon color={theme.textSecondary} size={18} />
                <Body size={13.5} weight="600" color={theme.textSecondary}>
                  Retake
                </Body>
              </Pressable>
              <Pressable onPress={pickGallery} style={{ flex: 1, flexDirection: 'row', gap: 7, height: 44, borderRadius: 14, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon color={theme.textSecondary} size={18} />
                <Body size={13.5} weight="600" color={theme.textSecondary}>
                  Change
                </Body>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 11, marginBottom: 8 }}>
            <Pressable onPress={pickCamera} style={{ flex: 1, aspectRatio: 1.4, borderRadius: 18, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <CameraIcon color={theme.accent} size={28} />
              <Body size={13.5} weight="600">
                Camera
              </Body>
            </Pressable>
            <Pressable onPress={pickGallery} style={{ flex: 1, aspectRatio: 1.4, borderRadius: 18, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <ImageIcon color={theme.accent} size={28} />
              <Body size={13.5} weight="600">
                Gallery
              </Body>
            </Pressable>
          </View>
        )}
        {error && (
          <Body size={12} color={theme.accent} style={{ marginBottom: 8 }}>
            {error}
          </Body>
        )}

        {/* Habit (optional) */}
        <View style={{ marginTop: 14 }}>{label('Proof of (optional)')}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {habits.map((h) => {
            const on = h.id === selectedId;
            return (
              <Pressable
                key={h.id}
                onPress={() => setSelectedId(on ? null : h.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: on ? tint(h.accent, dark ? '2e' : '20') : theme.fill, borderWidth: on ? 2 : 0, borderColor: h.accent }}>
                <Body size={15}>{h.emoji}</Body>
                <Body size={13} weight="600" color={on ? (dark ? '#fff' : h.accent) : theme.text}>
                  {h.name}
                </Body>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Mark done toggle */}
        {selected && (
          <Pressable
            onPress={() => setMarkDone((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: theme.fill }}>
            <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: markDone ? theme.accent : 'transparent', borderWidth: markDone ? 0 : 2, borderColor: theme.textMuted, alignItems: 'center', justifyContent: 'center' }}>
              {markDone && <CheckIcon size={15} width={3} />}
            </View>
            <Body size={13.5} weight="600" style={{ flex: 1 }}>
              Mark “{selected.name}” done today
            </Body>
          </Pressable>
        )}

        {/* Caption */}
        <View style={{ marginTop: 18 }}>{label('Caption')}</View>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Say something…"
          placeholderTextColor={theme.textMuted}
          maxLength={140}
          multiline
          style={{ backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, minHeight: 70, fontFamily: 'Batica', fontSize: 15, fontWeight: '500', color: theme.textStrong, textAlignVertical: 'top', marginBottom: 22 }}
        />

        {/* Share */}
        <Pressable
          onPress={onShare}
          disabled={!photoUri || sharing}
          style={{ height: 54, borderRadius: 18, backgroundColor: photoUri ? theme.accent : theme.fillStrong, alignItems: 'center', justifyContent: 'center', opacity: sharing ? 0.7 : 1, shadowColor: theme.accent, shadowOpacity: photoUri ? 0.5 : 0, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
          <Display size={16} weight="600" color={photoUri ? '#fff' : theme.textMuted}>
            {sharing ? 'Sharing…' : 'Share proof'}
          </Display>
        </Pressable>
      </ScrollView>
    </View>
  );
}
