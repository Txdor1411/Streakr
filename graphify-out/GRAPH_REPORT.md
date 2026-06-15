# Graph Report - .  (2026-06-15)

## Corpus Check
- 84 files · ~78,579 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 410 nodes · 776 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.84)
- Token cost: 2,300 input · 2,450 output

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
- [[_COMMUNITY_Analytics & Heatmap|Analytics & Heatmap]]
- [[_COMMUNITY_Habit Data Schema|Habit Data Schema]]
- [[_COMMUNITY_Project Reset Scripts|Project Reset Scripts]]
- [[_COMMUNITY_Tab Navigation Icons|Tab Navigation Icons]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_React Brand Assets|React Brand Assets]]
- [[_COMMUNITY_Android & Expo Brand Assets|Android & Expo Brand Assets]]
- [[_COMMUNITY_Confetti Animation|Confetti Animation]]
- [[_COMMUNITY_App Branding Icons|App Branding Icons]]
- [[_COMMUNITY_OAuth Providers|OAuth Providers]]
- [[_COMMUNITY_Expo Icon Assets|Expo Icon Assets]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Router Types|Router Types]]
- [[_COMMUNITY_Expo Folder Docs|Expo Folder Docs]]

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 50 edges
2. `useStore()` - 23 edges
3. `Body()` - 20 edges
4. `Display()` - 18 edges
5. `expo` - 13 edges
6. `useAuth()` - 13 edges
7. `Glass()` - 12 edges
8. `dateKey()` - 11 edges
9. `computeStreak()` - 10 edges
10. `HabitDetailScreen()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Local-First Architecture` --semantically_similar_to--> `Expo SDK 55 Pin`  [INFERRED] [semantically similar]
  Prodactivity/supabase/README.md → memory/expo-sdk-55-pin.md
- `Expo Versioned Docs Requirement` --conceptually_related_to--> `Expo SDK 55 Pin`  [INFERRED]
  Prodactivity/AGENTS.md → memory/expo-sdk-55-pin.md
- `Expo SDK 55 Pin` --conceptually_related_to--> `Prodactivity Expo App`  [INFERRED]
  memory/expo-sdk-55-pin.md → Prodactivity/README.md
- `Memory Index` --references--> `Supabase Backend`  [EXTRACTED]
  memory/MEMORY.md → Prodactivity/supabase/README.md
- `ImportScreen()` --calls--> `useTheme()`  [EXTRACTED]
  Prodactivity/src/app/import.tsx → Prodactivity/src/design/theme.tsx

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

## Communities (24 total, 3 thin omitted)

### Community 0 - "Screens & Auth Flows"
Cohesion: 0.07
Nodes (60): AuthScreen(), Mode, ComposeScreen(), CreateHabitScreen(), DAYS, EMOJIS, TYPE_MAP, TypeLabel (+52 more)

### Community 1 - "Habit Tracking & State"
Cohesion: 0.08
Nodes (37): StreakFlame(), StreakFlameProps, addDays(), ALL_DAYS, Cached, computeBestStreak(), computeStreak(), dateKey() (+29 more)

### Community 2 - "Social Feed & Friends"
Cohesion: 0.07
Nodes (40): Cached, FriendRequest, FRIENDS, NewPost, now, Nudge, Persisted, persistLocalPhoto() (+32 more)

### Community 3 - "Expo Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, expo, expo-apple-authentication, expo-auth-session, expo-blur, expo-constants, expo-crypto, expo-device (+27 more)

### Community 4 - "Data Import & Preview"
Cohesion: 0.09
Nodes (22): ImportScreen(), JSON_LINES, PREVIEW, Row, SYNTAX, TAG_COLOR, FloatingTabBar(), ICONS (+14 more)

### Community 5 - "App Config & Icons"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, reactCompiler (+19 more)

### Community 6 - "Project Docs & Context"
Cohesion: 0.12
Nodes (23): Expo Go (Play Store), Expo SDK 55 Pin, Memory Index, Expo Versioned Docs Requirement, Graphify Knowledge Graph Instructions, Prodactivity Expo App, 0001_init.sql Migration, 0002_social.sql Migration (+15 more)

### Community 7 - "App Layout & Auth Context"
Cohesion: 0.14
Nodes (13): Navigator(), AuthContext, AuthProvider(), AuthValue, OAuthProvider, redirectTo, OnboardingContext, OnboardingProvider() (+5 more)

### Community 8 - "Dev Tooling"
Cohesion: 0.12
Nodes (16): devDependencies, eslint, eslint-config-expo, @types/react, typescript, main, name, private (+8 more)

### Community 9 - "Analytics & Heatmap"
Cohesion: 0.17
Nodes (9): Heatmap(), HeatmapLegend(), HeatmapProps, DayStat, Range, RANGE_DAYS, RANGE_PREV_LABEL, RANGE_SUBTITLE (+1 more)

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

### Community 16 - "Confetti Animation"
Cohesion: 0.40
Nodes (3): COLORS, Confetti(), Piece

### Community 17 - "App Branding Icons"
Cohesion: 0.83
Nodes (4): Favicon - Blue 'A' Logo on Light Blue Background, App Icon - 3D White 'A' Logo on Blue Grid Background, Logo Glow Effect - Soft Blue Radial Glow, Splash Screen Icon - White 'A' Logo on Transparent Background

### Community 18 - "OAuth Providers"
Cohesion: 0.50
Nodes (4): Apple Authentication, Auth Modal (src/app/auth.tsx), AuthProvider, Google Authentication

### Community 19 - "Expo Icon Assets"
Cohesion: 0.67
Nodes (3): Expo Symbol SVG (White Lambda/A Logo), Grid Asset (White on White, Likely Icon Placeholder), Prodactivity Favicon 48px (Expo Blue Logo)

## Knowledge Gaps
- **188 isolated node(s):** `__routes`, `name`, `slug`, `version`, `orientation` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Screens & Auth Flows` to `Analytics & Heatmap`, `Data Import & Preview`, `Habit Tracking & State`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Expo Dependencies` to `Dev Tooling`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useStore()` connect `Screens & Auth Flows` to `Habit Tracking & State`, `Analytics & Heatmap`, `App Layout & Auth Context`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `__routes`, `name`, `slug` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Screens & Auth Flows` be split into smaller, more focused modules?**
  _Cohesion score 0.07346459006758742 - nodes in this community are weakly interconnected._
- **Should `Habit Tracking & State` be split into smaller, more focused modules?**
  _Cohesion score 0.0797979797979798 - nodes in this community are weakly interconnected._
- **Should `Social Feed & Friends` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._