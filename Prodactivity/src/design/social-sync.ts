/**
 * Supabase sync helpers for the social layer.
 *
 * Thin, resource-shaped functions over the `friendships`, `posts`, `reactions`,
 * and `nudges` tables plus the `post-photos` storage bucket. The SocialProvider
 * calls them optimistically — local state updates first, then these push to the
 * backend best-effort — mirroring the habit store / `sync.ts` pattern.
 *
 * Every function is a no-op (returns empty/null) when Supabase isn't configured,
 * so the app keeps running fully local-first on demo data.
 */
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import type { FriendRequest, Nudge, Post, Reactions, SocialUser } from './social';
import { uuidv4 } from './sync';
import { Palette } from './tokens';

// --------------------------------------------------------------------- types

type DbProfile = { id: string; name: string; emoji: string; username: string | null };
type DbFriendship = { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted' };
type DbPost = {
  id: string;
  author_id: string;
  kind: 'habit' | 'free';
  habit_name: string | null;
  habit_emoji: string | null;
  accent: string | null;
  streak: number | null;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
};
type DbReaction = { post_id: string; user_id: string; emoji: string };
type DbNudge = { id: string; from_id: string; to_id: string; habit_name: string | null; seen: boolean; created_at: string };

export type SocialSnapshot = {
  friends: SocialUser[];
  /** Pending requests sent to me — I can accept/decline. */
  incoming: FriendRequest[];
  /** Pending requests I sent — awaiting the other side. */
  outgoing: FriendRequest[];
  posts: Post[];
  reactions: Reactions;
  nudges: Nudge[];
};

// ------------------------------------------------------------------- mappers

/** Real users have no stored accent — derive a stable one from their id. */
const ACCENTS = [Palette.run, Palette.read, Palette.water, Palette.meditate, Palette.greens, Palette.pink, Palette.coral, Palette.emerald];
export function accentFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function profileToUser(p: DbProfile): SocialUser {
  return { id: p.id, name: p.name, emoji: p.emoji, accent: accentFor(p.id) };
}

function rowToPost(r: DbPost): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    kind: r.kind,
    habitName: r.habit_name ?? undefined,
    habitEmoji: r.habit_emoji ?? undefined,
    accent: r.accent ?? undefined,
    streak: r.streak ?? undefined,
    photoUri: r.photo_url,
    caption: r.caption ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function rowToNudge(r: DbNudge): Nudge {
  return {
    id: r.id,
    fromId: r.from_id,
    toId: r.to_id,
    habitName: r.habit_name ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    seen: r.seen,
  };
}

// --------------------------------------------------------------------- reads

const EMPTY: SocialSnapshot = { friends: [], incoming: [], outgoing: [], posts: [], reactions: {}, nudges: [] };

/** Pull the full social state visible to this user (RLS scopes it server-side). */
export async function pullSocial(userId: string): Promise<SocialSnapshot> {
  if (!supabase) return EMPTY;

  const [friRes, postsRes, reactRes, nudgeRes] = await Promise.all([
    supabase.from('friendships').select('id, requester_id, addressee_id, status'),
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('reactions').select('post_id, user_id, emoji'),
    supabase.from('nudges').select('*').order('created_at', { ascending: false }),
  ]);

  if (friRes.error) throw friRes.error;
  if (postsRes.error) throw postsRes.error;
  if (reactRes.error) throw reactRes.error;
  if (nudgeRes.error) throw nudgeRes.error;

  const friendships = (friRes.data as DbFriendship[]) ?? [];

  // Resolve the "other party" of every friendship to a display user.
  const otherIds = new Set<string>();
  for (const f of friendships) otherIds.add(f.requester_id === userId ? f.addressee_id : f.requester_id);

  const usersById = new Map<string, SocialUser>();
  if (otherIds.size) {
    const profRes = await supabase.from('profiles').select('id, name, emoji, username').in('id', [...otherIds]);
    if (profRes.error) throw profRes.error;
    for (const p of profRes.data as DbProfile[]) usersById.set(p.id, profileToUser(p));
  }
  const userOf = (id: string): SocialUser => usersById.get(id) ?? { id, name: 'Someone', emoji: '👤', accent: accentFor(id) };

  const friends: SocialUser[] = [];
  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];
  for (const f of friendships) {
    const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    if (f.status === 'accepted') friends.push(userOf(otherId));
    else if (f.addressee_id === userId) incoming.push({ id: f.id, user: userOf(otherId) });
    else outgoing.push({ id: f.id, user: userOf(otherId) });
  }

  const posts = (postsRes.data as DbPost[]).map(rowToPost);

  const reactions: Reactions = {};
  for (const r of (reactRes.data as DbReaction[]) ?? []) {
    const forPost = (reactions[r.post_id] ??= {});
    (forPost[r.emoji] ??= []).push(r.user_id);
  }

  const nudges = ((nudgeRes.data as DbNudge[]) ?? []).map(rowToNudge);

  return { friends, incoming, outgoing, posts, reactions, nudges };
}

