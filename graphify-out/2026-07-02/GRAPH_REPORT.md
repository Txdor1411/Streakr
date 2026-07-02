# Graph Report - Prodactivity  (2026-07-02)

## Corpus Check
- 66 files · ~83,326 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 458 nodes · 873 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20d44246`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Screens & Auth Flows|Screens & Auth Flows]]
- [[_COMMUNITY_Habit Tracking & State|Habit Tracking & State]]
- [[_COMMUNITY_Social Feed & Friends|Social Feed & Friends]]
- [[_COMMUNITY_Expo Dependencies|Expo Dependencies]]
- [[_COMMUNITY_Data Import & Preview|Data Import & Preview]]
- [[_COMMUNITY_App Config & Icons|App Config & Icons]]
- [[_COMMUNITY_Project Docs & Context|Project Docs & Context]]
- [[_COMMUNITY_App Layout & Auth Context|App Layout & Auth Context]]
- [[_COMMUNITY_Dev Tooling|Dev Tooling]]
- [[_COMMUNITY_Habit Data Schema|Habit Data Schema]]
- [[_COMMUNITY_Project Reset Scripts|Project Reset Scripts]]
- [[_COMMUNITY_Tab Navigation Icons|Tab Navigation Icons]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_React Brand Assets|React Brand Assets]]
- [[_COMMUNITY_Android & Expo Brand Assets|Android & Expo Brand Assets]]
- [[_COMMUNITY_App Branding Icons|App Branding Icons]]
- [[_COMMUNITY_OAuth Providers|OAuth Providers]]
- [[_COMMUNITY_Expo Icon Assets|Expo Icon Assets]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Router Types|Router Types]]
- [[_COMMUNITY_Expo Folder Docs|Expo Folder Docs]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 54 edges
2. `useStore()` - 25 edges
3. `Body()` - 21 edges
4. `Display()` - 19 edges
5. `useAuth()` - 17 edges
6. `Supabase backend` - 15 edges
7. `expo` - 13 edges
8. `Glass()` - 12 edges
9. `dateKey()` - 11 edges
10. `weekdayMon0()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Memory Index` --references--> `Supabase backend`  [EXTRACTED]
  memory/MEMORY.md → Prodactivity/supabase/README.md
- `AppSplash()` --calls--> `useTheme()`  [EXTRACTED]
  Prodactivity/src/app/_layout.tsx → Prodactivity/src/design/theme.tsx
- `SkeletonBone()` --calls--> `useTheme()`  [EXTRACTED]
  Prodactivity/src/components/loading-skeletons.tsx → Prodactivity/src/design/theme.tsx
- `Graphify Knowledge Graph Instructions` --references--> `Prodactivity Expo App`  [EXTRACTED]
  CLAUDE.md → Prodactivity/README.md
- `GoalsScreen()` --calls--> `useTheme()`  [EXTRACTED]
  Prodactivity/src/app/(tabs)/goals.tsx → Prodactivity/src/design/theme.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Sync Stack (client, helpers, store)** — supabase_readme_supabase_client, supabase_readme_sync_helpers, supabase_readme_habit_store [EXTRACTED 1.00]
- **Social Layer Database Tables** — supabase_readme_friendships_table, supabase_readme_posts_table, supabase_readme_reactions_table, supabase_readme_nudges_table [EXTRACTED 1.00]
- **Expo SDK 55 Constraint: Expo Go + Prodactivity App + Pin Decision** — memory_expo_sdk_55_expo_go, memory_expo_sdk_55_pin, prodactivity_readme_expo_app [EXTRACTED 1.00]
- **Android Adaptive Icon Set** —  [INFERRED 1.00]
- **Expo Brand Assets** —  [INFERRED 1.00]
- **App Branding Assets - Blue 'A' Logo Identity** — images_favicon_favicon, images_icon_appicon, images_logoglow_glow, images_splashicon_splashicon [INFERRED 0.95]
- **Consistent Blue Color Scheme Across Assets** — images_favicon_favicon, images_icon_appicon, images_logoglow_glow [INFERRED 0.90]
- **Logo 'A' Mark Variants for Different Contexts** — images_favicon_favicon, images_icon_appicon, images_splashicon_splashicon [INFERRED 0.95]
- **React Logo Resolution Variants** — images_react_logo_react_logo, images_react_logo_2x_react_logo, images_react_logo_3x_react_logo [INFERRED 1.00]
- **All Explore Icon Resolution Variants** — tabicons_explore_explore_tab_icon, tabicons_explore2x_explore_tab_icon_2x, tabicons_explore3x_explore_tab_icon_3x [INFERRED 0.95]
- **All Home Icon Resolution Variants** — tabicons_home_home_tab_icon, tabicons_home2x_home_tab_icon_2x, tabicons_home3x_home_tab_icon_3x [INFERRED 0.95]
- **All Tab Bar Navigation Icons** — tabicons_explore_explore_tab_icon, tabicons_home_home_tab_icon, tabicons_tab_navigation_bar [INFERRED 0.85]

## Communities (30 total, 6 thin omitted)

### Community 0 - "Screens & Auth Flows"
Cohesion: 0.07
Nodes (62): AuthScreen(), Mode, ComposeScreen(), CreateHabitScreen(), DAYS, EMOJIS, TYPE_MAP, TypeLabel (+54 more)

### Community 1 - "Habit Tracking & State"
Cohesion: 0.07
Nodes (46): COLORS, Confetti(), Piece, { width: SCREEN_W, height: SCREEN_H }, StreakFlame(), StreakFlameProps, addDays(), ALL_DAYS (+38 more)

### Community 2 - "Social Feed & Friends"
Cohesion: 0.07
Nodes (34): Cached, FriendRequest, FRIENDS, NewPost, Nudge, Persisted, Post, REACTION_EMOJIS (+26 more)

### Community 3 - "Expo Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, expo, expo-apple-authentication, expo-auth-session, expo-blur, expo-constants, expo-crypto, expo-device (+29 more)

### Community 4 - "Data Import & Preview"
Cohesion: 0.09
Nodes (18): FloatingTabBar(), ICONS, LABELS, styles, TabRoute, ArrowRight(), ChevronLeft(), ChevronRight() (+10 more)

### Community 5 - "App Config & Icons"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, reactCompiler (+19 more)

### Community 6 - "Project Docs & Context"
Cohesion: 0.09
Nodes (27): Expo Go (Play Store), Memory Index, Expo Versioned Docs Requirement, Graphify Knowledge Graph Instructions, Prodactivity Expo App, 0001_init.sql Migration, 0002_social.sql Migration, are_friends() Security-Definer Helper (+19 more)

### Community 7 - "App Layout & Auth Context"
Cohesion: 0.07
Nodes (24): AppSplash(), Navigator(), AVATARS, FEATURES, OnboardingScreen(), ScreenProps, styles, Wallpaper() (+16 more)

### Community 8 - "Dev Tooling"
Cohesion: 0.12
Nodes (16): devDependencies, eslint, eslint-config-expo, @types/react, typescript, main, name, private (+8 more)

### Community 10 - "Habit Data Schema"
Cohesion: 0.17
Nodes (10): DENSITY_LEVELS, Habit, HabitMeta, HABITS_META, HabitType, MOSAIC_LEVELS, SAMPLE_HABITS, TREND_VALS (+2 more)

### Community 11 - "Project Reset Scripts"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 12 - "Tab Navigation Icons"
Cohesion: 0.22
Nodes (9): Explore Tab Icon @2x, Explore Tab Icon @3x, Explore Tab Icon, Explore Icon Set (all resolutions), Home Tab Icon @2x, Home Tab Icon @3x, Home Tab Icon, Home Icon Set (all resolutions) (+1 more)

### Community 13 - "TypeScript Config"
Cohesion: 0.25
Nodes (7): compilerOptions, paths, strict, extends, include, @/*, @/assets/*

### Community 14 - "React Brand Assets"
Cohesion: 0.60
Nodes (6): Expo Web UI Pattern, React Brand / Framework, React Logo (2x Retina), React Logo (3x Retina), React Logo (1x), Expo Starter Web Tutorial Screenshot

### Community 15 - "Android & Expo Brand Assets"
Cohesion: 0.40
Nodes (6): Android Icon Background, Android Icon Foreground, Android Icon Monochrome, Expo Badge Dark, Expo Badge White, Expo Logo

### Community 17 - "App Branding Icons"
Cohesion: 0.83
Nodes (4): Favicon - Blue 'A' Logo on Light Blue Background, App Icon - 3D White 'A' Logo on Blue Grid Background, Logo Glow Effect - Soft Blue Radial Glow, Splash Screen Icon - White 'A' Logo on Transparent Background

### Community 18 - "OAuth Providers"
Cohesion: 0.50
Nodes (4): Apple Authentication, Auth Modal (src/app/auth.tsx), AuthProvider, Google Authentication

### Community 19 - "Expo Icon Assets"
Cohesion: 0.67
Nodes (3): Expo Symbol SVG (White Lambda/A Logo), Grid Asset (White on White, Likely Icon Placeholder), Prodactivity Favicon 48px (Expo Blue Logo)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (8): A short section about me & my life, FAQ, License, Now the technical part, TLDR; Building an ecosystem around these apps. Next: Workout tracker, Notes app and Calendar., TLDR; Instagram is very distracting and you might not like random people seeing your daily life., TLDR; You create habits, add friends and post videos/photos to prove it, Why build "another habit tracking app"?

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): Get a fresh project, Get started, Join the community, Learn more, Other setup steps, Welcome to your Expo app 👋

## Knowledge Gaps
- **205 isolated node(s):** `__routes`, `name`, `slug`, `version`, `orientation` (+200 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Screens & Auth Flows` to `Habit Tracking & State`, `Data Import & Preview`, `Community 31`, `App Layout & Auth Context`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Expo Dependencies` to `Dev Tooling`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `useStore()` connect `Screens & Auth Flows` to `Habit Tracking & State`, `Data Import & Preview`, `App Layout & Auth Context`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `__routes`, `name`, `slug` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Screens & Auth Flows` be split into smaller, more focused modules?**
  _Cohesion score 0.07111372318542462 - nodes in this community are weakly interconnected._
- **Should `Habit Tracking & State` be split into smaller, more focused modules?**
  _Cohesion score 0.06836055656382335 - nodes in this community are weakly interconnected._
- **Should `Social Feed & Friends` be split into smaller, more focused modules?**
  _Cohesion score 0.06765327695560254 - nodes in this community are weakly interconnected._