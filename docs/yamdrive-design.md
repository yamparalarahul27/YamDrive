# YamDrive visual system

Reference: user-supplied Rivian design film. Adapted to the existing Android motorcycle planner, with Phosphor icons and solid, inexpensive map overlays.

## Identity
YamDrive is the display name. Android package `com.pitstop.app`, stored-trip key `pitstop.trip.v1` and legacy `pitstop` deep links remain compatible. New links may use `yamdrive`.

The generated yellow branching Y mark is packaged in `assets/images/icon.png`, Android foreground, splash and favicon sizes. Built-in ImageGen was used. Final prompt: Refine the branching-road Y into a clean flat graphic; remove centre-line dashes, texture and shading; solid golden yellow #F4C430 on charcoal #242523; centred in the adaptive-icon safe area; no lettering or extra symbols. The original generated source is retained outside the repo; all runtime assets are inside the repo.

## Colours and hierarchy
Warm off-white light canvas, white cards, charcoal night surfaces. Yellow is the primary-action fill with charcoal foreground. Text/icon tint is darker gold in light mode for contrast. Navigation uses blue; preparation uses green; fuel uses sand; rest uses lavender. Departure has a static lavender-to-peach gradient with dark text. Live speed retains below/within/above status fills; visible text is limited to the speed and km/h, with status available to accessibility services.

Typography emphasises numbers with tabular digits. Screen headings are 28, ride speed 38, guidance title 24. Rounded cards are 24, buttons 16, action targets at least 48 where shared controls are used. Route summary keeps its compact behaviour. Planning screens show the wordmark; riding stays focused on guidance.

## Boundaries
The OSM raster basemap is unchanged: its labels cannot be restyled independently. No new map service, telemetry, background navigation or provider account was introduced. Colour ranges remain user preferences, not engine-temperature or road-limit measurements. Light map performance mode is preserved.

## Verification
Run `npm run check`; build universal and ARM32 APKs. Verify real device portrait/landscape, route expansion, demo/pause, planning sheets, departure and existing saved data. Nokia-specific performance and rendering require the Nokia itself.

## Typography and spacing refinement
Native Android sans-serif keeps text rendering inexpensive. Shared roles: caption 12/16, body and labels 14/20, input 16/22, metric 20/26, screen heading 24/30 and display 36/40. Use medium-weight labels rather than bold everywhere. Native extra font padding is disabled; line heights remain explicit and system text scaling stays enabled.

Planning screens use 16-point group spacing, cards use 16-point padding, associated rows use 8-point gaps, and label/value pairs use 4–6 points. Metrics use compact durations and can wrap as groups on narrow screens or large font settings. Fuel/rest tiles no longer sit inside a second padded card. Shared controls retain 48-point minimum targets.

## Vehicle Home
Home is now `/`; navigation moved to `/map`, and all in-app map actions point there. Four icon tabs: Home, Map, Ride Plan, Trip. Home shows a static Hunter 350 illustration, serif vehicle heading, reported 2022/20,000 km details, saved departure/check progress and the current route distance (or an explicitly labelled planning estimate). No live vehicle telemetry is implied. Portrait stacks content; landscape places vehicle and planning panels side by side.

The bike is an ImageGen adaptation of the user-supplied red Hunter screenshot, saved as `assets/images/hunter-350.webp`. Prompt: extract the central red Hunter, preserve angle and mechanical proportions, remove UI, retain a white background and full-bike framing. It is labelled as an illustration rather than a photo of the user's own bike. The launcher mark was separately reduced using ImageGen, preserving the Y shape and charcoal/yellow palette. Unknown active GPS speed retains its unavailable state; idle speed displays zero.

## Saved rides and creation sheet
The Home plus action opens a new-ride bottom sheet with a connected start/destination layout, optional name and IST departure, distance estimate and a pinned Create ride action. Endpoints use the existing search/pin picker. New rides inherit planning preferences but start with empty stops, checklist and no road route. The Home ride row opens the saved-rides picker; inactive rides can be deleted with confirmation.

The collection is stored under `yamdrive.rides.v1`. First launch migrates the previous ride from `pitstop.trip.v1` without deleting that backup. Writes are serialized; outgoing ride edits are captured before switching. App screens remount on active-ride changes, and async actions are scoped to their initiating ride. Load failure leaves persistence disabled and displays an error rather than replacing stored data. The sheet handle dismisses on a downward swipe; multiple snap heights are not implemented.

