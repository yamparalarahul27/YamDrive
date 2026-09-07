import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { categoryMeta } from '@/lib/categories';
import type { PlaceResult } from '@/lib/places';
import type { Stop, StopCategory } from '@/lib/types';
import { Radius, Spacing } from '@/constants/theme';

/**
 * react-native-maps rasterises custom marker children on every frame while
 * `tracksViewChanges` is true, which is ruinous for scroll performance. Track
 * only long enough for the first paint to land, then stop.
 *
 * There is deliberately no "content changed" path here: callers give each
 * marker a key that includes whatever affects its appearance, so a change
 * remounts the marker and starts a fresh tracking window.
 */
function useTracksViewChanges(): boolean {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return tracks;
}

export type TripMarkerProps = {
  stop: Stop;
  /** 1-based position in the itinerary. */
  order: number;
  onPress: (stop: Stop) => void;
};

/** A stop that is already in the itinerary: category colour plus its order. */
export function TripMarker({ stop, order, onPress }: TripMarkerProps) {
  const meta = categoryMeta(stop.category);
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={2}
      onPress={() => onPress(stop)}
      accessibilityLabel={`Stop ${order}: ${stop.name}`}>
      <View style={styles.pinWrapper}>
        <View style={[styles.pin, { backgroundColor: meta.color }]}>
          <Icon name={meta.icon} size={14} color="#FFFFFF" />
          <ThemedText type="smallBold" style={styles.pinLabel}>
            {order}
          </ThemedText>
        </View>
        <View style={[styles.pinTail, { borderTopColor: meta.color }]} />
      </View>
    </Marker>
  );
}

export type PlaceMarkerProps = {
  place: PlaceResult;
  category: StopCategory;
  onPress: (place: PlaceResult) => void;
};

/** A search result not yet added to the trip: lighter, hollow styling. */
export function PlaceMarker({ place, category, onPress }: PlaceMarkerProps) {
  const meta = categoryMeta(category);
  const tracksViewChanges = useTracksViewChanges();

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={1}
      onPress={() => onPress(place)}
      accessibilityLabel={`Search result: ${place.name}`}>
      <View style={[styles.dot, { borderColor: meta.color }]}>
        <Icon name={meta.icon} size={13} color={meta.color} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    alignItems: 'center',
  },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
  },
  // Triangle pointing at the coordinate, drawn with borders.
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  dot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
});