/** Search other users by @username (partial, case-insensitive). */
export async function searchUsers(userId: string, query: string): Promise<SocialUser[]> {
  if (!supabase) return [];
  const q = query.trim().replace(/^@/, '');
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, emoji, username')
    .ilike('username', `%${q}%`)
    .neq('id', userId)
    .limit(20);
  if (error) throw error;
  return (data as DbProfile[]).map(profileToUser);
}

// -------------------------------------------------------------------- writes

/** Insert a post (client-generated id keeps local + remote in sync). */
export async function pushPost(userId: string, post: Post): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    author_id: userId,
    kind: post.kind,
    habit_name: post.habitName ?? null,
    habit_emoji: post.habitEmoji ?? null,
    accent: post.accent ?? null,
    streak: post.streak ?? null,
    photo_url: post.photoUri,
    caption: post.caption ?? null,
    created_at: new Date(post.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

/** Add (`on`) or remove a reaction by the current user. Enforces one reaction per post. */
export async function setReaction(userId: string, postId: string, emoji: string, on: boolean): Promise<void> {
  if (!supabase) return;
  if (on) {
    // Insert first (safe path) — if same emoji already exists the conflict is ignored.
    // Then remove any other emoji from this user on this post. Failure here is non-critical
    // (brief duplicate) vs the old delete-first approach which could lose the reaction entirely.
    const { error } = await supabase
      .from('reactions')
      .upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: 'post_id,user_id,emoji', ignoreDuplicates: true });
    if (error) throw error;
    await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).neq('emoji', emoji);
  } else {
    const { error } = await supabase.from('reactions').delete().match({ post_id: postId, user_id: userId, emoji });
    if (error) throw error;
  }
}

/** Send a friend request; returns the new friendship row id for optimistic state. */
export async function sendRequest(userId: string, addresseeId: string): Promise<string> {
  if (!supabase) return uuidv4();
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: addresseeId, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function acceptRequest(friendshipId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  if (error) throw error;
}

/** Remove any friendship/request between the two users (decline / cancel / unfriend). */
export async function deleteFriendship(userId: string, otherId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`);
  if (error) throw error;
}

export async function sendNudge(userId: string, toId: string, habitName?: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('nudges').insert({ from_id: userId, to_id: toId, habit_name: habitName ?? null });
  if (error) throw error;
}

export async function markNudgesSeen(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('nudges').update({ seen: true }).eq('to_id', userId).eq('seen', false);
  if (error) throw error;
}

// -------------------------------------------------------------------- photos

/**
 * Upload a local image to the `post-photos` bucket under `{userId}/…` and return
 * its public URL. Returns null on failure so the caller can fall back to the
 * local file URI (and stays a no-op when Supabase isn't configured).
 */
export async function uploadPhoto(userId: string, localUri: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const ext = (localUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${uuidv4()}.${ext}`;
    const bytes = await new File(localUri).bytes();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const { error } = await supabase.storage.from('post-photos').upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;
    return supabase.storage.from('post-photos').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    if (__DEV__) console.warn('[social-sync] upload failed', (e as Error)?.message ?? e);
    return null;
  }
}
