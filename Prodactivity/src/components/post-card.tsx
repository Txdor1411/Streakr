import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Glass } from '@/components/glass';
import { Body, Display } from '@/components/text';
import { REACTION_EMOJIS, timeAgo, useSocial, type Post, type SocialUser } from '@/design/social';
import { useTheme } from '@/design/theme';
import { tint } from '@/design/tokens';

type PostCardProps = {
  post: Post;
  author: SocialUser;
  /** Shown only for friends' posts (not your own). */
  onNudge?: () => void;
};

export function PostCard({ post, author, onNudge }: PostCardProps) {
  const theme = useTheme();
  const dark = theme.scheme === 'dark';
  const { reactions, toggleReaction, meId } = useSocial();
  const accent = post.accent ?? author.accent;
  const postReactions = reactions[post.id] ?? {};

  return (
    <Glass radius={24} style={{ padding: 13, gap: 11 }}>
      {/* Author */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: tint(author.accent, dark ? '33' : '24'), alignItems: 'center', justifyContent: 'center' }}>
          {author.avatar_url ? (
            <Image source={{ uri: author.avatar_url }} style={{ width: 40, height: 40 }} contentFit="cover" />
          ) : (
            <Body size={20}>{author.emoji}</Body>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Display size={14.5} weight="600">
            {author.name}
          </Display>
          <Body size={11.5} muted style={{ marginTop: 1 }}>
            {timeAgo(post.createdAt)} ago
          </Body>
        </View>
        {post.kind === 'habit' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: tint(accent, dark ? '2b' : '1f') }}>
            <Body size={13}>{post.habitEmoji}</Body>
            <Body size={12} weight="700" color={dark ? '#fff' : accent}>
              {post.habitName}
            </Body>
            {post.streak ? (
              <Body size={11.5} weight="700" color={dark ? '#fff' : accent}>
                · 🔥{post.streak}
              </Body>
            ) : null}
          </View>
        )}
      </View>

      {/* Proof photo (or placeholder for seeded/demo posts) */}
      <View style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 18, overflow: 'hidden' }}>
        {post.photoUri ? (
          <Image source={{ uri: post.photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient colors={[accent, tint(accent, '88')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Body size={58}>{post.habitEmoji ?? '✨'}</Body>
            <Body size={11} weight="700" color="#ffffffcc" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              Proof
            </Body>
          </LinearGradient>
        )}
      </View>

      {/* Caption */}
      {post.caption ? (
        <Body size={13.5} style={{ lineHeight: 19 }}>
          {post.caption}
        </Body>
      ) : null}

      {/* Reactions + nudge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {REACTION_EMOJIS.map((emoji) => {
          const reactors = postReactions[emoji] ?? [];
          const mine = reactors.includes(meId);
          const count = reactors.length;
          return (
            <Pressable
              key={emoji}
              onPress={() => toggleReaction(post.id, emoji)}
              hitSlop={4}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 9,
                paddingVertical: 6,
                borderRadius: 13,
                backgroundColor: mine ? tint(theme.accent, dark ? '33' : '22') : theme.fill,
                borderWidth: 1,
                borderColor: mine ? theme.accent : 'transparent',
              }}>
              <Body size={13}>{emoji}</Body>
              {count > 0 && (
                <Body size={11.5} weight="700" color={mine ? theme.accent : theme.textSecondary}>
                  {count}
                </Body>
              )}
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        {onNudge && (
          <Pressable onPress={onNudge} hitSlop={6} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13, backgroundColor: theme.fillStrong }}>
            <Body size={12} weight="700" color={theme.textSecondary}>
              👈 Nudge
            </Body>
          </Pressable>
        )}
      </View>
    </Glass>
  );
}
