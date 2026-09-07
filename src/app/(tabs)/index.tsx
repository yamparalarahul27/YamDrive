import { Map, Camera, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddStopSheet, type StopDraft } from '@/components/add-stop-sheet';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { bearingBetween, indexRoute, nextTurn, routeProgress, turnKind } from '@/lib/navigation-guidance';
import { MapPin, NavigationMarker } from '@/components/map-markers';
import { ResultsSheet } from '@/components/results-sheet';
import { ThemedText } from '@/components/themed-text';
import { RideWidget } from '@/components/ride-widget';
import { useRideSession } from '@/hooks/use-ride-session';
import { useTheme } from '@/hooks/use-theme';
import { categoryMeta, NEARBY_CATEGORIES } from '@/lib/categories';
import { formatDistanceKm, formatDuration } from '@/lib/geo';
import { mapStyle } from '@/lib/map-style';
import { searchNearby, searchPlaces, type PlaceResult } from '@/lib/places';
import { DEFAULT_RIDE_PLAN, buildRideSchedule } from '@/lib/ride-plan';
import { calculateRoute } from '@/lib/routing';
import { cumulativeKm, pointAlong, routeBounds, routeSignature, simplifyRoute, type Position } from '@/lib/route-geometry';
import { useTrip } from '@/lib/trip-store';
import type { Coordinate, StopCategory } from '@/lib/types';

type Search = { title: string; category: StopCategory; origin: Coordinate; results: PlaceResult[]; error: string | null; loading: boolean };

