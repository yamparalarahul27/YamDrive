import { useFloatingNavigation } from '@/hooks/use-floating-navigation';
import { useRouter } from 'expo-router';
import { parseSpeedRange } from '@/lib/ride-speed';
import { routeSignature } from '@/lib/route-geometry';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EndpointPicker } from '@/components/endpoint-picker';
import { RidePreparation } from '@/components/ride-preparation';
import { plannedClock } from '@/lib/ride-preparation';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Sheet } from '@/components/sheet';
import { Brand } from '@/components/brand';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceKm, formatDuration } from '@/lib/geo';
import { buildRideSchedule, DEFAULT_RIDE_PLAN, rideDirectionsUrl, type RidePlan, type EndpointPin } from '@/lib/ride-plan';
import { useTrip } from '@/lib/trip-store';

export default function PlanScreen() {
  const { trip, hydrated, setRidePlan } = useTrip();
  if (!hydrated) return <ThemedText>Loading ride plan…</ThemedText>;
  return <PlanEditor initial={trip.ridePlan ?? DEFAULT_RIDE_PLAN} save={setRidePlan} />;
}

function PlanEditor({ initial, save }: { initial: RidePlan; save: (plan: RidePlan) => void }) {
  const dock = useFloatingNavigation();
  const theme = useTheme();
  const router = useRouter();
  const { trip } = useTrip();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState(initial);
  const { height } = useWindowDimensions();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState<'origin' | 'destination' | null>(null);
  const [pins, setPins] = useState<{ origin?: EndpointPin; destination?: EndpointPin }>({ origin: initial.originPin, destination: initial.destinationPin });
  const [draft, setDraft] = useState(() => ({
    speedMin: initial.speedRange ? String(initial.speedRange.min) : '', speedMax: initial.speedRange ? String(initial.speedRange.max) : '',
    origin: initial.origin, destination: initial.destination,
    distanceKm: String(initial.distanceKm), averageKph: String(initial.averageKph),
    breakEveryMinutes: String(initial.breakEveryMinutes), breakMinutes: String(initial.breakMinutes),
    fuelEveryKm: initial.fuelEveryKm === null ? '' : String(initial.fuelEveryKm),
  }));
  const [error, setError] = useState('');
  const roadRoute = trip.roadRoute?.signature === routeSignature(plan.origin, plan.destination, trip.stops, plan.originPin, plan.destinationPin) ? trip.roadRoute : null;
  const schedule = buildRideSchedule({ ...plan, distanceKm: roadRoute?.distanceKm ?? plan.distanceKm });
  const fields = [
    ['distanceKm', 'Distance estimate (km)', 1, 3000],
    ['averageKph', 'Planning pace (km/h)', 10, 120],
    ['breakEveryMinutes', 'Rest every (min)', 15, 180],
    ['breakMinutes', 'Break length (min)', 5, 120],
    ['fuelEveryKm', 'Fuel interval (km, optional)', 20, 500],
  ] as const;
  const update = (key: keyof typeof draft, value: string) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setError('');
  };
  const apply = () => {
    if (!draft.origin.trim() || !draft.destination.trim()) {
      setError('Enter a start and destination.'); return;
    }
    for (const [key, label, min, max] of fields) {
      if (key === 'fuelEveryKm' && draft[key].trim() === '') continue;
      const value = Number(draft[key]);
      if (!draft[key].trim() || !Number.isFinite(value) || value < min || value > max) {
        setError(`${label}: enter a number from ${min} to ${max}.`); return;
      }
    }
    const speedRange = parseSpeedRange({ min: Number(draft.speedMin), max: Number(draft.speedMax) });
    if ((draft.speedMin.trim() || draft.speedMax.trim()) && (!draft.speedMin.trim() || !draft.speedMax.trim() || !speedRange)) { setError('Enter both speed bounds from 0–200, with upper greater than lower.'); return; }
    const next: RidePlan = {
      departureTime: plan.departureTime, lightMap: plan.lightMap,
      preRideChecks: draft.origin.trim() === plan.origin && draft.destination.trim() === plan.destination &&
        JSON.stringify(pins) === JSON.stringify({ origin: plan.originPin, destination: plan.destinationPin }) ? plan.preRideChecks : [],
      ...(draft.speedMin.trim() && speedRange ? { speedRange } : {}),
      origin: draft.origin.trim(), destination: draft.destination.trim(),
      ...(pins.origin ? { originPin: pins.origin } : {}), ...(pins.destination ? { destinationPin: pins.destination } : {}),
      distanceKm: Number(draft.distanceKm), averageKph: Number(draft.averageKph),
      breakEveryMinutes: Number(draft.breakEveryMinutes), breakMinutes: Number(draft.breakMinutes),
      fuelEveryKm: draft.fuelEveryKm.trim() === '' ? null : Number(draft.fuelEveryKm),
    };
    setPlan(next); save(next); setEditing(false); setError('');
  };
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: dock.clearance + 16, paddingTop: insets.top + Spacing.three,
      paddingLeft: insets.left + Spacing.three, paddingRight: insets.right + Spacing.three }]}>
      <Brand />
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}><ThemedText type="subtitle">Ride plan</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">Hunter 350 · 2022 · 20,000 km</ThemedText></View>
        <IconButton name="tune-variant" accessibilityLabel="Edit ride settings" onPress={() => setEditing(true)} />
      </View>
      <View style={card}>
        <ThemedText type="smallBold">{plan.origin} → {plan.destination}</ThemedText>
        <View style={styles.metrics}>
          {[['Distance', formatDistanceKm(roadRoute?.distanceKm ?? plan.distanceKm)],
            ['Riding', formatDuration(schedule.ridingMinutes)], ['With breaks', formatDuration(schedule.elapsedMinutes)]].map(([label, value]) =>
            <View key={label} style={styles.metric}><ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
              <ThemedText type="metric">{value.replace(/ h /g, 'h ').replace(/ min/g, 'm')}</ThemedText></View>)}
        </View>
        <ThemedText type="caption" themeColor="textSecondary">Estimated · {roadRoute ? 'road distance' : 'manual distance'} · no live traffic</ThemedText>
      </View>
      <View style={{ gap: 8 }}>
        <View style={[styles.feature, { backgroundColor: theme.rest }]}><Icon name="coffee-outline" color={theme.tint} /><ThemedText type="small" style={{ flex: 1 }}>{plan.breakMinutes} min rest every {plan.breakEveryMinutes} min</ThemedText></View>
        <View style={[styles.feature, { backgroundColor: theme.fuel }]}><Icon name="gas-station" color={theme.tint} /><ThemedText type="small" style={{ flex: 1 }}>{plan.fuelEveryKm === null ? 'Fuel interval not set' : `Refuel every ${plan.fuelEveryKm} km`}</ThemedText></View>
      </View>
      <Button label="View map" icon="map-outline" onPress={() => router.navigate('/map')} />
      <RidePreparation plan={plan} elapsedMinutes={schedule.elapsedMinutes} onChange={next => { setPlan(next); save(next); }} />
      <View style={card}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: scheduleOpen }} style={styles.disclosure} onPress={() => setScheduleOpen(!scheduleOpen)}>
          <ThemedText type="smallBold">Break schedule · {schedule.stops.length}</ThemedText>
          <Icon name={scheduleOpen ? 'chevron-up' : 'chevron-down'} color={theme.textSecondary} />
        </Pressable>
        {scheduleOpen ? <View style={{ gap: 8 }}>
          {plan.departureTime ? <ThemedText type="caption" themeColor="textSecondary">Estimated times · IST · includes breaks</ThemedText> : null}
          {schedule.stops.length === 0 ? <ThemedText type="small" themeColor="textSecondary">No breaks planned before arrival.</ThemedText> : null}
          {schedule.stops.map((stop, index) => <View key={stop.km} style={[styles.scheduleRow, { borderColor: theme.border }]}>
            <Icon name={stop.fuel ? 'gas-station' : 'coffee-outline'} color={theme.tint} />
            <View style={{ flex: 1 }}><ThemedText type="smallBold">{index + 1}. {stop.fuel ? stop.rest ? 'Fuel + rest' : 'Fuel' : 'Rest'} · {formatDistanceKm(stop.km)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{plannedClock(plan.departureTime, stop.elapsedMinutes) ?? `${formatDuration(stop.elapsedMinutes)} from start`} · {plan.breakMinutes} min break</ThemedText></View>
          </View>)}
          <ThemedText type="smallBold">Arrive · {plannedClock(plan.departureTime, schedule.elapsedMinutes) ?? `${formatDuration(schedule.elapsedMinutes)} from start`}</ThemedText>
        </View> : null}
      </View>
      <View style={card}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: helpOpen }} style={styles.disclosure} onPress={() => setHelpOpen(!helpOpen)}>
          <ThemedText type="smallBold">Planning notes</ThemedText><Icon name={helpOpen ? 'chevron-up' : 'chevron-down'} color={theme.textSecondary} />
        </Pressable>
        {helpOpen ? <>
          <ThemedText type="small" themeColor="textSecondary">Pace estimates travel time; it is not a speed recommendation. Breaks do not measure engine temperature. No background break reminders.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Tap break pins on the map to choose real stops. Confirm access and opening hours.</ThemedText>
          <Button label="Open Google Maps" icon="navigation-variant" variant="secondary" onPress={() => {
            Linking.openURL(rideDirectionsUrl(plan)).catch(() => Alert.alert('Could not open Google Maps', 'Check that a maps app or browser is available.'));
          }} />
          <ThemedText type="small" themeColor="textSecondary">Endpoints only; planned breaks are not included.</ThemedText>
        </> : null}
      </View>
    </ScrollView>
    <Sheet visible={editing && !picking} title="Ride settings" onClose={() => setEditing(false)} footer={<Button label="Save" icon="check" onPress={apply} stretch />}>
      <ScrollView style={{ maxHeight: Math.max(100, height - insets.top - insets.bottom - 220) }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
        {(['origin', 'destination'] as const).map(key => <View key={key} style={{ gap: 4 }}>
          <ThemedText type="small" themeColor="textSecondary">{key === 'origin' ? 'Start' : 'Destination'}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${key === 'origin' ? 'start' : 'destination'} on map`} onPress={() => setPicking(key)} style={[styles.endpoint, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="map-marker-outline" color={theme.tint} /><View style={{ flex: 1 }}><ThemedText type="smallBold" numberOfLines={2}>{draft[key]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{pins[key] ? 'Pin selected · change' : 'Search or choose a pin'}</ThemedText></View><Icon name="pencil-outline" color={theme.textSecondary} />
          </Pressable>
        </View>)}
        <ThemedText type="smallBold">Speed colours</ThemedText>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Lower (km/h)" value={draft.speedMin} onChangeText={text => update('speedMin', text)} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><TextField label="Upper (km/h)" value={draft.speedMax} onChangeText={text => update('speedMax', text)} keyboardType="decimal-pad" /></View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">Yellow below · green within · red above. Your preference, not a road limit or engine-safety rating. Yellow is not a prompt to speed up.</ThemedText>
        {fields.map(([key, label]) => <TextField key={key} label={label} value={draft[key]} keyboardType="decimal-pad" onChangeText={text => update(key, text)} />)}
        <ThemedText type="small" themeColor="textSecondary">Pace is for planning, not a speed recommendation. Allow a fuel reserve; fuel level is not tracked.</ThemedText>
        {error ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</ThemedText> : null}
      </ScrollView>
    </Sheet>
    {picking ? <EndpointPicker title={picking === 'origin' ? 'Start' : 'Destination'} label={draft[picking]} initial={pins[picking]}
      onClose={() => setPicking(null)} onSelect={(label, pin) => {
        update(picking, label); setPins(previous => ({ ...previous, [picking]: pin })); setPicking(null);
      }} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: 16 },
  card: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  endpoint: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, minHeight: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flex: 1, minWidth: 80, gap: 6 },
  disclosure: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
