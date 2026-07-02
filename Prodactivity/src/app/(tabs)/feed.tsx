import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/floating-tab-bar';
import { Glass } from '@/components/glass';
import { CameraIcon, CloseIcon, UsersIcon } from '@/components/icons';
import { PostCard } from '@/components/post-card';
import { Screen } from '@/components/screen';
import { Body, Display } from '@/components/text';
import { useSocial, type SocialUser } from '@/design/social';
import { useStore } from '@/design/store';
import { useTheme } from '@/design/theme';
import { Palette, tint } from '@/design/tokens';

export default function FeedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useStore();
  const { feedPosts, friends, unseenNudges, userById, nudge, markNudgesSeen, meId } = useSocial();
  const [toast, setToast] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const me: SocialUser = { id: meId, name: profile.name, emoji: profile.emoji, accent: theme.accent, avatar_url: profile.avatar_url };
  const authorFor = (id: string): SocialUser => (id === meId ? me : userById(id) ?? { id, name: 'Someone', emoji: '👤', accent: theme.accent });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const onNudge = (friend: SocialUser, habitName?: string) => {
    nudge(friend.id, habitName);
    showToast(`Nudged ${friend.name} 👈`);
  };

  const nudgeCount = unseenNudges.length;
  const incoming = unseenNudges[0];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Display size={26} weight="600">
              Feed
            </Display>
            <Body size={13} secondary style={{ marginTop: 6 }}>
              {friends.length === 0 ? 'Add friends to get started' : `${friends.length} friend${friends.length === 1 ? '' : 's'} holding you accountable`}
            </Body>
          </View>
          <Pressable
            onPress={() => router.push('/friends')}
            style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder, alignItems: 'center', justifyContent: 'center' }}>
            <UsersIcon color={theme.accent} />
          </Pressable>
        </View>

        {/* Incoming nudge banner */}
        {incoming && (
          <Pressable
            onPress={() => {
              markNudgesSeen();
              router.push('/compose');
            }}
            style={{ marginTop: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 18, backgroundColor: tint(Palette.coral, theme.scheme === 'dark' ? '2b' : '1c'), borderWidth: 1, borderColor: tint(Palette.coral, '55') }}>
              <Body size={20}>🔔</Body>
              <View style={{ flex: 1 }}>
                <Display size={14} weight="600">
                  {nudgeCount > 1 ? `${nudgeCount} friends nudged you` : `${userById(incoming.fromId)?.name ?? 'A friend'} nudged you`}
                </Display>
                <Body size={12} secondary style={{ marginTop: 2 }}>
                  {incoming.habitName ? `Post proof of “${incoming.habitName}”` : 'Post your proof for today'}
                </Body>
              </View>
              <Pressable onPress={markNudgesSeen} hitSlop={8} style={{ padding: 4 }}>
                <CloseIcon color={theme.textSecondary} />
              </Pressable>
            </View>
          </Pressable>
        )}

        {/* Feed */}
        {feedPosts.length === 0 ? (
          <Glass radius={20} style={{ padding: 24, alignItems: 'center', gap: 7, marginTop: 16 }}>
            <Body size={28}>📸</Body>
            <Display size={15} weight="600">
              Nothing here yet
            </Display>
            <Body size={12.5} secondary style={{ textAlign: 'center' }}>
              {friends.length === 0 ? 'Add a few friends, then post proof to keep each other on track.' : 'Be the first — tap the camera to post proof of a habit.'}
            </Body>
          </Glass>
        ) : (() => {
          const LIMIT = 10;
          const hasMore = feedPosts.length > LIMIT;
          const visible = showAll ? feedPosts : feedPosts.slice(0, LIMIT);
          const hidden = feedPosts.length - LIMIT;
          return (
            <View style={{ gap: 13, marginTop: 16 }}>
              {visible.map((post) => {
                const author = authorFor(post.authorId);
                return <PostCard key={post.id} post={post} author={author} onNudge={post.authorId === meId ? undefined : () => onNudge(author, post.habitName)} />;
              })}
              {hasMore && !showAll && (
                <Pressable
                  onPress={() => setShowAll(true)}
                  style={{ paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: theme.fill }}>
                  <Body size={13.5} weight="600" color={theme.accent}>
                    Show {hidden} older post{hidden === 1 ? '' : 's'}
                  </Body>
                </Pressable>
              )}
            </View>
          );
        })()}
      </Screen>

      {/* Toast */}
      {toast && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 22, alignItems: 'center' }} pointerEvents="none">
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.scheme === 'dark' ? '#2a2a36' : '#22222a' }}>
            <Body size={13} weight="600" color="#fff">
              {toast}
            </Body>
          </View>
        </View>
      )}

      {/* Floating compose button */}
      <Pressable
        onPress={() => router.push('/compose')}
        style={{
          position: 'absolute',
          right: 22,
          bottom: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 8,
          width: 54,
          height: 54,
          borderRadius: 19,
          backgroundColor: Palette.coral,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: Palette.coral,
          shadowOpacity: 0.5,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
        }}>
        <CameraIcon color="#fff" size={24} />
      </Pressable>
    </View>
  );
}
