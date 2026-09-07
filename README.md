# Pitstop

An Android motorcycle trip planner built with React Native, Expo and TypeScript.
MapLibre displays OpenStreetMap tiles inside the app. Valhalla calculates a road
route through your start, saved stops and destination. No Google API keys or
billing account are needed for the default personal-use setup.

## Using it

1. In **Ride Plan**, set your start/destination, estimated average moving speed,
   rest interval, stop duration and optional fuel interval. Defaults describe
   the user's approximate 600 km Guntur–Bangalore ride.
2. In **Map**, open **Route & stops**, then tap **Build route**. Address lookup uses Android's geocoder
   and needs location permission. The route is calculated for a motorcycle.
3. The green line follows the roads. A/B are endpoints, R/F markers are planned
   rest/fuel targets, and S markers are your saved stops. Targets use road
   distance and your planning pace, not live traffic or engine temperature.
4. Tap a target, then **Find stops** and choose **Break** or **Fuel**. Results are mapped places
   within a 5 km straight-line radius, not verified detour distances. Tap + to
   add a candidate or tap a result to see it on the map.
5. Reorder saved stops in **Trip**, then calculate again to include them. Existing
   routes are hidden when endpoints or stop order change, so old routing isn't
   mistaken for an updated trip. Long-press the map for a custom stop.

The route geometry, chosen stops and ride settings persist on the phone. Map
viewing and new searches require internet. The route estimate has no live traffic;
stop opening hours, access, fuel availability and motorcycle road restrictions
should be reviewed before travel. At most 60 planning targets are drawn, and the
public route integration allows 18 intermediate stops. Map pins and coordinates
are not guaranteed safe stopping locations.

This version has no offline map download, spoken navigation, automatic rerouting,
background break alarms or engine/fuel telemetry. Google Maps handoff remains
optional; it is not required for in-app route viewing.

## Free public services

- Map display: MapLibre React Native v11 with OpenStreetMap standard raster tiles.
- Motorcycle routes: FOSSGIS public Valhalla service.
- Fuel, food, rest, stays and sights: Overpass API / OpenStreetMap.
- Address lookup: device geocoder.

This is a small personal-use integration, not an unlimited hosted service. Public
servers may throttle or fail. Requests have an identifiable User-Agent, 35-second
timeout, sequential execution with at least 1.5 seconds between uncached calls,
a bounded 24-hour cache, and a 60-second cooldown for rate-limit/service-busy
responses. Public POI searches are explicit, with no autocomplete, polling or route-wide
bulk POI extraction. Native map HTTP caching remains enabled. No tile prefetch or
offline-download feature is exposed. Map attribution and a report-issue link stay
visible. Queries and route coordinates are sent to the providers to fulfill the
requested action. Use a suitable hosted/self-hosted service before scaling.

Optional endpoint overrides are in `.env.example` and `src/lib/open-services.ts`.
Changing an endpoint via Expo environment variables requires rebuilding.

Policies and references:
- https://operations.osmfoundation.org/policies/tiles/
- https://routing.openstreetmap.de/about.html
- https://github.com/valhalla/valhalla
- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://maplibre.org/maplibre-react-native/docs/setup/expo/

## Build and verify

Requires Node 22+, Java 17 and an Android SDK. This workspace has the SDK installed
at `/opt/homebrew/share/android-commandlinetools`; set `ANDROID_HOME` for another
location. The script also detects Homebrew Java 17.

```bash
npm ci
npm run check
npm run build:apk
```

`dist/pitstop-test.apk` includes 32-bit and 64-bit ARM code plus bundled JavaScript,
so it runs without Metro or the Mac. It uses the generated debug signing identity
for personal testing. Configure a production signing identity before publication.
MapLibre requires a custom build and does not run inside Expo Go.

Tests cover distance math, route link encoding, schedule boundaries, polyline6
decoding, break-point interpolation, stale-route signatures and saved-route
validation. Device checks are still required for native map rendering and services.

### Map display

