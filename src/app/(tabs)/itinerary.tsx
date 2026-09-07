import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { categoryMeta } from '@/lib/categories';
import {
  AVERAGE_SPEED_KPH,
  estimatedDriveMinutes,
  estimatedRoadKm,
  formatDistanceKm,
  formatDuration,
  legDistancesKm,
  totalStraightLineKm,
} from '@/lib/geo';
import { directionsUrlTo, routeUrl } from '@/lib/navigation-links';
import { useTrip } from '@/lib/trip-store';
import type { Stop } from '@/lib/types';

export default function ItineraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trip, removeStop, moveStop, renameTrip, clearStops } = useTrip();

  const stops = trip.stops;

  const totals = useMemo(() => {
    const straightLineKm = totalStraightLineKm(stops);
    const roadKm = estimatedRoadKm(straightLineKm);
    return {
      legs: legDistancesKm(stops),
      roadKm,
      driveMinutes: estimatedDriveMinutes(roadKm),
    };
  }, [stops]);

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

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.three, paddingBottom: Spacing.five },
      ]}>
      <TextField
        label="Trip"
        value={trip.name}
        onChangeText={renameTrip}
        placeholder="Weekend to Coorg"
        autoCapitalize="sentences"
      />

      {stops.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border }]}>
          <Icon name="routes" size={40} color={theme.textSecondary} />
          <ThemedText type="smallBold">No stops yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
            Long-press anywhere on the map to drop a stop, or use the Fuel, Food and Stay
            buttons to search around where you are looking.
          </ThemedText>
          <Button label="Open the map" icon="map-outline" onPress={() => router.navigate('/')} />
        </View>
      ) : (
        <>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <View style={styles.summaryRow}>
              <Summary label="Stops" value={String(stops.length)} />
              <Summary label="Distance" value={formatDistanceKm(totals.roadKm)} />
              <Summary label="Driving" value={formatDuration(totals.driveMinutes)} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Estimates only: straight-line distance plus 25% for road winding, at{' '}
              {AVERAGE_SPEED_KPH} km/h and excluding time spent at stops. Open the route in
              Google Maps for real numbers.
            </ThemedText>
          </View>

          <View style={styles.list}>
            {stops.map((stop, index) => {
              const meta = categoryMeta(stop.category);
              const isFirst = index === 0;
              const isLast = index === stops.length - 1;

              return (
                <View
                  key={stop.id}
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  {!isFirst ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.legLabel}>
                      {formatDistanceKm(estimatedRoadKm(totals.legs[index]))} from stop {index}
                    </ThemedText>
                  ) : null}

                  <View style={styles.cardRow}>
                    <View style={[styles.badge, { backgroundColor: meta.color }]}>
                      <ThemedText type="smallBold" style={styles.badgeText}>
                        {index + 1}
                      </ThemedText>
                    </View>

                    <View style={styles.cardText}>
                      <ThemedText type="smallBold">{stop.name}</ThemedText>
                      <View style={styles.metaRow}>
                        <Icon name={meta.icon} size={13} color={meta.color} />
                        <ThemedText type="small" themeColor="textSecondary">
                          {meta.label}
                        </ThemedText>
                      </View>
                      {stop.address ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          {stop.address}
                        </ThemedText>
                      ) : null}
                      {stop.note ? (
                        <ThemedText type="small" style={{ color: theme.tint }}>
                          {stop.note}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.actions, { borderTopColor: theme.border }]}>
                    <IconButton
                      name="arrow-up"
                      accessibilityLabel={`Move ${stop.name} earlier`}
                      onPress={() => moveStop(stop.id, -1)}
                      disabled={isFirst}
                      size={20}
                    />
                    <IconButton
                      name="arrow-down"
                      accessibilityLabel={`Move ${stop.name} later`}
                      onPress={() => moveStop(stop.id, 1)}
                      disabled={isLast}
                      size={20}
                    />
                    <View style={styles.spacer} />
                    <IconButton
                      name="navigation-variant-outline"
                      accessibilityLabel={`Navigate to ${stop.name}`}
                      onPress={() => openUrl(directionsUrlTo(stop))}
                      color={theme.tint}
                      size={20}
                    />
                    <IconButton
                      name="trash-can-outline"
                      accessibilityLabel={`Remove ${stop.name}`}
                      onPress={() => handleDelete(stop)}
                      color={theme.danger}
                      size={20}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button
              label="Open route in Google Maps"
              icon="navigation-variant"
              onPress={handleOpenRoute}
              disabled={route === null}
              stretch
            />
            {route === null ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
                Add a second stop to get a route.
              </ThemedText>
            ) : null}
            <Button
              label="Clear all stops"
              icon="delete-outline"
              variant="danger"
              onPress={handleClear}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.summaryValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  summaryCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  summaryItem: {
    flex: 1,
    gap: 1,
  },
  summaryValue: {
    fontSize: 17,
    lineHeight: 22,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  legLabel: {
    paddingHorizontal: Spacing.one,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  badge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  badgeText: {
    color: '#FFFFFF',
  },
  cardText: {
    flex: 1,
    gap: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    gap: Spacing.two,
  },
});