export default function MapScreen() {
  const theme = useTheme(), router = useRouter(), insets = useSafeAreaInsets();
  const { trip, hydrated, addStop, updateStop, setRoadRoute } = useTrip();
  const navigation = useNavigation();
  const { height, width } = useWindowDimensions();
  const landscape = width > height;
  const [riding, setRiding] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: riding ? { display: 'none' } : {
      backgroundColor: theme.background, borderTopColor: theme.border,
    } });
    if (!riding) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { setRiding(false); return true; });
    const blur = navigation.addListener('blur', () => setRiding(false));
    return () => { back.remove(); blur(); };
  }, [navigation, riding, theme.background, theme.border]);
  const plan = trip.ridePlan ?? DEFAULT_RIDE_PLAN;
  const lightMap = plan.lightMap !== false;
  const session = useRideSession(plan.speedRange ?? null);
  useEffect(() => navigation.addListener('blur', session.pause), [navigation, session.pause]);
  const signature = routeSignature(plan.origin, plan.destination, trip.stops, plan.originPin, plan.destinationPin);
  const latestSignature = useRef(signature);
  useEffect(() => { latestSignature.current = signature; }, [signature]);
  const route = trip.roadRoute?.signature === signature ? trip.roadRoute : null;
  const routeFeature = useMemo(() => route ? { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: simplifyRoute(route.coordinates) } } : null, [route]);
  const routeBlocks = useMemo(() => route ? indexRoute(route.coordinates) : undefined, [route]);
  const camera = useRef<CameraRef>(null);
  const [following, setFollowing] = useState(true);
  const [mapBearing, setMapBearing] = useState(0);
  const cameraBearing = useRef(0);
  const center = useRef<Coordinate>({ latitude: 16.3067, longitude: 80.4365 });
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState<Search | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [draft, setDraft] = useState<StopDraft | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; clearTimeout(sheetTimer.current); }; }, []);
  const targets = useMemo(() => {
    if (!route) return [];
    const distances = cumulativeKm(route.coordinates);
    return buildRideSchedule({ ...plan, distanceKm: route.distanceKm }).stops.slice(0, 60).map(s => ({
      ...s, point: pointAlong(route.coordinates, distances, s.km / route.distanceKm),
    }));
  }, [plan, route]);
  const selected = target === null ? undefined : targets[target];
  const fit = () => {
    setFollowing(false);
    if (!route) return;
    camera.current?.fitBounds(routeBounds(route.coordinates),
      { padding: { top: 110, bottom: 140, left: 30, right: 30 }, duration: 600 });
  };
  const focus = useCallback((point: Position) => { setFollowing(false); camera.current?.flyTo({ center: point, zoom: 13, duration: lightMap ? 0 : 650 }); }, [lightMap]);
  const build = async () => {
    if (busy) return;
    setBusy(true); setNotice(''); setTarget(null); setSearch(null);
    try {
      const result = await calculateRoute(plan, trip.stops);
      if (!active.current) return;
      if (latestSignature.current !== result.signature) { setNotice('Trip changed. Build your route again.'); return; }
      setRoadRoute(result);
      camera.current?.fitBounds(routeBounds(result.coordinates),
        { padding: { top: 110, bottom: 140, left: 30, right: 30 }, duration: 600 });
    } catch (e) { if (active.current) setNotice(e instanceof Error ? e.message : 'Route unavailable. Try again later.'); }
    finally { if (active.current) setBusy(false); }
  };
  const locate = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setNotice('Allow location access to centre the map on you.'); return; }
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(fix.coords); focus([fix.coords.longitude, fix.coords.latitude]);
    } catch { setNotice('Location unavailable. Check your GPS.'); }
  };
  const find = async (category?: StopCategory) => {
    if (busy || (!category && !query.trim())) return;
    setBusy(true);
  const origin = selected ? { latitude: selected.point[1], longitude: selected.point[0] } : center.current;
    const state: Search = { title: category ? `${categoryMeta(category).label} near ${selected ? `break ${target! + 1}` : 'map centre'}` : query,
      category: category ?? 'other', origin, results: [], loading: true, error: null };
    setSearch(state); setResultsVisible(true);
    try {
      const results = category ? await searchNearby({ query: '', center: origin, radiusMeters: 5000, category })
        : await searchPlaces({ query, center: origin, radiusMeters: 5000 });
      if (active.current) setSearch({ ...state, results, loading: false });
    } catch (e) { if (active.current) setSearch({ ...state, loading: false, error: e instanceof Error ? e.message : 'Search unavailable.' }); }
    finally { if (active.current) setBusy(false); }
  };
  const addPlace = useCallback((place: PlaceResult) => {
    setResultsVisible(false);
    clearTimeout(sheetTimer.current);
    sheetTimer.current = setTimeout(() => setDraft({ ...place, category: search?.category ?? 'other' }), 300);
  }, [search?.category]);
  const demoDistances = useMemo(() => route ? cumulativeKm(route.coordinates) : [], [route]);
  const demoPoint = useMemo(() => session.demo && route ? pointAlong(route.coordinates, demoDistances, session.demoKm / route.distanceKm) : null, [session.demo, session.demoKm, route, demoDistances]);
  const demoArrived = !!route && session.demo && session.demoKm >= route.distanceKm;
  useEffect(() => {
    if (!demoArrived || session.status !== 'active') return;
    const timer = setTimeout(session.pause, 0);
    return () => clearTimeout(timer);
  }, [demoArrived, session.status, session.pause]);
  const preview = () => {
    const run = () => { setToolsVisible(false); setTarget(null); setRiding(true); setFollowing(true); session.startDemo(); };
    if (session.status !== 'idle' && !session.demo) Alert.alert('Start demo?', 'This ends the current ride timer.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Start demo', onPress: run }]);
    else run();
  };
  const shownLocation = session.demo ? demoPoint ? { longitude: demoPoint[0], latitude: demoPoint[1] } : null : session.fix?.coords ?? userLocation;
  const livePoint = useMemo<Position | null>(() => session.positionReady && session.fix ? [session.fix.coords.longitude, session.fix.coords.latitude] : null, [session.positionReady, session.fix]);
  const navPoint = session.demo ? demoPoint : livePoint;
  const projection = useMemo(() => livePoint && route ? routeProgress(livePoint, route.coordinates, demoDistances, routeBlocks) : null,
    [livePoint, route, demoDistances, routeBlocks]);
  const progressKm = session.demo && route ? Math.min(1, session.demoKm / route.distanceKm) * demoDistances[demoDistances.length - 1] : projection?.km;
  const offRoute = !session.demo && !!projection && projection.distanceKm > 0.075;
  const turn = route?.steps && progressKm !== undefined && !offRoute ? nextTurn(route.steps, demoDistances, progressKm) : null;
  const ahead = useMemo(() => demoPoint && route ? pointAlong(route.coordinates, demoDistances, Math.min(1, session.demoKm / route.distanceKm + 0.1 / route.distanceKm)) : null, [demoPoint, route, demoDistances, session.demoKm]);
  const gpsHeading = session.fix?.coords.heading;
  const navHeading = session.demo && demoPoint && ahead ? bearingBetween(demoPoint, ahead) :
    session.positionReady && session.speed !== null && session.speed > 3 && gpsHeading !== null && gpsHeading !== undefined && gpsHeading >= 0 && gpsHeading < 360 ? gpsHeading : null;
  const navLon = navPoint?.[0], navLat = navPoint?.[1];
  useEffect(() => {
    if (!following || session.status !== 'active' || navLon === undefined || navLat === undefined) return;
    const difference = navHeading === null ? 0 : Math.abs(((navHeading - cameraBearing.current + 540) % 360) - 180);
    if (navHeading !== null && (!lightMap || difference >= 15)) cameraBearing.current = navHeading;
    camera.current?.easeTo({ center: [navLon, navLat], bearing: cameraBearing.current,
      pitch: 0, zoom: session.demo ? 12 : 16, padding: { top: height * 0.35, bottom: 70, left: 20, right: 20 }, duration: lightMap ? 0 : 650 });
  }, [following, session.status, session.demo, navLon, navLat, navHeading, height, lightMap]);
  const guidanceTitle = session.status === 'paused' ? 'Ride paused' : !route ? 'Build a route to navigate' :
    !navPoint ? 'Waiting for GPS' : offRoute ? 'Off route' : !route.steps?.length ? 'Update route for turn guidance' :
    demoArrived || (progressKm !== undefined && demoDistances[demoDistances.length - 1] - progressKm < 0.025) ? 'Arriving at destination' :
    turn ? `${turn.distanceKm < 0.025 ? 'Now' : `In ${formatDistanceKm(turn.distanceKm)}`}` : 'Follow the route';
  const guidanceText = session.status === 'paused' ? 'Resume to continue guidance' : demoArrived ? 'Route preview complete' : offRoute ? 'Return to the route · automatic rerouting is not enabled' :
    !navPoint ? 'Guidance needs a fresh location fix' : turn?.instruction ?? 'Open route tools to update';
  const turnIcon = turn ? turnKind(turn.type) : 'straight';
  const routeDrawing = useMemo(() => <>
{routeFeature ? <GeoJSONSource id="road" data={routeFeature}>
        <Layer id="road-outline" type="line" paint={{ 'line-color': '#fff', 'line-width': 8 }} />
        <Layer id="road-line" type="line" paint={{ 'line-color': '#0f766e', 'line-width': 5 }} />
      </GeoJSONSource> : null}
      {route ? <MapPin id="origin" point={route.coordinates[0]} label="A" color="#166534" /> : null}
      {route ? <MapPin id="destination" point={route.coordinates[route.coordinates.length - 1]} label="B" color="#991b1b" /> : null}
  </>, [routeFeature, route]);
  const plannedPins = useMemo(() => <>
{targets.map((s, i) => <MapPin key={`break-${i}`} id={`break-${i}`} point={s.point} label={`${s.fuel ? 'F' : 'R'}${i + 1}`} color={target === i ? '#6d28d9' : s.fuel ? '#c2410c' : '#0369a1'}
        onPress={() => { setTarget(i); focus(s.point); }} />)}
  </>, [targets, target, focus]);
  const savedPins = useMemo(() => <>
{trip.stops.map((s, i) => <MapPin key={s.id} id={s.id} point={[s.longitude, s.latitude]} label={`S${i + 1}`} color={categoryMeta(s.category).color}
        onPress={() => { if (!riding) setDraft({ ...s, editingId: s.id }); }} />)}
  </>, [trip.stops, riding]);
  const resultPins = useMemo(() => <>
{(riding ? [] : search?.results ?? []).map((p, i) => <MapPin key={p.id} id={`result-${p.id}`} point={[p.longitude, p.latitude]} label={`+${i + 1}`} color="#475569" onPress={() => addPlace(p)} />)}
  </>, [riding, search, addPlace]);
  const foreground = { color: theme.text };
  const surface = { backgroundColor: theme.background, borderColor: theme.border };
  return <View style={styles.root}>
    <Map mapStyle={mapStyle} style={styles.map} logo={false} attribution={false} preferredFramesPerSecond={lightMap ? 30 : 60}
      onDidFailLoadingMap={() => setMapFailed(true)} onDidFinishLoadingMap={() => setMapFailed(false)}
      onRegionWillChange={e => { if (e.nativeEvent.userInteraction) setFollowing(false); }}
      onRegionDidChange={e => {
        const { center: p, bearing } = e.nativeEvent;
        center.current = { latitude: p[1], longitude: p[0] };
        if (Number.isFinite(bearing)) { cameraBearing.current = bearing; setMapBearing(bearing); }
      }}
      onLongPress={e => { if (riding) return; const p = e.nativeEvent.lngLat; setDraft({ latitude: p[1], longitude: p[0], name: '', category: 'rest' }); }}>
      <Camera ref={camera} initialViewState={{ center: [80.4365, 16.3067], zoom: 10 }} />
      {routeDrawing}{plannedPins}{savedPins}{resultPins}
      {navPoint ? <NavigationMarker point={navPoint} heading={navHeading} mapBearing={mapBearing} demo={session.demo} /> : shownLocation && session.status === 'idle' ? <MapPin id="you" point={[shownLocation.longitude, shownLocation.latitude]} label="You" color="#2563eb" /> : null}
    </Map>
    <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 6, left: insets.left + 12, right: insets.right + 12 }, landscape && { width: Math.min(340, width * 0.45), right: undefined }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open route and stop tools"
        onPress={() => setToolsVisible(true)} style={[styles.routeBar, surface, session.status === 'idle' && styles.routeBarCompact]}>
        {session.status !== 'idle' ? <Icon name={session.status === 'paused' ? 'pause' : offRoute ? 'alert-circle-outline' : !navPoint ? 'crosshairs-gps' : turnIcon === 'straight' ? 'arrow-up' : `turn-${turnIcon}`} size={32} color={theme.tint} /> : <Icon name={riding ? 'motorbike' : 'map-marker-path'} size={25} color={theme.tint} />}
        <View style={styles.summary}>
          <ThemedText type="smallBold" numberOfLines={1}>{session.status !== 'idle' ? guidanceTitle : riding ? `To ${plan.destination}` : `${plan.origin} → ${plan.destination}`}</ThemedText>
          {session.status !== 'idle' ? <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>{guidanceText}</ThemedText> : null}
        </View>
        {session.status === 'idle' && route ? <ThemedText type="small" themeColor="textSecondary">{formatDistanceKm(route.distanceKm)}</ThemedText> : null}
        <Icon name="chevron-up" size={22} color={theme.textSecondary} />
      </Pressable>
      {session.demo ? <View style={[styles.demoBar, surface]}>
        <View style={{ flex: 1 }}><ThemedText type="smallBold">DEMO · {demoArrived ? 'Arrived' : session.status === 'paused' ? 'Paused' : '100× route playback'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{session.demoRange.min}–{session.demoRange.max} km/h sample range · simulated data</ThemedText></View>
        <IconButton name="close" accessibilityLabel="End demo" onPress={() => { session.end(); setRiding(false); }} />
      </View> : null}
      {busy ? <View style={[styles.feedback, surface]}><ActivityIndicator color={theme.tint} /><ThemedText type="small">Loading…</ThemedText></View> : null}
      {notice || mapFailed ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" style={[styles.card, surface]} onPress={() => setNotice('')}><ThemedText type="small">{notice || 'Map unavailable. Check your connection.'}</ThemedText></Pressable> : null}
    </View>
    <View style={{ position: 'absolute', left: insets.left + 12, bottom: (riding ? insets.bottom : 0) + (selected && !landscape ? 190 : 40) }}>
      <RideWidget session={{ ...session, start: () => { setFollowing(true); setRiding(true); session.start(); } }} range={plan.speedRange ?? null} onSettings={() => router.navigate('/plan')} />
    </View>
    {session.error ? <View style={[styles.card, surface, { position: 'absolute', top: insets.top + 85, left: insets.left + 12, right: insets.right + 12 }]}><ThemedText type="small">{session.error}</ThemedText></View> : null}
    <View pointerEvents="box-none" style={[styles.bottom, { bottom: riding ? insets.bottom + 8 : 8, left: insets.left + 12, right: insets.right + 12 }, landscape && { left: undefined, width: Math.min(340, width * 0.45) }]}>
      <View style={[styles.mapControls, landscape && { flexDirection: 'row', marginBottom: 0 }]}>
        {!riding && route ? <IconButton name="fit-to-screen-outline" accessibilityLabel="Fit route" style={[styles.mapButton, surface]} onPress={fit} /> : null}
        <IconButton name="crosshairs-gps" accessibilityLabel={session.status !== 'idle' ? 'Resume map following' : 'My location'} color={following ? theme.tint : theme.text} style={[styles.mapButton, surface]} onPress={() => { if (session.status !== 'idle') setFollowing(true); else void locate(); }} />
      </View>
      {selected ? <View style={[styles.card, surface]}>
        <ThemedText type="smallBold">{selected.fuel ? 'Fuel' : 'Rest'} target {target! + 1} · {formatDistanceKm(selected.km)} from start</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Suggested area · confirm a safe stop</ThemedText>
        <View style={styles.row}><Button label="Find stops" onPress={() => setToolsVisible(true)} stretch /><Button iconOnly icon="close" label="Close" variant="secondary" onPress={() => setTarget(null)} /></View>
      </View> : null}
      <View pointerEvents="box-none" style={[styles.row, { justifyContent: 'flex-end' }]}>
        {!riding ? <Button iconOnly label="Route & stops" icon="tune-variant" variant="secondary" onPress={() => setToolsVisible(true)} /> : null}
        <Button iconOnly label={riding ? 'Exit ride view' : 'Ride view'} icon={riding ? 'close' : 'motorbike'}
          variant={riding ? 'secondary' : 'primary'} onPress={() => { setTarget(null); setRiding(!riding); }} />
      </View>
      <Pressable accessibilityRole="link" style={styles.credit} onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}>
        <ThemedText type="small" style={styles.creditText}>© OpenStreetMap contributors · Valhalla</ThemedText>
      </Pressable>
    </View>
    <Sheet visible={toolsVisible} onClose={() => setToolsVisible(false)} title="Route & stops"
      subtitle={selected ? `Search near break ${target! + 1}` : 'Route, breaks and nearby places'}>
      <ScrollView style={{ maxHeight: Math.max(100, height - insets.top - insets.bottom - 150) }} contentContainerStyle={styles.panel} keyboardShouldPersistTaps="handled">
        <Button label="Demo ride" icon="play" variant="secondary" disabled={!route || busy} onPress={preview} />
        {session.status !== 'idle' ? <Button label={session.demo ? 'End demo' : 'End ride'} icon={session.demo ? 'close' : 'stop'} variant="secondary" onPress={() => { session.end(); setToolsVisible(false); }} /> : null}
        <ThemedText type="small" themeColor="textSecondary">Preview simulated speed and route movement. {route ? 'Real GPS is off during demo.' : 'Build a route first.'}</ThemedText>
        <ThemedText type="smallBold">{plan.origin} → {plan.destination}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{route
          ? `${formatDistanceKm(route.distanceKm)} · ${formatDuration(route.durationMinutes)} estimated · no live traffic`
          : trip.roadRoute ? 'Trip changed. Update your route.' : 'Build a route to see roads and breaks.'}</ThemedText>
        <View style={styles.row}>
          <Button label={route ? 'Update route' : 'Build route'} disabled={busy || !hydrated}
            onPress={() => { setToolsVisible(false); void build(); }} stretch />
          <Button iconOnly icon="pencil-outline" label="Edit plan" variant="secondary" onPress={() => { setToolsVisible(false); setRiding(false); router.navigate('/plan'); }} />
        </View>
        <View style={[styles.searchRow, { backgroundColor: theme.backgroundElement }]}>
          <TextInput style={[styles.input, foreground]} value={query} onChangeText={setQuery} placeholder="Town or address"
            placeholderTextColor={theme.textSecondary} accessibilityLabel="Search town or address" returnKeyType="search"
            onSubmitEditing={() => { if (query.trim() && !busy) { setToolsVisible(false); sheetTimer.current = setTimeout(() => void find(), 300); } }} />
          <Button iconOnly icon="magnify" label="Search" disabled={busy || !query.trim()} variant="secondary"
            onPress={() => { setToolsVisible(false); sheetTimer.current = setTimeout(() => void find(), 300); }} />
        </View>
        <ThemedText type="smallBold">{selected ? `Near break ${target! + 1}` : 'Near map centre'} · 5 km radius</ThemedText>
        <View style={styles.categories}>{NEARBY_CATEGORIES.map(c => <Button key={c} label={categoryMeta(c).label} icon={categoryMeta(c).icon} disabled={busy} variant="secondary"
          onPress={() => { setToolsVisible(false); sheetTimer.current = setTimeout(() => void find(c), 300); }} />)}</View>
        <Button label={`Saved stops · ${trip.stops.length}`} variant="secondary"
          onPress={() => { setToolsVisible(false); setRiding(false); router.navigate('/itinerary'); }} />
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: helpVisible }} style={styles.helpToggle} onPress={() => setHelpVisible(!helpVisible)}>
          <ThemedText type="smallBold">Map help</ThemedText><Icon name={helpVisible ? 'chevron-up' : 'chevron-down'} color={theme.textSecondary} />
        </Pressable>
        {helpVisible ? <View style={{ gap: 8 }}>
        <ThemedText type="small" themeColor="textSecondary">Hold an icon for its label. R = rest · F = fuel · S = saved. Tap a break pin to find stops nearby. Exit focus, then hold the map to add a stop.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Start a ride for live GPS speed. Pause freezes GPS and the timer. Turn banners work while the map is open; no voice or automatic rerouting.</ThemedText>
        </View> : null}
        <Pressable accessibilityRole="link" style={styles.report} onPress={() => void Linking.openURL('https://www.openstreetmap.org/fixthemap')}><ThemedText type="small" style={{ color: theme.tint }}>Report a map issue</ThemedText></Pressable>
      </ScrollView>
    </Sheet>
    <AddStopSheet draft={draft} onChange={changes => setDraft(previous => previous ? { ...previous, ...changes } : null)} onClose={() => setDraft(null)}
      onSubmit={(stop, editingId) => {
        if (editingId) updateStop(editingId, stop); else addStop(stop);
        setDraft(null); setTarget(null); setSearch(null);
        setNotice('Stop saved. Update your route to include it.');
      }} />
    {search ? <ResultsSheet {...search} visible={resultsVisible} onClose={() => setResultsVisible(false)}
      onAdd={addPlace} onFocus={p => { setResultsVisible(false); focus([p.longitude, p.latitude]); }} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  demoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 12 },
  root: { flex: 1 }, map: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 12, right: 12, gap: 6 },
  card: { padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  routeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  routeBarCompact: { minHeight: 48, paddingVertical: 6, gap: 8 },
  summary: { flex: 1, minWidth: 0 },
  feedback: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 12, alignSelf: 'center' },
  mapControls: { alignSelf: 'flex-end', gap: 10, marginBottom: 8 },
  mapButton: { width: 52, height: 52, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  panel: { gap: 14, paddingBottom: 8 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  helpToggle: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  report: { minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 6 }, searchRow: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 10, fontSize: 14 },
  bottom: { position: 'absolute', bottom: 0, left: 12, right: 12, gap: 4 },
  credit: { backgroundColor: '#ffffffee', alignSelf: 'flex-start', paddingHorizontal: 4 },
  creditText: { color: '#1e293b', fontSize: 10, lineHeight: 16 },
});
