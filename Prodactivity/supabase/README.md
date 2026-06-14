# Supabase backend

The app is **local-first**: it runs fully on-device with no backend. Configuring
Supabase turns on optional accounts so habits sync and back up across devices.
Without the env vars below, every remote call is a no-op and nothing changes.

## What syncs

| Local state            | Table                              |
| ---------------------- | ---------------------------------- |
| Habit definitions      | `habits`                           |
| Per-day progress       | `habit_logs`                       |
| Name + emoji + @handle | `profiles`                         |
| Friends (request→accept) | `friendships`                    |
| Proof feed             | `posts` (+ `post-photos` storage)  |
| Reactions              | `reactions`                        |
| Nudges                 | `nudges`                           |

The social layer is local-first too: it runs on demo data on-device with no
backend, and syncs to the tables above once an account is signed in.

## One-time setup

1. **Create a project** at https://supabase.com → grab the project URL and the
   **anon** public key from *Project Settings → API*.

2. **Configure the app.** Copy the example env file and fill it in:

   ```sh
   cp .env.example .env.local
   ```

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

   `.env.local` is gitignored. The anon key is safe to ship in a client — every
   table is protected by Row-Level Security, so a user can only ever read/write
   their own rows.

3. **Apply the schema.** Run the migration in *SQL Editor* (paste the file) or
   with the Supabase CLI:

   ```sh
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push        # applies supabase/migrations/*.sql
   ```

   `0001_init.sql` creates the three habit tables, the `auth.users → profiles`
   trigger that auto-provisions a profile row on sign-up, `updated_at` triggers,
   and the owner-scoped RLS policies.

   `0002_social.sql` adds the social layer: a searchable `@username` on profiles,
   the `friendships` / `posts` / `reactions` / `nudges` tables, the public-read
   `post-photos` storage bucket, and the cross-user RLS (you can read a friend's
   posts via the `are_friends()` security-definer helper, which keeps the
   policies from recursing through `friendships`).

4. **Restart Expo** so the new `EXPO_PUBLIC_*` vars are picked up:

   ```sh
   npx expo start -c
   ```

## Auth providers

Email + password works out of the box. For the social buttons:

- **Apple** — enable *Apple* under *Authentication → Providers*. On iOS the app
  uses native `expo-apple-authentication` (`signInWithIdToken`); elsewhere it
  falls back to the web OAuth flow.
- **Google** — enable *Google* and add a client ID/secret. Uses the web OAuth
  flow via `expo-auth-session` + `expo-web-browser`.

Both OAuth flows redirect back through the `prodactivity` deep-link scheme
(`app.json`). Add that redirect URL under *Authentication → URL Configuration →
Redirect URLs* (Expo prints the exact URI on launch; in dev it's an
`exp://…` URL).

## How sync behaves

- **Optimistic.** Mutations update local state + AsyncStorage first, then push to
  the backend best-effort. Offline writes simply retry on the next sign-in pull.
- **First sign-in.** If the account already has data, it wins and is pulled down.
  If it's a fresh account and the local cache was never synced (or is already
  yours), the on-device data migrates up. If the cache belongs to a *different*
  user (shared device), it resets to seeds to avoid leaking data across accounts.
- **Sign out** keeps the last-synced data on-device and stops pushing.

## Files

- `src/lib/supabase.ts` — client handle (null when unconfigured).
- `src/design/auth.tsx` — `AuthProvider` / `useAuth`.
- `src/design/sync.ts` — table read/write helpers + first-login migration.
- `src/design/store.tsx` — wires the habit store to the sync helpers.
- `src/app/auth.tsx` — sign-in / sign-up modal.
