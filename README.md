# Vinland

Vinland is a **fitness and nutrition journaling app** built with [Expo](https://expo.dev/) and React Native. It runs on **iOS, Android, and the web**. There is **no remote server**: everything runs on the device (or in the browser), and all persistent data lives in **AsyncStorage** (or `localStorage` on web).

This document explains how the app is structured, how data is stored and queried, and how the main features connect.

---

## Features at a glance

- **Home** — Today’s workout checklist, workout session timer (start/end), nutrition (calorie goal, cheat meal), and daily weight (one entry per day, locked after save).
- **Workouts** — Create reusable workout templates (warm up, main block, cool down) with weighted, cardio, and circuit exercises; save to a **library**.
- **Week** — Seven-day view; attach saved workouts to specific dates; swipe to remove scheduled blocks; past days are read-only for edits that mutate storage.
- **Timer** — Run interval timers for **time-based** exercises on today’s list; optional chime between segments. Checking exercises off still happens on **Home** (the timer does not write the journal).
- **Stats** — Aggregates from the journal: completion rates, streaks, weight trends vs optional cut/bulk baseline, calorie-goal streak.
- **Settings** — Display name, training frequency, activity level, daily calorie goal, weight goal mode (cut/bulk baseline).

**First launch** uses a multi-step onboarding modal (`FirstLaunchOnboarding`) until profile fields are complete.

---

## Tech stack

| Area | Choice |
|------|--------|
| UI | React Native, Expo SDK ~54 |
| Navigation | `@react-navigation/native`, native stack (root + workouts), bottom tabs (main app) |
| Persistence | `@react-native-async-storage/async-storage` |
| Audio (timer) | `expo-av` |
| Static web deploy | `npx expo export -p web` → output copied to `docs/` for **GitHub Pages** |

The `router-template/` folder is **not** the main app entry; the product root is **`App.tsx`** with `expo/AppEntry.js` as the bundler entry.

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

The repo can publish from the **`docs/`** branch folder. Regenerate the site:

```bash
npm run export:docs
```

This runs `npx expo export -p web --clear`, then replaces `docs/` with the new `dist/`. The **`dist/`** directory is gitignored; only **`docs/`** needs to be committed for Pages.

---

## Project layout (source)

```
App.tsx                 # Root: providers, navigation container, Settings stack screen
components/             # Reusable UI (tasks, onboarding, timer ring, etc.)
constants/              # Theme tokens (vinlandTheme) and legacy theme
context/UserPrefsContext.tsx   # In-memory profile + AsyncStorage sync
navigation/             # Tab navigator, workouts stack, header helpers, route types
screens/                # Home, Week, Workouts list/form, Timer, Stats, Settings
types/index.ts          # Shared TypeScript models (Day, Task, SavedWorkout, …)
utils/
  storage.ts            # All AsyncStorage read/write helpers and keys
  workouts.ts           # Form parsing, scheduling tasks from saved workouts, normalization
  stats.ts              # Streaks, aggregates, workout session cleanup
  date.ts               # Local date keys, “today” resolution, week math
  workoutTimer.ts       # Pure timer state machine for interval exercises
  timerSound.ts         # Expo AV chime load/play/unload
  journalWeight.ts      # Latest weight lookup for stats/settings goals
  weightGoalCommit.ts   # Persist cut/bulk baseline from latest weight
scripts/
  sync-docs.mjs         # export:docs pipeline
```

---

## Architecture: no backend

There is **no HTTP API** and **no database**. “Saving” always means **writing JSON strings to AsyncStorage** (or the web equivalent).

**Querying** means:

1. `loadData()` → full `Day[]` journal.
2. `loadSavedWorkouts()` → workout library.
3. Smaller loaders (`loadProfilePrefs`, `loadWeightGoal`, …) for specific keys.

Screens typically:

1. **On focus** — `useFocusEffect` loads from storage into React state.
2. **On user action** — Update state, then call the appropriate `save*` helper.

Race conditions are mitigated with `cancelled` flags in async effects where needed.

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

Structured exercise: sets, reps or time phases, rest, optional flag, **kind** (`weighted` | `cardio` | `circuit`), cardio patterns, circuit stations, etc. Used both in the library and in scheduled **`Task`** rows.

### `Task`

`name`, `completed`, optional **`exercise`**, optional **`isScheduledWorkoutRoot`** for the titled row when scheduling from the library (used Week swipe-delete segmentation).

---

## AsyncStorage keys

| Key constant / pattern | Content |
|------------------------|--------|
| `@vinland_days` | `Day[]` — full journal |
| `@vinland_saved_workouts` | `SavedWorkout[]` — library |
| `@vinland_cheat_meal_week` | `{ weekStartMonday, used }` — cheat meal for ISO week |
| `@vinland_weight_goal` | `{ mode, baselineWeightLb, baselineDateKey }` |
| `@vinland_display_name` | string |
| `@vinland_profile_prefs` | `{ workoutsPerWeek, activityLevel, dailyCalorieGoal }` |
| `@vinland_onboarding_complete` | `'true'` / absent |
| `@vinland_onboarding_step` | step index string for onboarding modal |

See **`utils/storage.ts`** for validation and migration-style behavior (e.g. cheat meal week rollover).

---

## How data flows through the app

### Journal (`Day[]`)

- **Authoritative store**: `@vinland_days`.
- **Home** — Loads on tab focus; ensures today exists; merges UTC vs local date keys via **`resolveTodayDay`**; persists task toggles, workout start/end, weight, calorie fields.
- **Week** — Loads journal; writes when adding a saved workout to a day or when swipe-deleting a segment; **past dates** block mutations that change schedule.
- **Timer** — Reads today’s tasks to list timed exercises; it does **not** persist task completion (use Home checkboxes after training).
- **Stats** — Read-only aggregate over `Day[]` plus **`loadWeightGoal`** for progress copy.

### Workout library

- **Workouts list** — `loadSavedWorkouts` on focus.
- **Workout form** — Builds/edits `SavedWorkout`; `saveSavedWorkouts` replaces entire array (list screen reload pattern).

### Profile and onboarding

- **`UserPrefsProvider`** hydrates display name + profile prefs + onboarding flag on mount.
- Mutations (`setWorkoutsPerWeek`, etc.) read-modify-write **`@vinland_profile_prefs`** (or display name key) then update React state.
- **First launch**: onboarding steps persisted with **`@vinland_onboarding_step`** until completion flag is set.

### Streaks and stats (pure functions)

- **`utils/stats.ts`** — `computeStats`, `currentWorkoutStreak`, `calorieGoalHitStreak`, `dayQualifiesForStreak` work off in-memory `Day[]` (no I/O).
- **`taskCountsTowardDailyProgress`** / **`isWorkoutSectionHeader`** in **`utils/workouts.ts`** define which tasks affect streaks and completion metrics.

---

## Navigation

- **Root native stack** (`App.tsx`): `Main` (tabs) → `Settings`.
- **Tabs** (`MainTabs.tsx`): Home, Workouts (nested stack), Week, Timer, Stats.
- **Workouts stack** (`WorkoutsStack.tsx`): list ↔ form with `editId` param.

Header styling and transitions are centralized in **`navigation/headerNav.ts`**.

---

## Important behaviors and edge cases

- **Date keys**: Prefer **local** `YYYY-MM-DD` via **`localDateKey`**; **`resolveTodayDay`** still matches legacy **UTC** keys so older data appears on the correct “today.”
- **Optional exercises**: Marked in definitions; excluded from streak/progress tallies where **`taskCountsTowardDailyProgress`** returns false.
- **Scheduled workout blocks**: **`getScheduledWorkoutSegments`** finds ranges to delete as a unit on Week.
- **Web**: Same storage and logic; base path for static hosting may be set for GitHub project Pages (see export log: `base path: /Vinland-App`).

---

## User flows

For a **step-by-step** walkthrough of screens, actions, and what gets read/written for each tap, see **`user-flow-guide.txt`** in the repo root.

---

## Contributing / editing code

Function-level documentation is being added across **`utils/`**, **`screens/`**, **`components/`**, and **`navigation/`** so each module’s responsibilities stay obvious. Start with **`utils/storage.ts`** and **`types/index.ts`** when changing persistence or shapes.
