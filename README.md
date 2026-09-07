# Pitstop

An Android road-trip planner built with React Native and Expo. Drop stops on a
Google map, find petrol along the route, order the stops into an itinerary,
then hand the whole route to Google Maps for turn-by-turn navigation.

> The GitHub repo is still named `App-Capture-Exp` after an unrelated tool that
> used to live here. That tool was removed; this app is now the whole repo.
> Renaming the repo is a one-click change in GitHub's settings.

This is the first working slice: the map, the stop list, and the plumbing
around them. See [What is not here yet](#what-is-not-here-yet).

## What it does

- **Map first.** Full-screen Google Maps with your location, your stops as
  numbered pins colour-coded by kind, and a line joining them in order.
- **Drop a stop.** Long-press anywhere on the map. The address is reverse
  geocoded to prefill the name. Tapping a Google POI label works too.
- **Find petrol (and food, breaks, hotels, sights).** One-tap category search
  around whatever part of the map you are looking at. Results appear as pins
  and as a list with distances; add any of them to the trip.
- **Search by name.** Find a town, landmark or address and add it as a stop.
- **Build the itinerary.** Reorder stops, edit or delete them, add notes like
  "fill up here — next pump is 90 km", and see per-leg and total distance with
  a rough drive time.
- **Navigate.** Open a single stop, or the whole ordered route, in Google Maps.
- **Survives restarts.** The trip is saved to device storage.

## Stack

React Native, via Expo.

Those are not alternatives to each other: Expo is a framework built on top of
React Native, and it is the setup React Native's own documentation recommends
by default. `react-native` is a direct dependency here and the UI is built from
React Native's own `View`, `Text`, `Pressable` and `Modal`. What Expo adds is
the tooling around it — native configuration in `app.config.ts` instead of
hand-edited Gradle and manifest files, config plugins, cloud builds, and the
`expo-*` module library.

It is not a one-way door. `npx expo prebuild` generates the real `android/`
directory whenever you need to write native Kotlin or add a library that has no
config plugin.

| Piece | Choice |
| --- | --- |
| Runtime | React Native 0.86, New Architecture, Hermes |
| Framework | Expo SDK 57 |
| Language | TypeScript, `strict` |
| Routing | expo-router (file-based) |
| Map | `react-native-maps` on the Google provider |
| Location | `expo-location` |
| Storage | `@react-native-async-storage/async-storage` |
| State | React context + reducer (`src/lib/trip-store.tsx`) |
| Icons | `@expo/vector-icons` (Material Community) |

`react-native-maps` is used rather than Expo's own `expo-maps` because
`expo-maps` is still published as alpha and documented as subject to breaking
changes. Swapping later is contained to `src/components/map-markers.tsx` and
the map screen.

## Requirements

- Node.js 22+
- An Android device or emulator
- A Google Cloud project with billing enabled, for the API keys below

## Google API keys

The app needs two keys, because they are used in two different ways. Both are
optional for a first run — the app degrades and tells you what is missing —
but the map itself will be blank without the first one.

| Env var | Used by | Restrict it to | Needed for |
| --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | The native Maps SDK, via `AndroidManifest.xml` | Android apps: package name + signing cert SHA-1 | The map rendering at all |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Places API (New) REST calls from JS | The Places API only | Category and text search |

Set up:

1. In the [Google Cloud console](https://console.cloud.google.com/), enable
   **Maps SDK for Android** and **Places API (New)**.
2. Create the keys and apply the restrictions in the table above.
3. `cp .env.example .env` and fill both in.

Two caveats worth knowing before you ship this:

- `EXPO_PUBLIC_` variables are **inlined into the JS bundle** at build time.
  Anyone with the APK can read that key. Restricting it to the Places API caps
  the damage; the real fix is to proxy Places calls through a backend that
  holds the key. Do that before a public release.
- An **Android-restricted key will be rejected** by the Places REST endpoint,
  which is why these are separate variables. If nearby search returns a
  permission error, that mismatch is the usual cause — the app surfaces
  Google's own message in the results sheet so you can see which it is.

Without a Places key, text search still works: it falls back to the operating
system's geocoder, which resolves addresses and place names to coordinates but
returns no names, ratings or opening hours. Category search needs the key and
says so.

## Running it

```bash
npm install
```

Then build a **development build**. Expo Go cannot carry your own
`GOOGLE_MAPS_API_KEY` — that key is written into `AndroidManifest.xml` when the
app is built, and Expo Go ships a prebuilt manifest — so a development build is
required to see your own map tiles and your own quota. Build it once, then
iterate over the JS as usual:

```bash
# Local build: needs Android Studio and a device or emulator attached
npx expo run:android

# Or build in the cloud with EAS instead
npx eas build --profile development --platform android
```

After that, `npm run android` starts the dev server against the installed
build.

Changing `.env`, `app.config.ts`, or any native dependency means rebuilding —
`GOOGLE_MAPS_API_KEY` is baked into the manifest at build time, not read at
runtime.

## Checks

```bash
npm run check      # typecheck + lint + tests
npm run typecheck  # tsc, app and test suites
npm run lint
npm test           # Node's test runner over the pure logic
```

## Layout

```
app.config.ts              Expo config; reads the Maps key from the environment
src/app/
  _layout.tsx              Root stack, theme, trip provider, splash gate
  (tabs)/_layout.tsx       Bottom tabs
  (tabs)/index.tsx         Map screen
  (tabs)/itinerary.tsx     Trip screen
src/lib/
  types.ts                 Coordinate, Stop, Trip, StopCategory
  categories.ts            Per-category label, icon, colour, search query
  geo.ts                   Distance, formatting, map regions
  places.ts                Places API (New) + OS geocoder fallback
  navigation-links.ts      Google Maps handoff URLs
  storage.ts               AsyncStorage load/save with validation
  trip-store.tsx           Trip context and reducer
src/components/            Sheets, markers, buttons, fields
test/                      Node tests for geo and navigation-links
```

### Things you will probably want to change

- `android.package` in `app.config.ts` is `com.pitstop.app`. Change it before
  publishing.
- `CATEGORIES` in `src/lib/categories.ts` holds the search text per category.
  The fuel query is `"petrol pump"`, which is right for India and weaker in
  places that say "gas station". Tune per region.
- `ROAD_WINDING_FACTOR` and `AVERAGE_SPEED_KPH` in `src/lib/geo.ts` drive the
  distance and time estimates.

## What is not here yet

Known gaps, roughly in the order they would hurt:

- **Distances are estimates, not routing.** Everything is straight-line
  haversine distance plus 25% for road winding, at an assumed 45 km/h. Real
  numbers need the Google Directions API, which would also give a road-shaped
  polyline instead of the straight lines drawn between stops today.
- **One trip.** The data model is already keyed by trip id, but there is no
  trip list or switcher.
- **Reordering is by arrow buttons**, not drag and drop.
- **Google Maps takes 9 waypoints.** Longer trips prompt before opening a
  truncated route rather than splitting into legs.
- **No offline maps, no fuel prices, no range or fuel-economy planning.**
- **Tests cover the pure logic only** (`geo.ts`, `navigation-links.ts`) —
  those run under Node without a bundler. Component and store tests would need
  `jest-expo` to resolve the `@/` alias and mock the native modules.
- **Routes that cross the antimeridian** would compute a globe-spanning
  bounding box in `regionForCoordinates`.
