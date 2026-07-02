/**
 * Social accountability layer — friends + a photo "proof" feed.
 *
 * Friends are request→accept relationships; posts/reactions/nudges sync to
 * Supabase. Mutations are optimistic: local state updates first, then a
 * best-effort remote push (see `fireRemote`). A local AsyncStorage cache keeps
 * the last-seen snapshot around for resilience against a flaky connection —
 * it's cleared (not repopulated with fake data) on sign-out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './auth';
import {
  acceptRequest as acceptRequestRemote,
  deleteFriendship,
  markNudgesSeen as markNudgesSeenRemote,
  pullSocial,
  pushPost,
  searchUsers as searchUsersRemote,
  sendNudge,
  sendRequest,
  setReaction as setReactionRemote,
  uploadPhoto,
} from './social-sync';
import { uuidv4 } from './sync';

export type SocialUser = { id: string; name: string; emoji: string; accent: string; avatar_url?: string };

/** A pending friendship, identified by its row id, plus the other party. */
export type FriendRequest = { id: string; user: SocialUser };

export type Post = {
  id: string;
  authorId: string;
  kind: 'habit' | 'free';
  /** Habit metadata is denormalized onto the post — posts aren't tied to a live habit id. */
  habitName?: string;
  habitEmoji?: string;
  accent?: string;
  streak?: number;
  /** Public URL in Supabase Storage, or a local file URI if the upload hasn't landed yet. */
  photoUri: string | null;
  caption?: string;
  createdAt: number;
};

/** postId → emoji → reactor ids. */
export type Reactions = Record<string, Record<string, string[]>>;

export type Nudge = { id: string; fromId: string; toId: string; habitName?: string; createdAt: number; seen: boolean };

export const REACTION_EMOJIS = ['👏', '🔥', '💪', '🎉'] as const;

