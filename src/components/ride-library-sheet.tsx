import { IconButton } from '@/components/icon-button';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { EndpointPicker } from '@/components/endpoint-picker';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_RIDE_PLAN, type EndpointPin } from '@/lib/ride-plan';
import { parseDepartureTime, plannedClock } from '@/lib/ride-preparation';
import { useTrip } from '@/lib/trip-store';

export function RideLibrarySheet({ mode, onClose, onNew }: { mode: 'new' | 'saved'; onClose: () => void; onNew: () => void }) {
  const theme = useTheme(), { height } = useWindowDimensions(), insets = useSafeAreaInsets();
  const { trip, trips, hydrated, createRide, selectRide, deleteRide } = useTrip();
  const [name, setName] = useState(''), [distance, setDistance] = useState(''), [departure, setDeparture] = useState('');
  const [endpoints, setEndpoints] = useState({ origin: '', destination: '' });
  const [pins, setPins] = useState<{ origin?: EndpointPin; destination?: EndpointPin }>({});
  const [picking, setPicking] = useState<'origin' | 'destination' | null>(null);
  const [error, setError] = useState('');
  const create = () => {
    const km = Number(distance);
    if (!endpoints.origin.trim() || !endpoints.destination.trim()) { setError('Choose a start and destination.'); return; }
    if (!distance.trim() || !Number.isFinite(km) || km < 1 || km > 3000) { setError('Enter an estimated distance from 1–3,000 km.'); return; }
    if (departure.trim() && !parseDepartureTime(departure.trim())) { setError('Use 24-hour departure time, for example 04:30.'); return; }
    const preferences = trip.ridePlan ?? DEFAULT_RIDE_PLAN;
    createRide(name.trim() || `${endpoints.origin} → ${endpoints.destination}`, {
      ...DEFAULT_RIDE_PLAN, ...endpoints, originPin: pins.origin, destinationPin: pins.destination,
      distanceKm: km, departureTime: departure.trim() || undefined, preRideChecks: [],
      averageKph: preferences.averageKph, breakEveryMinutes: preferences.breakEveryMinutes,
      breakMinutes: preferences.breakMinutes, fuelEveryKm: preferences.fuelEveryKm,
      speedRange: preferences.speedRange, lightMap: preferences.lightMap,
    });
    onClose();
  };
  return <>
    <Sheet visible={!picking} title={mode === 'new' ? 'New ride' : 'Your rides'} subtitle={mode === 'new' ? 'A new route. Your own pace.' : `${trips.length} saved on this phone`} showHandle onClose={onClose}
      footer={<Button label={mode === 'new' ? 'Create ride' : 'New ride'} icon={mode === 'new' ? 'check' : 'plus'} disabled={!hydrated} onPress={mode === 'new' ? create : onNew} stretch />}>
      <ScrollView style={{ maxHeight: Math.max(120, height - insets.top - insets.bottom - 260) }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
        {mode === 'new' ? <>
          <TextField label="Ride name (optional)" placeholder="Weekend escape" value={name} onChangeText={setName} maxLength={100} />
          <View style={{ gap: 8 }}>
            {(['origin', 'destination'] as const).map((key, i) => <View key={key} style={styles.timelineRow}>
              <View style={styles.rail}><View style={[styles.node, { backgroundColor: theme.text }]}><Icon name={i === 0 ? 'navigation-variant' : 'map-marker-outline'} size={16} color={theme.background} /></View>{i === 0 ? <View style={[styles.line, { backgroundColor: theme.border }]} /> : null}</View>
              <Pressable accessibilityRole="button" accessibilityLabel={i === 0 ? 'Choose ride start' : 'Choose ride destination'} onPress={() => setPicking(key)} style={[styles.endpoint, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="caption" themeColor="textSecondary">{i === 0 ? 'Start' : 'Destination'}</ThemedText>
                <ThemedText type="label" numberOfLines={2}>{endpoints[key] || 'Search or drop a pin'}</ThemedText>
              </Pressable>
            </View>)}
          </View>
          <View style={styles.fields}><View style={{ flex: 1 }}><TextField label="Estimate (km)" placeholder="600" keyboardType="decimal-pad" value={distance} onChangeText={setDistance} /></View>
            <View style={{ flex: 1 }}><TextField label="Departure · IST" placeholder="Optional · 04:30" maxLength={5} value={departure} onChangeText={setDeparture} /></View></View>
          <ThemedText type="caption" themeColor="textSecondary">Road distance updates when you build the route. Add stops on the map. Break and speed preferences carry over; the checklist starts fresh.</ThemedText>
          {error ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</ThemedText> : null}
        </> : trips.map(ride => <Pressable key={ride.id} accessibilityRole="radio" accessibilityState={{ checked: ride.id === trip.id }} accessibilityLabel={`Open ride ${ride.name}`}
          onPress={() => { selectRide(ride.id); onClose(); }} style={[styles.saved, { backgroundColor: ride.id === trip.id ? theme.backgroundSelected : theme.backgroundElement }]}>
          <View style={{ flex: 1, gap: 6 }}><ThemedText type="label">{ride.name}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{ride.ridePlan?.origin ?? 'Guntur'} → {ride.ridePlan?.destination ?? 'Bangalore'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{ride.stops.length} stops · {plannedClock(ride.ridePlan?.departureTime) ?? 'Departure not set'}</ThemedText></View>
          {ride.id === trip.id ? <Icon name="check" color={theme.tint} /> : <IconButton name="trash-can-outline" color={theme.textSecondary} accessibilityLabel={`Delete ride ${ride.name}`} onPress={() => Alert.alert('Delete ride?', `Remove ${ride.name} and its saved stops?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteRide(ride.id) }])} />}
        </Pressable>)}
      </ScrollView>
    </Sheet>
    {picking ? <EndpointPicker title={picking === 'origin' ? 'Start' : 'Destination'} label={endpoints[picking]} initial={pins[picking]} onClose={() => setPicking(null)} onSelect={(label, pin) => {
      setEndpoints(previous => ({ ...previous, [picking]: label })); setPins(previous => ({ ...previous, [picking]: pin })); setPicking(null); setError('');
    }} /> : null}
  </>;
}
const styles = StyleSheet.create({
  timelineRow: { flexDirection: 'row', gap: 12 }, rail: { width: 28, alignItems: 'center', paddingTop: 12 },
  node: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { width: 1, flex: 1, minHeight: 20, marginTop: 8, marginBottom: -12 },
  endpoint: { flex: 1, padding: 16, borderRadius: 20, minHeight: 76, gap: 6 },
  fields: { flexDirection: 'row', gap: 12 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20 },
});