Use the motorcycle **Ride view** button to hide tabs and setup controls; X or Android Back exits it.
The map supports portrait and landscape. Enable Android **Auto-rotate** to follow
the phone orientation. Landscape places the route summary on the left, map
controls on the right, and setup in a scrollable side panel.

Compact map actions show their labels on long-press. A short tap performs the
action. Screen readers announce every icon label.

### Route endpoints

In Ride settings, tap Start or Destination to search (3+ characters), preview a
result, use current location, or tap an exact map pin. Confirm the pin, then Save
settings. Build/update the route to use it. Selected coordinates persist and take
priority over address lookup. Changing either pin invalidates the cached route.
Address suggestions use Android geocoding and require location permission; manual
pins do not.

### Live speed and pause

Set lower/upper pace in Ride Plan → Ride settings, then tap Play on the map badge. GPS speed is
yellow below, green within, and red above that preference. These colours are not
road speed limits or engine-health readings. Poor or stale GPS shows a neutral dash.
Pause stops GPS and freezes active ride time; Resume continues it; End resets it.
Leaving the map, backgrounding, or locking the phone automatically pauses the ride.
The timer is session-only; the pace range persists. No background tracking is used.

### Demo ride

Map → Route & stops → Demo ride plays the current road route with artificial
speed values and 100× movement. It cycles below/within/above range and a stop
every 32 seconds. The default 40–60 demo range is illustrative, not saved as a
riding recommendation. DEMO stays visible; GPS is disabled during playback.
Pause freezes both playback and its timer; Resume continues. End demo resets the
session without changing your route, stops, or settings.

### Navigation view

Update the route once to load turn instructions, then start a ride or demo.
The heading arrow and heading-up camera follow movement; pan to browse and tap
the location button to follow again. The banner shows the next instruction and
distance along the road line. Old saved routes remain viewable but need Update
route to add instructions. Poor/stale GPS hides turn advice; more than 75 m off
the route shows an off-route message. Matching uses the nearest road segment,
not lane-level positioning; intersections and parallel roads can be ambiguous.
No voice, automatic rerouting, or background guidance is included.

### India departure and preparation

Ride Plan → Set departure accepts 24-hour IST time, with 04:00, 04:30, 05:00 and
06:00 shortcuts. The break schedule and arrival show estimated clock times,
including planned breaks and `(+1d)`/`(+2d)` when crossing midnight. This is a
wall-clock plan in India (UTC+05:30), independent of the phone timezone; it does
not schedule an alarm, use live traffic, or assume an early start is safer.

Before you ride opens a saved, manually checked list grouped into Before ride
day and Before departure. It covers fuel readiness, tyres, brakes/pads,
chain/alignment, oil/leaks, controls/lights, luggage, supplies, route and rest.
It is based on the Hunter owner's manual and MSF T-CLOCS, with links in the app.
No mechanical condition is inferred from a tick. Reset checks for each ride;
changing departure time or route endpoints clears them. Existing plans migrate
without requiring a departure time or pre-filled checks.

### Low-memory Android support

Light map is on unless explicitly disabled in Ride Plan. It caps map rendering
at 30 FPS, follows without animated camera transitions and only rotates the
camera after a 15-degree heading change. Speed still updates at 1 Hz. Static
map elements are memoized; only the drawn line is simplified (5 m tolerance).
Full coordinates and maneuver indices remain intact for navigation. Route
matching uses 64-segment bounding blocks near the GPS fix, with a full-scan
fallback when farther off route. Route interpolation uses binary search.

`npm run build:apk` enables R8 code and resource shrinking and produces the
universal ARM APK. `npm run build:apk -- arm32` and `-- arm64` produce separate
`dist/pitstop-arm32.apk` and `dist/pitstop-arm64.apk` packages. Verify the target
phone's supported ABIs before choosing one; a 64-bit CPU may run 32-bit Android.
Minimum Android API remains 24. Realme demo checks do not establish Nokia
frame rate, memory or battery endurance; test on the target device.