### Start ride and petrol markers

The idle map has one labelled motorcycle Start ride pill; the speed meter appears after starting and retains pause/resume. Missing speed preferences open Ride Plan first. Fuel search results and saved fuel stops use charcoal pill markers with a yellow pump badge and a location dot. Planned refuelling targets use peach badges and explicitly say Fuel area, with distance from the start, rather than implying a petrol station exists there.

### Ride overview and elevation

A compact ride overview opens a detail sheet with approximate remaining time, arrival in IST, upcoming stop and GPS elevation. Remaining time uses the larger of proportional route time and planning-pace time, plus all future planned break durations; it is not traffic-aware and does not account for unscheduled stop duration. Off-route or missing position suppresses distance/time; paused rides suppress arrival. Saved stops are projected onto the route and considered only within 75 m. Elevation accepts fresh readings with altitude accuracy no worse than 30 m, keeps session extrema, and is not simulated or persisted. Valhalla street names are stored on new routes and displayed as a Toward label beneath the position arrow; older routes need refresh. Landscape places the summary between the bottom controls.

### Final ride controls

The floating tab dock uses centred icons. In ride view, Re-centre sits left of the inward-corners exit control, aligned with the bottom of the speed meter. A separate compact Exit demo button ends simulation. Route & stops uses the Phosphor path icon. Distance and time progress bars share one row in both orientations and open the ride summary sheet.

The compass is a fixed north-up reference: yellow stays at the top, green rotates with travel heading independently of map rotation, and the centre label shows the heading with a smaller letter for the weaker diagonal axis. Both pointers are inset three physical pixels from their original position. Heading changes crossfade with blur on supported Android versions and fade on older versions, respecting reduced motion. Tap resets the map north-up.

Map attribution appears for five seconds, then remains available through Route & stops → Map credits. The lower controls translate smoothly as the visible attribution collapses; reduced motion disables the transition.

### Vehicle info

Home uses the supplied three-quarter Hunter 350 PNG; tapping the image opens `/vehicle`, which uses the side-view PNG. The Home header combines ride selection, new ride and settings. Vehicle details are editable and shared across rides under `yamdrive.vehicle.v1`, outside the keyed ride stack. Initial year and mileage retain the existing 2022 / 20,000 km values. Pressure readings, service records and maintenance notes start empty. Saves are confirmed by storage before updating the UI, and unreadable data is not overwritten. Pressure values are manual entries in psi; service dates and recorded mileage are validated. The screen stacks in portrait and uses two columns in landscape.

### Fuel tracking and simplified headers

Vehicle info uses icon-only back/edit actions. Fuel & mileage replaces the pressure UI; legacy pressure records remain stored for compatibility. Fuel fills record date, odometer, litres, total rupees and full/partial status. Saving a new fill updates the vehicle odometer and requires progression beyond the previous fill. The latest completed full-to-full interval determines km/L and fuel cost/km, excluding the starting fill and including intervening partial fills. Total spend includes all entries. Values remain unavailable before a completed interval; there is no live fuel-level estimate or automatic GPS odometer. Ride Plan and Trip retain titles/actions without the YamDrive wordmark.

### Home range and four-card dashboard

Home shows estimated range instead of bike identity, a larger bike image, and a two-by-two Energy / Departure / Ride checks / Vehicle health grid. Identity stays in Vehicle info. Energy requires user-entered tank capacity, a full-fill baseline and measured full-to-full mileage; it subtracts odometer distance and adds subsequent partial fills, clamping fuel to capacity and zero. Odometer updates remain manual or fuel-entry driven, not automatic GPS accumulation. Unknown estimates stay unavailable.

Service setup accepts purchase date and the last confirmed scheduled milestone for the 2022 Hunter 350, with independently optional workshop date/km overrides. Calendar milestones are from purchase, with end-of-month clamping. Either elapsed date or reached mileage marks a reminder due. Ordinary service notes do not reset the schedule; other models require workshop values. The setup links to Royal Enfield's 2022 dual-channel owner manual, periodic maintenance pages 83–88. This is a maintenance reminder, not a mechanical-health diagnosis.
