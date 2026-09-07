import { useFloatingNavigation } from '@/hooks/use-floating-navigation';
import { useState } from 'react';
import { RideLibrarySheet } from '@/components/ride-library-sheet';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/components/brand';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/lib/trip-store';
import { DEFAULT_RIDE_PLAN } from '@/lib/ride-plan';
import { PRE_RIDE_CHECKS, plannedClock } from '@/lib/ride-preparation';
import { routeSignature } from '@/lib/route-geometry';
import { formatDistanceKm } from '@/lib/geo';

export default function HomeScreen() {
  const dock = useFloatingNavigation();
  const router = useRouter(), theme = useTheme(), insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ VehicleSerif: require('../../../assets/fonts/LibreBaskerville-Semibold.ttf') });
  const { width, height } = useWindowDimensions();
  const { trip, trips, hydrated, storageError } = useTrip();
  const [rideSheet, setRideSheet] = useState<'new' | 'saved' | null>(null);
  const plan = trip.ridePlan ?? DEFAULT_RIDE_PLAN;
  const route = trip.roadRoute?.signature === routeSignature(plan.origin, plan.destination, trip.stops, plan.originPin, plan.destinationPin) ? trip.roadRoute : null;
  const landscape = width > height;
  const columnWidth = (width - insets.left - insets.right - 32 - (landscape ? 20 : 0)) / (landscape ? 2 : 1);
  const imageWidth = Math.max(100, columnWidth - 32);
  return <><ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: dock.clearance + 16, gap: 20 }}>
    <View style={styles.header}><Brand /><View style={{ flexDirection: 'row', gap: 8 }}><IconButton name="plus" accessibilityLabel="New ride" disabled={!hydrated} onPress={() => setRideSheet('new')} /><IconButton name="tune-variant" accessibilityLabel="Ride settings" onPress={() => router.navigate('/plan')} /></View></View>
    {storageError ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{storageError}</ThemedText> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Your saved rides" disabled={!hydrated} onPress={() => setRideSheet('saved')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 }}><Icon name="routes" color={theme.tint} /><ThemedText type="label" style={{ flex: 1 }}>{trip.name}</ThemedText><ThemedText type="caption" themeColor="textSecondary">{trips.length} {trips.length === 1 ? 'ride' : 'rides'}</ThemedText><Icon name="chevron-down" color={theme.textSecondary} /></Pressable>
    <View style={[styles.body, landscape && { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[styles.vehicle, { width: columnWidth }]}>
        <ThemedText type="caption" style={styles.eyebrow}>YOUR MOTORCYCLE</ThemedText>
        <Text style={[styles.vehicleTitle, fontsLoaded && { fontFamily: 'VehicleSerif' }]}>Royal Enfield{ '\n' }Hunter 350</Text>
        <ThemedText type="caption" style={{ color: '#636760', textAlign: 'center' }}>2022 · 20,000 km reported</ThemedText>
        <Image source={require('../../../assets/images/hunter-350.webp')} accessibilityLabel="Royal Enfield Hunter 350 reference illustration in red" resizeMode="contain" style={{ width: imageWidth, height: imageWidth / 1.5, marginTop: 20 }} />
        <ThemedText type="caption" style={{ color: '#636760', textAlign: 'center', marginTop: 4 }}>Vehicle illustration</ThemedText>
      </View>
      <View style={[styles.details, { width: columnWidth }]}>
        <View style={styles.tiles}>
          <Pressable accessibilityRole="button" accessibilityLabel="Departure, open ride plan" onPress={() => router.navigate('/plan')} style={[styles.tile, { backgroundColor: theme.departure }]}>
            <Icon name="clock" size={24} color={theme.onFeature} />
            <ThemedText type="label" style={{ color: theme.onFeature }}>Departure</ThemedText>
            <ThemedText type="metric" style={{ color: theme.onFeature }}>{hydrated ? plannedClock(plan.departureTime) ?? 'Set time' : 'Loading…'}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.onFeature }}>India · IST</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ride checks, open ride plan" onPress={() => router.navigate('/plan')} style={[styles.tile, { backgroundColor: theme.rest }]}>
            <Icon name="checklist" size={24} color={theme.text} />
            <ThemedText type="label">Ride checks</ThemedText>
            <ThemedText type="metric">{hydrated ? `${plan.preRideChecks?.length ?? 0} / ${PRE_RIDE_CHECKS.length}` : 'Loading…'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">Checked for this plan</ThemedText>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { gap: 20 },
  vehicle: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, paddingTop: 24, overflow: 'hidden' },
  eyebrow: { color: '#636760', textAlign: 'center', letterSpacing: 1.6, marginBottom: 12 },
  vehicleTitle: { fontFamily: Fonts.serif, fontWeight: 'normal', fontSize: 28, lineHeight: 34, textAlign: 'center', color: '#242523', marginBottom: 8 },
  details: { gap: 16 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minWidth: 0, padding: 16, borderRadius: 20, gap: 8 },
  trip: { padding: 20, borderRadius: 24, gap: 12 },
});
