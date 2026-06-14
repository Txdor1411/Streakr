import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { Body, Display } from '@/components/text';
import { useSocial, type SocialUser } from '@/design/social';
import { useTheme } from '@/design/theme';
import { tint } from '@/design/tokens';

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = theme.scheme === 'dark';
  const { live, friends, pool, incoming, outgoing, searchUsers, requestFriend, acceptRequest, removeRequest, removeFriend, nudge } = useSocial();
  const [toast, setToast] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialUser[]>([]);
  const [searching, setSearching] = useState(false);

  const sheetBg = dark ? '#16161e' : 'rgba(248,247,250,0.98)';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2000);
  };

  // Debounced @username search (live mode only).
  useEffect(() => {
    if (!live) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const found = await searchUsers(q);
        if (alive) setResults(found);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, live, searchUsers]);

  const onNudge = (f: SocialUser) => {
    nudge(f.id);
    showToast(`Nudged ${f.name} 👈`);
  };

  const onRequest = (u: SocialUser) => {
    requestFriend(u);
    setQuery('');
    setResults([]);
    showToast(live ? `Request sent to ${u.name}` : `Added ${u.name}`);
  };

  const avatar = (u: SocialUser) => (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tint(u.accent, dark ? '33' : '24'), alignItems: 'center', justifyContent: 'center' }}>
      <Body size={22}>{u.emoji}</Body>
    </View>
  );

  const label = (t: string) => (
    <Body size={12} weight="600" muted style={{ marginBottom: 11, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {t}
    </Body>
  );

  const row = (u: SocialUser, right: ReactNode) => (
    <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 16, backgroundColor: theme.fill }}>
      {avatar(u)}
      <Display size={15} weight="600" style={{ flex: 1 }}>
        {u.name}
      </Display>
      {right}
    </View>
  );

  const addButton = (u: SocialUser) => (
    <Pressable
      onPress={() => onRequest(u)}
      hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 13, backgroundColor: theme.accent }}>
      <PlusIcon size={15} width={2.6} />
      <Body size={13} weight="700" color="#fff">
        Add
      </Body>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: sheetBg, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: insets.bottom + 26 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: theme.fillStrong, alignSelf: 'center', marginBottom: 16 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Display size={22} weight="600">
            Friends
          </Display>
          <Pressable onPress={() => router.back()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.fillStrong, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Incoming requests (live) */}
        {live && incoming.length > 0 && (
          <>
            {label(`Requests · ${incoming.length}`)}
            <View style={{ gap: 9 }}>
              {incoming.map((req) =>
                row(
                  req.user,
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        acceptRequest(req);
                        showToast(`You and ${req.user.name} are now friends`);
                      }}
                      hitSlop={6}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, backgroundColor: theme.accent }}>
                      <CheckIcon size={14} width={2.8} />
                      <Body size={12.5} weight="700" color="#fff">
                        Accept
                      </Body>
                    </Pressable>
                    <Pressable onPress={() => removeRequest(req)} hitSlop={6} style={{ paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12 }}>
                      <Body size={12.5} weight="700" color={theme.textMuted}>
                        Decline
                      </Body>
                    </Pressable>
                  </View>,
                ),
              )}
            </View>
          </>
        )}

        {/* Current friends */}
        {label(`Your friends · ${friends.length}`)}
        {friends.length === 0 ? (
          <Body size={13} secondary style={{ marginBottom: 12 }}>
            No friends yet — {live ? 'search for someone below' : 'add a few below'} to start sharing proof.
          </Body>
        ) : (
          <View style={{ gap: 9 }}>
            {friends.map((f) =>
              row(
                f,
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable onPress={() => onNudge(f)} hitSlop={6} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.fillStrong }}>
                    <Body size={12.5} weight="700" color={theme.textSecondary}>
                      👈 Nudge
                    </Body>
                  </Pressable>
                  <Pressable onPress={() => removeFriend(f.id)} hitSlop={6} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12 }}>
                    <Body size={12.5} weight="700" color={theme.textMuted}>
                      Remove
                    </Body>
                  </Pressable>
                </View>,
              ),
            )}
          </View>
        )}

        {/* Outgoing pending (live) */}
        {live && outgoing.length > 0 && (
          <>
            {label('Pending')}
            <View style={{ gap: 9 }}>
              {outgoing.map((req) =>
                row(
                  req.user,
                  <Pressable onPress={() => removeRequest(req)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Body size={12.5} weight="600" color={theme.textMuted}>
                      Requested
                    </Body>
                    <Body size={12.5} weight="700" color={theme.textSecondary}>
                      · Cancel
                    </Body>
                  </Pressable>,
                ),
              )}
            </View>
          </>
        )}

        {/* Discovery: search (live) or the demo suggested pool */}
        {live ? (
          <>
            {label('Add by username')}
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search @username"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ backgroundColor: theme.fill, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Batica', fontSize: 15, fontWeight: '500', color: theme.textStrong, marginBottom: 12 }}
            />
            {query.trim().length > 0 && (
              <View style={{ gap: 9 }}>
                {searching ? (
                  <Body size={13} secondary>
                    Searching…
                  </Body>
                ) : results.length === 0 ? (
                  <Body size={13} secondary>
                    No one found for “{query.trim()}”.
                  </Body>
                ) : (
                  results.map((u) => row(u, addButton(u)))
                )}
              </View>
            )}
          </>
        ) : (
          pool.length > 0 && (
            <>
              {label('Suggested')}
              <View style={{ gap: 9 }}>{pool.map((p) => row(p, addButton(p)))}</View>
            </>
          )
        )}
      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 24, alignItems: 'center' }} pointerEvents="none">
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: dark ? '#2a2a36' : '#22222a' }}>
            <Body size={13} weight="600" color="#fff">
              {toast}
            </Body>
          </View>
        </View>
      )}
    </View>
  );
}
