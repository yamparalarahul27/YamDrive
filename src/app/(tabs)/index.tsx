import { useFloatingNavigation } from '@/hooks/use-floating-navigation';
import { useState } from 'react';
import { RideLibrarySheet } from '@/components/ride-library-sheet';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { energyEstimate, serviceDue } from '@/lib/vehicle-dashboard';
import { useTheme } from '@/hooks/use-theme';
import { useVehicle } from '@/lib/vehicle-store';
import { useTrip } from '@/lib/trip-store';
import { DEFAULT_RIDE_PLAN } from '@/lib/ride-plan';
import { PRE_RIDE_CHECKS, plannedClock } from '@/lib/ride-preparation';
import { routeSignature } from '@/lib/route-geometry';
import { formatDistanceKm } from '@/lib/geo';

export default function HomeScreen() {
  const { vehicle, ready } = useVehicle();
  const energy = ready ? energyEstimate(vehicle) : null;
  const service = ready ? serviceDue(vehicle, new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) : null;
  const dock = useFloatingNavigation();
  const router = useRouter(), theme = useTheme(), insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { trip, hydrated, storageError } = useTrip();
  const [rideSheet, setRideSheet] = useState<'new' | 'saved' | null>(null);
  const plan = trip.ridePlan ?? DEFAULT_RIDE_PLAN;
  const route = trip.roadRoute?.signature === routeSignature(plan.origin, plan.destination, trip.stops, plan.originPin, plan.destinationPin) ? trip.roadRoute : null;
  const landscape = width > height;
  const columnWidth = (width - insets.left - insets.right - 32 - (landscape ? 20 : 0)) / (landscape ? 2 : 1);
  const imageWidth = Math.max(100, columnWidth - 8);
  return <><ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: dock.clearance + 16, gap: 20 }}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Your saved rides, current ride ${trip.name}`} disabled={!hydrated}
        onPress={() => setRideSheet('saved')} style={styles.rideSelector}>
        <Icon name="routes" color={theme.tint} />
        <ThemedText type="label" numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>{trip.name}</ThemedText>
        <Icon name="chevron-down" color={theme.textSecondary} />
      </Pressable>
      <View style={styles.headerActions}>
        <IconButton name="plus" accessibilityLabel="New ride" disabled={!hydrated} onPress={() => setRideSheet('new')} />
        <IconButton name="tune-variant" accessibilityLabel="Ride settings" onPress={() => router.navigate('/plan')} />
      </View>
    </View>
    {storageError ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{storageError}</ThemedText> : null}
    <View style={[styles.body, landscape && { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[styles.vehicle, { width: columnWidth }]}>
        <ThemedText type="caption" style={{ color: '#636760', textAlign: 'center' }}>ESTIMATED RANGE</ThemedText>
        <ThemedText style={{ color: '#242523', fontSize: energy ? 48 : 24, lineHeight: 58, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{energy ? `~${energy.rangeKm} km` : 'Range unavailable'}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Open vehicle info" onPress={() => router.push('/vehicle')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <Image source={require('../../../assets/images/vehicles/hunter-350-2022-rebel-red-three-quarter.png')} accessible={false} resizeMode="contain" style={{ width: imageWidth, height: imageWidth / 1.35, marginTop: 8 }} />
        </Pressable>
      </View>
      <View style={[styles.details, { width: columnWidth }]}>
        <View style={styles.tiles}>
          <Pressable accessibilityRole="button" accessibilityLabel="Energy, open fuel details" onPress={() => router.push('/vehicle?section=energy')} style={[styles.tile, { backgroundColor: theme.fuel }]}>
            <Icon name="gas-station" size={24} color={theme.text} /><ThemedText type="label">Energy</ThemedText>
            <ThemedText type="metric">{energy ? `~${energy.litres.toFixed(1)} L` : 'Set up'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{energy ? 'Estimated fuel' : 'Fuel & capacity'}</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Departure, open ride plan" onPress={() => router.navigate('/plan')} style={[styles.tile, { backgroundColor: theme.departure }]}>
            <Icon name="clock" size={24} color={theme.onFeature} />
            <ThemedText type="label" style={{ color: theme.onFeature }}>Departure</ThemedText>
            <ThemedText type="metric" style={{ color: theme.onFeature }}>{hydrated ? plannedClock(plan.departureTime) ?? 'Set time' : 'Loading…'}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.onFeature }}>India · IST</ThemedText>
          </Pressable>
        </View>
        <View style={styles.tiles}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ride checks, open ride plan" onPress={() => router.navigate('/plan')} style={[styles.tile, { backgroundColor: theme.rest }]}>
            <Icon name="checklist" size={24} color={theme.text} />
            <ThemedText type="label">Ride checks</ThemedText>
            <ThemedText type="metric">{hydrated ? `${plan.preRideChecks?.length ?? 0} / ${PRE_RIDE_CHECKS.length}` : 'Loading…'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Checked for this plan</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Vehicle health, open service reminders" onPress={() => router.push('/vehicle?section=health')} style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="tune-variant" size={24} color={theme.text} /><ThemedText type="label">Vehicle health</ThemedText>
            <ThemedText type="metric">{service?.due ? 'Service due' : service?.kmLeft !== null && service?.kmLeft !== undefined ? `${service.kmLeft.toLocaleString('en-IN')} km` : service?.daysLeft !== null && service?.daysLeft !== undefined ? `${service.daysLeft} days` : 'Set up'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">{service ? service.date ? `By ${service.date} or km due` : 'Until next service' : 'Service reminders'}</ThemedText>
          </Pressable>
        </View>
        <View style={[styles.trip, { backgroundColor: theme.surface }]}>
          <ThemedText type="caption" themeColor="textSecondary">YOUR NEXT RIDE</ThemedText>
          <ThemedText style={{ fontSize: 20, lineHeight: 28, fontWeight: '500' }}>{plan.origin} → {plan.destination}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{hydrated ? `${formatDistanceKm(route?.distanceKm ?? plan.distanceKm)} · ${route ? 'road route' : 'planning estimate'}` : 'Loading trip…'}</ThemedText>
          <Button label="Open map" icon="navigation-variant" onPress={() => router.navigate('/map')} />
        </View>
      </View>
    </View>
  </ScrollView>{rideSheet ? <RideLibrarySheet key={rideSheet} mode={rideSheet} onClose={() => setRideSheet(null)} onNew={() => setRideSheet('new')} /> : null}</>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideSelector: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', flexShrink: 0, gap: 8 },
  body: { gap: 20 },
  vehicle: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 4, paddingTop: 24, overflow: 'hidden' },
  details: { gap: 16 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minWidth: 0, padding: 16, borderRadius: 20, gap: 8 },
  trip: { padding: 20, borderRadius: 24, gap: 12 },
});
