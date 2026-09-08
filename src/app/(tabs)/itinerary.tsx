import { useFloatingNavigation } from '@/hooks/use-floating-navigation';
import { DEFAULT_RIDE_PLAN } from '@/lib/ride-plan';
import { routeSignature } from '@/lib/route-geometry';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryMeta } from '@/lib/categories';
import { formatDistanceKm, formatDuration } from '@/lib/geo';
import { directionsUrlTo, routeUrl } from '@/lib/navigation-links';
import { useTrip } from '@/lib/trip-store';
import type { Stop } from '@/lib/types';

export default function ItineraryScreen() {
  const dock = useFloatingNavigation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trip, removeStop, moveStop, renameTrip, clearStops } = useTrip();

  const stops = trip.stops;
  const plan = trip.ridePlan ?? DEFAULT_RIDE_PLAN;
  const roadRoute = trip.roadRoute?.signature === routeSignature(plan.origin, plan.destination, stops, plan.originPin, plan.destinationPin) ? trip.roadRoute : null;

  const [expanded, setExpanded] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(trip.name);

  const route = useMemo(() => routeUrl(stops), [stops]);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open Google Maps', 'No app on this device can handle map links.');
    });
  }, []);

  const handleOpenRoute = useCallback(() => {
    if (!route) return;

    if (route.droppedStops > 0) {
      Alert.alert(
        'Too many stops for one route',
        `Google Maps takes 9 waypoints between the start and the end. Opening the first ${route.includedStops} stops and leaving out ${route.droppedStops}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open anyway', onPress: () => openUrl(route.url) },
        ],
      );
      return;
    }
    openUrl(route.url);
  }, [route, openUrl]);

  const handleDelete = useCallback(
    (stop: Stop) => {
      Alert.alert('Remove stop', `Remove “${stop.name}” from the trip?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeStop(stop.id) },
      ]);
    },
    [removeStop],
  );

  const handleClear = useCallback(() => {
    Alert.alert('Clear the trip', `Remove all ${stops.length} stops? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: clearStops },
    ]);
  }, [stops.length, clearStops]);

  const surface = { backgroundColor: theme.surface, borderColor: theme.border };
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: dock.clearance + 16, paddingTop: insets.top + Spacing.three,
      paddingLeft: insets.left + Spacing.three, paddingRight: insets.right + Spacing.three }]}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}><ThemedText type="subtitle">Trip</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{trip.name}</ThemedText></View>
        <IconButton name="tune-variant" accessibilityLabel="Trip options" onPress={() => { setNameDraft(trip.name); setOptionsOpen(true); }} />
      </View>
      <View style={[styles.card, surface]}>
        <ThemedText type="smallBold">{plan.origin} → {plan.destination}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{stops.length} saved {stops.length === 1 ? 'stop' : 'stops'}{roadRoute ? ` · ${formatDistanceKm(roadRoute.distanceKm)}` : ''}</ThemedText>
        {roadRoute ? <ThemedText type="small" themeColor="textSecondary">{formatDuration(roadRoute.durationMinutes)} estimated · excludes breaks and traffic</ThemedText>
          : stops.length ? <ThemedText type="small" themeColor="textSecondary">Update the map route to include these stops.</ThemedText> : null}
      </View>
      {stops.length === 0 ? <View style={styles.empty}>
        <Icon name="map-marker-outline" size={40} color={theme.tint} />
        <ThemedText type="smallBold">No saved stops</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>Choose places near break pins, or hold the map to add a stop.</ThemedText>
        <Button label="Find stops" icon="map-outline" onPress={() => router.navigate('/map')} />
      </View> : <>
        <Button label="View map" icon="map-outline" onPress={() => router.navigate('/map')} />
        <ThemedText type="small" themeColor="textSecondary">Visit order · tap a stop for details</ThemedText>
        {stops.map((stop, index) => {
          const meta = categoryMeta(stop.category), open = expanded === stop.id;
          return <View key={stop.id} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 28, alignItems: 'center' }}>
              <View style={[styles.badge, { backgroundColor: theme.text }]}><ThemedText type="smallBold" style={{ color: theme.background }}>{index + 1}</ThemedText></View>
              {index < stops.length - 1 ? <View style={{ width: 1, flex: 1, minHeight: 24, backgroundColor: theme.border, marginTop: 8, marginBottom: -4 }} /> : null}
            </View>
            <View style={[styles.card, surface, { flex: 1 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1}. ${stop.name}, ${meta.label}`}
              accessibilityState={{ expanded: open }} style={styles.stopRow} onPress={() => setExpanded(open ? null : stop.id)}>
              <View style={{ flex: 1, gap: 4 }}><ThemedText type="smallBold" numberOfLines={open ? undefined : 2}>{stop.name}</ThemedText>
                <View style={styles.meta}><Icon name={meta.icon} size={16} color={meta.color} /><ThemedText type="small" themeColor="textSecondary">{meta.label}</ThemedText></View></View>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} color={theme.textSecondary} />
            </Pressable>
            {open ? <>
              {stop.address ? <ThemedText type="small" themeColor="textSecondary">{stop.address}</ThemedText> : null}
              {stop.note ? <ThemedText type="small">{stop.note}</ThemedText> : null}
              <View style={[styles.actions, { borderColor: theme.border }]}>
                <IconButton name="arrow-up" accessibilityLabel={`Move ${stop.name} earlier`} disabled={index === 0} onPress={() => moveStop(stop.id, -1)} />
                <IconButton name="arrow-down" accessibilityLabel={`Move ${stop.name} later`} disabled={index === stops.length - 1} onPress={() => moveStop(stop.id, 1)} />
                <View style={{ flex: 1 }} />
                <IconButton name="navigation-variant-outline" accessibilityLabel={`Open ${stop.name} in Google Maps`} color={theme.tint} onPress={() => openUrl(directionsUrlTo(stop))} />
                <IconButton name="trash-can-outline" accessibilityLabel={`Remove ${stop.name}`} color={theme.danger} onPress={() => handleDelete(stop)} />
              </View>
            </> : null}
          </View></View>;
        })}
      </>}
    </ScrollView>
    <Sheet visible={optionsOpen} title="Trip options" onClose={() => setOptionsOpen(false)}>
      <TextField label="Trip name" value={nameDraft} onChangeText={setNameDraft} maxLength={100} autoCapitalize="sentences" />
      <Button label="Save name" icon="check" disabled={!nameDraft.trim()} onPress={() => { renameTrip(nameDraft.trim()); setOptionsOpen(false); }} />
      {stops.length > 0 ? <>
        <Button label="Open saved stops in Google Maps" icon="navigation-variant" variant="secondary" disabled={!route} onPress={handleOpenRoute} />
        <ThemedText type="small" themeColor="textSecondary">{route ? 'Saved stops only; trip endpoints are not included.' : 'Add a second saved stop to open a route.'}</ThemedText>
        <Button label="Clear stops" icon="trash-can-outline" variant="danger" onPress={handleClear} />
      </> : null}
    </Sheet>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32, paddingHorizontal: 20 },
  stopRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 12 },
  badge: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
});