type Persisted = {
  friends: SocialUser[];
  posts: Post[];
  reactions: Reactions;
  nudges: Nudge[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};
/** On-disk shape: the cache plus which account it belongs to (null = demo). */
type Cached = Persisted & { ownerId?: string | null };

const STORAGE_KEY = 'streakr:social:v1';

// --------------------------------------------------------------------- utils

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Copy a picked image out of the cache into a persistent app directory. */
function persistLocalPhoto(srcUri: string): string {
  try {
    const dir = new Directory(Paths.document, 'posts');
    if (!dir.exists) dir.create({ intermediates: true });
    const ext = (srcUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const dest = new File(dir, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
    new File(srcUri).copy(dest);
    return dest.uri;
  } catch {
    return srcUri; // fall back to the cache uri
  }
}

/** Compact "2h" / "3d" / "now" relative label. */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

// ------------------------------------------------------------------- context

export type NewPost = Pick<Post, 'kind' | 'habitName' | 'habitEmoji' | 'accent' | 'streak' | 'photoUri' | 'caption'>;

type SocialValue = {
  ready: boolean;
  /** True once signed in with a configured backend — false only during the brief sign-out transition. */
  live: boolean;
  /** The current user's auth uuid. */
  meId: string;
  friends: SocialUser[];
  posts: Post[];
  reactions: Reactions;
  nudges: Nudge[];
  /** Pending requests received / sent. */
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  /** Posts from added friends + me, newest first. */
  feedPosts: Post[];
  unseenNudges: Nudge[];
  userById: (id: string) => SocialUser | undefined;
  /** Persist a picked photo: uploads to storage, falling back to an on-device copy if that fails. */
  preparePhoto: (localUri: string) => Promise<string>;
  addPost: (post: NewPost) => void;
  toggleReaction: (postId: string, emoji: string) => void;
  /** Find users by @username; excludes existing friends/requests. */
  searchUsers: (query: string) => Promise<SocialUser[]>;
  requestFriend: (user: SocialUser) => void;
  acceptRequest: (req: FriendRequest) => void;
  /** Decline an incoming request or cancel an outgoing one. */
  removeRequest: (req: FriendRequest) => void;
  removeFriend: (id: string) => void;
  nudge: (toId: string, habitName?: string) => void;
  markNudgesSeen: () => void;
};

const SocialContext = createContext<SocialValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const live = isSupabaseConfigured && Boolean(userId);
  const meId = userId ?? '';

  const [ready, setReady] = useState(false);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reactions>({});
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Latest values for use inside effects/callbacks without re-subscribing.
  const userIdRef = useRef(userId);
  const friendsRef = useRef(friends);
  const incomingRef = useRef(incoming);
  const outgoingRef = useRef(outgoing);
  const ownerRef = useRef(ownerId);
  userIdRef.current = userId;
  friendsRef.current = friends;
  incomingRef.current = incoming;
  outgoingRef.current = outgoing;
  ownerRef.current = ownerId;

  /** Best-effort remote write; failures keep local state and just warn in dev. */
  const fireRemote = useCallback((run: () => Promise<void>) => {
    if (!userIdRef.current || !isSupabaseConfigured) return;
    run().catch((e) => {
      if (__DEV__) console.warn('[social-sync]', e?.message ?? e);
    });
  }, []);

  // Hydrate the local cache once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && alive) {
          const data = JSON.parse(raw) as Partial<Cached>;
          if (data.friends) setFriends(data.friends);
          if (data.posts) setPosts(data.posts);
          if (data.reactions) setReactions(data.reactions);
          if (data.nudges) setNudges(data.nudges);
          if (data.incoming) setIncoming(data.incoming);
          if (data.outgoing) setOutgoing(data.outgoing);
          if (data.ownerId !== undefined) setOwnerId(data.ownerId);
        }
      } catch {
        // Corrupt/empty storage → fall back to seeds.
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist after hydration on any change.
  const first = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const payload: Cached = { friends, posts, reactions, nudges, incoming, outgoing, ownerId };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [ready, friends, posts, reactions, nudges, incoming, outgoing, ownerId]);

  // Reconcile with the backend on sign-in; clear the cache on sign-out.
  useEffect(() => {
    if (!ready) return;

    if (!live) {
      // If the cache belonged to a real account, clear it so a signed-out
      // device never shows another user's data.
      if (ownerRef.current) {
        setFriends([]);
        setPosts([]);
        setReactions({});
        setNudges([]);
        setIncoming([]);
        setOutgoing([]);
        setOwnerId(null);
      }
      return;
    }

    let alive = true;
    (async () => {
      try {
        const snap = await pullSocial(userId!);
        if (!alive) return;
        setFriends(snap.friends);
        setPosts(snap.posts);
        setReactions(snap.reactions);
        setNudges(snap.nudges);
        setIncoming(snap.incoming);
        setOutgoing(snap.outgoing);
        setOwnerId(userId!);
      } catch (e) {
        // Offline / transient — keep the cache and retry on the next sign-in.
        if (__DEV__) console.warn('[social-sync] pull failed', (e as Error)?.message ?? e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ready, live, userId]);

  // Cache every user we've seen so posts from removed friends still show author info.
  const userCacheRef = useRef<Record<string, SocialUser>>({});
  friends.forEach((f) => { userCacheRef.current[f.id] = f; });

  const userById = useCallback((id: string) => friends.find((u) => u.id === id) ?? userCacheRef.current[id], [friends]);

  const feedPosts = useMemo(() => {
    const visible = new Set([meId, ...friends.map((f) => f.id)]);
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return posts
      .filter((p) => visible.has(p.authorId) && p.createdAt >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, friends, meId]);

  const unseenNudges = useMemo(() => nudges.filter((n) => !n.seen), [nudges]);

  const preparePhoto = useCallback(async (localUri: string): Promise<string> => {
    if (userIdRef.current) {
      const url = await uploadPhoto(userIdRef.current, localUri);
      if (url) return url;
    }
    return persistLocalPhoto(localUri);
  }, []);

  const addPost = useCallback((post: NewPost) => {
    const full: Post = { ...post, id: uuidv4(), authorId: userIdRef.current!, createdAt: Date.now() };
    setPosts((prev) => [full, ...prev]);
    fireRemote(() => pushPost(userIdRef.current!, full));
  }, [fireRemote]);

  const toggleReaction = useCallback((postId: string, emoji: string) => {
    const me = userIdRef.current!;
    let willBeOn = false;
    setReactions((prev) => {
      const forPost = { ...(prev[postId] ?? {}) };
      const existing = Object.keys(forPost).find((e) => (forPost[e] ?? []).includes(me));
      if (existing === emoji) {
        // Tap same emoji → remove it
        willBeOn = false;
        forPost[emoji] = forPost[emoji].filter((r) => r !== me);
        if (forPost[emoji].length === 0) delete forPost[emoji];
      } else {
        // Tap different (or new) emoji → remove old, add new
        willBeOn = true;
        if (existing) {
          forPost[existing] = forPost[existing].filter((r) => r !== me);
          if (forPost[existing].length === 0) delete forPost[existing];
        }
        forPost[emoji] = [...(forPost[emoji] ?? []), me];
      }
      return { ...prev, [postId]: forPost };
    });
    fireRemote(() => setReactionRemote(userIdRef.current!, postId, emoji, willBeOn));
  }, [fireRemote]);

  const searchUsers = useCallback(async (query: string): Promise<SocialUser[]> => {
    if (!userIdRef.current) return [];
    const results = await searchUsersRemote(userIdRef.current, query);
    const exclude = new Set([
      ...friendsRef.current.map((f) => f.id),
      ...incomingRef.current.map((r) => r.user.id),
      ...outgoingRef.current.map((r) => r.user.id),
    ]);
    return results.filter((u) => !exclude.has(u.id));
  }, []);

  const requestFriend = useCallback((target: SocialUser) => {
    const tempId = uid('req');
    setOutgoing((prev) => (prev.some((r) => r.user.id === target.id) ? prev : [...prev, { id: tempId, user: target }]));
    fireRemote(async () => {
      const realId = await sendRequest(userIdRef.current!, target.id);
      setOutgoing((prev) => prev.map((r) => (r.id === tempId ? { id: realId, user: target } : r)));
    });
  }, [fireRemote]);

  const acceptRequest = useCallback((req: FriendRequest) => {
    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
    setFriends((prev) => (prev.some((f) => f.id === req.user.id) ? prev : [...prev, req.user]));
    fireRemote(() => acceptRequestRemote(req.id));
  }, [fireRemote]);

  const removeRequest = useCallback((req: FriendRequest) => {
    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
    setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
    fireRemote(() => deleteFriendship(userIdRef.current!, req.user.id));
  }, [fireRemote]);

  const removeFriend = useCallback((id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    fireRemote(() => deleteFriendship(userIdRef.current!, id));
  }, [fireRemote]);

  const nudge = useCallback((toId: string, habitName?: string) => {
    fireRemote(() => sendNudge(userIdRef.current!, toId, habitName));
  }, [fireRemote]);

  const markNudgesSeen = useCallback(() => {
    setNudges((prev) => (prev.every((n) => n.seen) ? prev : prev.map((n) => ({ ...n, seen: true }))));
    fireRemote(() => markNudgesSeenRemote(userIdRef.current!));
  }, [fireRemote]);

  const value = useMemo<SocialValue>(
    () => ({
      ready,
      live,
      meId,
      friends,
      posts,
      reactions,
      nudges,
      incoming,
      outgoing,
      feedPosts,
      unseenNudges,
      userById,
      preparePhoto,
      addPost,
      toggleReaction,
      searchUsers,
      requestFriend,
      acceptRequest,
      removeRequest,
      removeFriend,
      nudge,
      markNudgesSeen,
    }),
    [ready, live, meId, friends, posts, reactions, nudges, incoming, outgoing, feedPosts, unseenNudges, userById, preparePhoto, addPost, toggleReaction, searchUsers, requestFriend, acceptRequest, removeRequest, removeFriend, nudge, markNudgesSeen],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
}
