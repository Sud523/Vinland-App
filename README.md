# Vinland

Vinland is a **fitness and nutrition journaling app** built with [Expo](https://expo.dev/) and React Native. It runs on **iOS, Android, and the web**. Persistent data lives in **[Supabase](https://supabase.com/)** (PostgreSQL + Row Level Security) behind **Supabase Auth**. The client uses **`@supabase/supabase-js`** with **`AsyncStorage`** so sessions survive restarts on native and web.

This document explains app structure, backend setup, how data is stored, and how features connect.

Web URL: https://sud523.github.io/Vinland-App/

---

## Features at a glance

- **Home** — Today’s workout checklist, workout session timer (start/end), nutrition (calorie goal, cheat meal), and daily weight (one entry per day, locked after save).
- **Workouts** — Create reusable workout templates (warm up, main block, cool down) with weighted, cardio, and circuit exercises; save to a **library**.
- **Week** — Seven-day view; attach saved workouts to specific dates; swipe to remove scheduled blocks; past days are read-only for edits that mutate storage.
- **Timer** — Run interval timers for **time-based** exercises on today’s list; optional chime between segments. Checking exercises off still happens on **Home** (the timer does not write the journal).
- **Stats** — Aggregates from the journal: completion rates, streaks, weight trends vs optional cut/bulk baseline, calorie-goal streak.
- **Settings** — Display name, training frequency, activity level, daily calorie goal, weight goal mode (cut/bulk baseline), **sign out**.

**Auth** — Users **sign in or create an account with email and password** before using the app.

**First launch** — After login, a multi-step onboarding modal (`FirstLaunchOnboarding`) runs until profile fields are complete.

**Legacy installs** — If the device still had Vinland data from the **pre-cloud AsyncStorage era**, the app performs a **one-time migration** to Supabase after login (see below).

---

## Tech stack

| Area | Choice |
|------|--------|
| UI | React Native, Expo SDK ~54 |
| Navigation | `@react-navigation/native`, native stack (root + workouts), bottom tabs (main app) |
| Backend | Supabase (Auth + Postgres + RLS) |
| Client DB | `@supabase/supabase-js`; auth session storage via `@react-native-async-storage/async-storage` |
| Audio (timer) | `expo-av` |
| Static web deploy | `npx expo export -p web` → output copied to `docs/` for **GitHub Pages** |

The `router-template/` folder is **not** the main app entry; the product root is **`App.tsx`** with `expo/AppEntry.js` as the bundler entry.

---

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public API key from Supabase **Project Settings → API** |

Never ship `SUPABASE_SERVICE_ROLE_KEY` in the client; use it only for scripts or server tooling.

---

## Database schema & migrations

SQL lives under **`supabase/migrations/`**. Apply it to your Supabase project (SQL Editor or [Supabase CLI](https://supabase.com/docs/guides/cli)). The migration defines:

- **`profiles`** — One row per auth user (`id` = `auth.users.id`): display name, profile prefs, onboarding flags, cheat meal week, weight goal baseline, **`local_data_migrated_at`** (one-time legacy import).
- **`journal_days`** / **`journal_tasks`** — Normalized journal; exercise payloads stored as **jsonb**.
- **`workout_templates`** / **`workout_template_sections`** / **`workout_template_exercises`** — Workout library; exercise definitions as **jsonb**.

Row Level Security restricts reads/writes to **`auth.uid()`**.

### Delete account (Edge Function)

Settings → **Delete account** calls a Supabase Edge Function that uses the **service role** to remove the auth user (your tables use `ON DELETE CASCADE` from `auth.users` / `profiles`).

Deploy once from a machine with the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to this project. This repo includes the CLI as a dev dependency—you do **not** need a global `supabase` on `PATH`. From the repo root:

```bash
npm run supabase:deploy-delete-account
```

(equivalent to `npx supabase functions deploy delete-account`.)

The Dashboard injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the function at runtime. Until this function is deployed, delete will fail and the app shows an error alert.

---

## Architecture (client + Supabase)

1. **`AuthProvider`** — Holds Supabase session; shows **`AuthScreen`** until signed in.
2. **`UserPrefsProvider`** — Loads and updates **`profiles`** for display name, prefs, onboarding step/complete.
3. **`LocalDataMigrationGate`** — After prefs load, if **`local_data_migrated_at`** is null, runs **`migrateLocalToRemote`** (legacy AsyncStorage → cloud), then sets **`local_data_migrated_at`**. Shows a short loading state before the main UI so tabs don’t read an empty journal mid-import.
4. **`utils/storage.ts`** — Public API used by screens: **`loadData` / `saveData`**, **`loadSavedWorkouts` / `saveSavedWorkouts`**, cheat meal, weight goal. Implementations call Supabase via **`utils/supabase/journalRemote.ts`**, **`workoutsRemote.ts`**, and profile patches.
5. **Domain types** — Unchanged in **`types/index.ts`** (`Day`, `Task`, `SavedWorkout`, `ExerciseDefinition`).

**Querying** for screens:

1. `loadData()` → full `Day[]` from `journal_*` tables.
2. `loadSavedWorkouts()` → templates from `workout_*` tables.
3. `loadWeightGoal()` / cheat meal → `profiles` columns.

Screens typically **on focus** call these loaders; **on action** they update React state then **`saveData`** / **`saveSavedWorkouts`** (full journal or full library replace patterns, same as before).

---

## Legacy AsyncStorage (migration only)

Older builds stored JSON under keys like `@vinland_days`. Those keys are **only** read inside **`utils/migrateLocalToSupabase.ts`** when **`profiles.local_data_migrated_at`** is still null. After a successful upload and marker update, **`clearLegacyStorageKeys`** removes the old keys from the device.

---

## Data model (high level)

### `Day` (journal row)

One object per calendar date (`date`: `YYYY-MM-DD`). Holds:

- **`tasks`** — Checklist items; may include section headers (`— Section —`) and exercises with optional embedded **`ExerciseDefinition`**.
- **`weight`** — Optional number (lb); Home allows **one** positive entry per day, then locks.
- **`calorieGoalHit`** / **`caloriesOver`** — Nutrition checkpoint; when hit, row is “locked” until next calendar day for toggling the checkbox (overage can still be edited).
- **`workoutStartedAtMs`** — If set, “workout in progress”; cleared on End; stale keys on past days are cleared on load (`clearStaleWorkoutInProgress`).
- **`workoutSessionDurationsSeconds`** — Array of completed session lengths (seconds) when user taps End workout.

### `SavedWorkout` (library template)

`id`, `title`, optional `description`, and three arrays: **`warmUp`**, **`workout`**, **`coolDown`** of **`ExerciseDefinition`**. Legacy storage used a single `exercises` array; `normalizeSavedWorkout` maps that into **`workout`**.

### `ExerciseDefinition`

Structured exercise: sets, reps or time phases, rest, optional flag, **kind** (`weighted` | `cardio` | `circuit`), cardio patterns, circuit stations, etc.

### `Task`

`name`, `completed`, optional **`exercise`**, optional **`isScheduledWorkoutRoot`** for the titled row when scheduling from the library.

---

## Project layout (source)

```
App.tsx                      # AuthProvider → UserPrefsProvider → LocalDataMigrationGate → navigation
components/
  FirstLaunchOnboarding.tsx
  LocalDataMigrationGate.tsx
context/
  AuthContext.tsx
  UserPrefsContext.tsx
screens/                     # Home, Week, Workouts, Timer, Stats, Settings, AuthScreen
types/index.ts
utils/
  storage.ts                 # Facade: Supabase-backed loaders/savers
  supabase.ts                # createClient (EXPO_PUBLIC_* env)
  supabase/journalRemote.ts
  supabase/workoutsRemote.ts
  migrateLocalToSupabase.ts  # One-time AsyncStorage import
supabase/migrations/         # Postgres schema + RLS
```

---

## Getting started

```bash
npm install
npm start
```

Then open iOS simulator, Android emulator, or web from the Expo CLI.

### Lint

```bash
npm run lint
```

### Web export (GitHub Pages)

```bash
npm run export:docs
```

Regenerates static output into `docs/`. Commit source + `docs/` when publishing.

**Environment:** Expo inlines `EXPO_PUBLIC_*` variables **when the bundle is built**. The `export:docs` script loads your repo-root **`.env`** into the process before running `expo export`, so keys end up in `docs/` like they do in dev. If you export without those variables (e.g. CI with no secrets), the deployed site would miss Supabase config—the app now shows an on-screen “Configuration missing” message instead of a blank white page.

**GitHub Pages + `_expo`:** The export script always writes **`docs/.nojekyll`**. Without it, GitHub’s Jekyll build **omits** folders whose names start with `_`, so `docs/_expo/...` never deploys and the app JS returns 404 (white screen with loaded HTML). Re-run `npm run export:docs` and commit `docs/` including `.nojekyll`.

#### Hard refresh and saved data (web)

Journal and library data load from **Supabase** after login; session tokens persist in browser storage (via the Supabase client). Clearing site data logs you out and clears local session state.

---

## Navigation

- **Root native stack** (`App.tsx`): `Main` (tabs) → `Settings`.
- **Tabs** (`MainTabs.tsx`): Home, Workouts (nested stack), Week, Timer, Stats.
- **Workouts stack** (`WorkoutsStack.tsx`): list ↔ form with `editId` param.

---

## Important behaviors and edge cases

- **Date keys**: Prefer **local** `YYYY-MM-DD` via **`localDateKey`**; **`resolveTodayDay`** still matches legacy **UTC** keys where applicable.
- **Optional exercises**: Marked in definitions; excluded from streak/progress tallies where **`taskCountsTowardDailyProgress`** returns false.
- **Scheduled workout blocks**: **`getScheduledWorkoutSegments`** finds ranges to delete as a unit on Week.
- **Web**: Same Supabase project as native; GitHub Pages base path may be `/Vinland-App` (see export log).

---

## User flows

For a **step-by-step** walkthrough of screens, actions, and what gets read/written for each tap, see **`user-flow-guide.txt`** in the repo root.

---

## Contributing / editing code

When changing persistence, start with **`utils/storage.ts`**, **`utils/supabase/*`**, **`types/index.ts`**, and the SQL migration. Keep **RLS** policies aligned with any new tables or columns.
