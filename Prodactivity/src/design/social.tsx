/**
 * Social accountability layer — friends + a photo "proof" feed.
 *
 * Hybrid, mirroring the habit store:
 *  - Signed out (or no backend configured) → a fully local demo on AsyncStorage
 *    with seed friends/posts so the feature is explorable offline.
 *  - Signed in with Supabase configured → real data: friends are request→accept
 *    relationships, posts/reactions/nudges sync to the backend. Mutations are
 *    optimistic (local state first, then a best-effort remote push).
 *
 * The action surface is resource-shaped so the two modes share one UI.
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
import { Palette } from './tokens';

/** The local demo user id (real accounts use their auth uuid). */
export const ME = 'me';

export type SocialUser = { id: string; name: string; emoji: string; accent: string };

/** A pending friendship, identified by its row id, plus the other party. */
export type FriendRequest = { id: string; user: SocialUser };

export type Post = {
  id: string;
  authorId: string;
  kind: 'habit' | 'free';
  /** Habit metadata is denormalized onto the post (demo posts aren't tied to real habit ids). */
  habitName?: string;
  habitEmoji?: string;
  accent?: string;
  streak?: number;
  /** Photo URL (remote public URL for real posts, local file URI for demo); null for seeds. */
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
const HOUR = 3600_000;
// --------------------------------------------------------------------- seeds

const FRIENDS: SocialUser[] = [
  { id: 'aya', name: 'Aya', emoji: '🦊', accent: Palette.run },
  { id: 'marco', name: 'Marco', emoji: '🐼', accent: Palette.read },
  { id: 'lena', name: 'Lena', emoji: '🐯', accent: Palette.water },
];

// Functions so timestamps are fresh each time seeds are used (not frozen at bundle load).
const SEED_POSTS = (): Post[] => {
  const now = Date.now();
  return [
    { id: 's1', authorId: 'aya', kind: 'habit', habitName: 'Morning run', habitEmoji: '🏃', accent: Palette.run, streak: 12, photoUri: null, caption: "6am and freezing but it's done 🥶", createdAt: now - 2 * HOUR },
    { id: 's2', authorId: 'marco', kind: 'habit', habitName: 'Read', habitEmoji: '📚', accent: Palette.read, streak: 5, photoUri: null, caption: '20 pages before work', createdAt: now - 5 * HOUR },
    { id: 's3', authorId: 'lena', kind: 'habit', habitName: 'Drink water', habitEmoji: '💧', accent: Palette.water, streak: 21, photoUri: null, caption: 'glass #8 ✅ staying hydrated', createdAt: now - 9 * HOUR },
    { id: 's4', authorId: 'aya', kind: 'free', photoUri: null, caption: 'rest day reset — meal prep done 🥗', createdAt: now - 26 * HOUR },
  ];
};

const SEED_REACTIONS: Reactions = {
  s1: { '🔥': ['marco', 'lena'], '💪': ['lena'] },
  s2: { '👏': ['aya'] },
  s3: { '🔥': ['aya', 'marco'], '🎉': ['marco'] },
};

const SEED_NUDGES = (): Nudge[] => {
  const now = Date.now();
  return [
    { id: 'n1', fromId: 'aya', toId: ME, habitName: 'Morning run', createdAt: now - 1 * HOUR, seen: false },
  ];
};

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
  /** True when signed in with a configured backend (real data, not demo). */
  live: boolean;
  /** The current user's id: their auth uuid when live, otherwise the demo `ME`. */
  meId: string;
  friends: SocialUser[];
  posts: Post[];
  reactions: Reactions;
  nudges: Nudge[];
  /** Pending requests received / sent (live only). */
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  /** Posts from added friends + me, newest first. */
  feedPosts: Post[];
  unseenNudges: Nudge[];
  userById: (id: string) => SocialUser | undefined;
  /** Persist a picked photo: uploads to storage when live, else keeps it on-device. */
  preparePhoto: (localUri: string) => Promise<string>;
  addPost: (post: NewPost) => void;
  toggleReaction: (postId: string, emoji: string) => void;
  /** Find users by @username (live only); excludes existing friends/requests. */
  searchUsers: (query: string) => Promise<SocialUser[]>;
  /** Demo: add immediately. Live: send a friend request. */
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
  const meId = live ? userId! : ME;

  const [ready, setReady] = useState(false);
  const [friends, setFriends] = useState<SocialUser[]>(FRIENDS);
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [reactions, setReactions] = useState<Reactions>(SEED_REACTIONS);
  const [nudges, setNudges] = useState<Nudge[]>(SEED_NUDGES);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Latest values for use inside effects/callbacks without re-subscribing.
  const userIdRef = useRef(userId);
  const liveRef = useRef(live);
  const friendsRef = useRef(friends);
  const incomingRef = useRef(incoming);
  const outgoingRef = useRef(outgoing);
  const ownerRef = useRef(ownerId);
  userIdRef.current = userId;
  liveRef.current = live;
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

  // Reconcile with the backend on sign-in; reset to demo seeds on sign-out.
  useEffect(() => {
    if (!ready) return;

    if (!live) {
      // If the cache belonged to a real account, clear it back to demo seeds so
      // a signed-out device never shows another user's data.
      if (ownerRef.current) {
        setFriends(FRIENDS);
        setPosts(SEED_POSTS);
        setReactions(SEED_REACTIONS);
        setNudges(SEED_NUDGES);
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
    if (liveRef.current && userIdRef.current) {
      const url = await uploadPhoto(userIdRef.current, localUri);
      if (url) return url;
    }
    return persistLocalPhoto(localUri);
  }, []);

  const addPost = useCallback((post: NewPost) => {
    const full: Post = { ...post, id: uuidv4(), authorId: liveRef.current ? userIdRef.current! : ME, createdAt: Date.now() };
    setPosts((prev) => [full, ...prev]);
    fireRemote(() => pushPost(userIdRef.current!, full));
  }, [fireRemote]);

  const toggleReaction = useCallback((postId: string, emoji: string) => {
    const me = liveRef.current ? userIdRef.current! : ME;
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
    if (!liveRef.current || !userIdRef.current) return [];
    const results = await searchUsersRemote(userIdRef.current, query);
    const exclude = new Set([
      ...friendsRef.current.map((f) => f.id),
      ...incomingRef.current.map((r) => r.user.id),
      ...outgoingRef.current.map((r) => r.user.id),
    ]);
    return results.filter((u) => !exclude.has(u.id));
  }, []);

  const requestFriend = useCallback((target: SocialUser) => {
    if (!liveRef.current) {
      setFriends((prev) => (prev.some((f) => f.id === target.id) ? prev : [...prev, target]));
      return;
    }
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
    // Demo friends are local accounts with nowhere to receive a nudge; no-op.
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
