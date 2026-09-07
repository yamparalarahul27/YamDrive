import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  PROVIDER_GOOGLE,
  Polyline,
  type LongPressEvent,
  type PoiClickEvent,
  type Region,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddStopSheet, type StopDraft } from '@/components/add-stop-sheet';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PlaceMarker, TripMarker } from '@/components/map-markers';
import { ResultsSheet } from '@/components/results-sheet';
import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { NEARBY_CATEGORIES, categoryMeta } from '@/lib/categories';
import {
  DEFAULT_REGION,
  coordinatesOf,
  estimatedRoadKm,
  formatDistanceKm,
  regionAround,
  regionRadiusMeters,
  totalStraightLineKm,
  type MapRegion,
} from '@/lib/geo';
import {
  PlacesError,
  describeCoordinate,
  searchNearby,
  searchPlaces,
  type PlaceResult,
} from '@/lib/places';
import { useTrip, type NewStop } from '@/lib/trip-store';
import type { Coordinate, Stop, StopCategory } from '@/lib/types';

/** Whether the native Maps SDK key made it into this build. */
const hasMapsKey =
  (Constants.expoConfig?.android?.config?.googleMaps?.apiKey ?? '').trim().length > 0;

type SearchState = {
  title: string;
  /** Category results are filed under when added. */
  category: StopCategory;
  /** Where the search was centred — result distances are measured from here. */
  origin: Coordinate;
  loading: boolean;
  error: string | null;
  results: PlaceResult[];
};

const FIT_PADDING = { top: 140, right: 70, bottom: 220, left: 70 };

/** Roughly the length of the Modal slide-out animation. */
const SHEET_DISMISS_MS = 260;

export default function MapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trip, hydrated, addStop, updateStop } = useTrip();

  const mapRef = useRef<MapView | null>(null);
  /** Latest visible region, kept in a ref so panning does not re-render. */
  const regionRef = useRef<MapRegion>(DEFAULT_REGION);
  /** The camera is only auto-positioned once, so we never fight the user. */
  const positionedRef = useRef(false);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [mapsKeyNoticeVisible, setMapsKeyNoticeVisible] = useState(!hasMapsKey);
  const [draft, setDraft] = useState<StopDraft | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Pending deferred sheet hand-off; see handleAddPlace. */
  const openDraftTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(openDraftTimer.current), []);

  const stops = trip.stops;

  /** Plain lat/lng pairs for the native map commands. */
  const routeCoordinates = useMemo(() => coordinatesOf(stops), [stops]);

  const summary = useMemo(() => {
    const straightLineKm = totalStraightLineKm(stops);
    return {
      count: stops.length,
      distanceLabel: formatDistanceKm(estimatedRoadKm(straightLineKm)),
    };
  }, [stops]);

  // --- Location bootstrap -------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationNotice(
          'Location permission was declined, so the map cannot centre on you. Everything else still works.',
        );
        return;
      }

      // Show the cached fix straight away, then refine it.
      const last = await Location.getLastKnownPositionAsync();
      if (!cancelled && last) {
        setUserLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setUserLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }
    };

    run().catch((error: unknown) => {
      if (cancelled) return;
      console.warn('[pitstop] location lookup failed', error);
      setLocationNotice('Could not get a location fix. Check that location services are on.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Position the camera once: on the saved route if there is one, else on the user.
  useEffect(() => {
    if (!hydrated || positionedRef.current) return;
    const map = mapRef.current;
    if (!map) return;

    if (stops.length >= 2) {
      positionedRef.current = true;
      map.fitToCoordinates(routeCoordinates, { edgePadding: FIT_PADDING, animated: false });
      return;
    }

    const focus = stops.length === 1 ? stops[0] : userLocation;
    if (focus) {
      positionedRef.current = true;
      map.animateToRegion(regionAround(focus), 500);
    }
  }, [hydrated, stops, routeCoordinates, userLocation]);

  // --- Camera actions -----------------------------------------------------

  const recenterOnUser = useCallback(() => {
    if (!userLocation) return;
    positionedRef.current = true;
    mapRef.current?.animateToRegion(regionAround(userLocation), 400);
  }, [userLocation]);

  const fitToTrip = useCallback(() => {
    if (stops.length === 0) return;
    positionedRef.current = true;

    if (stops.length === 1) {
      mapRef.current?.animateToRegion(regionAround(stops[0]), 400);
      return;
    }
    mapRef.current?.fitToCoordinates(routeCoordinates, {
      edgePadding: FIT_PADDING,
      animated: true,
    });
  }, [stops, routeCoordinates]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    regionRef.current = region;
  }, []);

  // --- Picking points -----------------------------------------------------

  const handleLongPress = useCallback(async (event: LongPressEvent) => {
    const { coordinate } = event.nativeEvent;

    // Resolve the address before opening, so the name field is not re-seeded
    // underneath someone who has already started typing.
    setBusy(true);
    const described = await describeCoordinate(coordinate);
    setBusy(false);

    setDraft({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      name: described.name ?? '',
      address: described.address,
      category: 'fuel',
    });
  }, []);

  const handlePoiClick = useCallback((event: PoiClickEvent) => {
    const { coordinate, name } = event.nativeEvent;
    setDraft({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      // Google returns multi-line POI names; the first line is the place.
      name: name.split('\n')[0],
      category: 'other',
    });
  }, []);

  const handleDraftChange = useCallback((changes: Partial<StopDraft>) => {
    setDraft((previous) => (previous === null ? previous : { ...previous, ...changes }));
  }, []);

  const handleCloseDraft = useCallback(() => setDraft(null), []);

  const handleStopPress = useCallback((stop: Stop) => {
    setDraft({
      latitude: stop.latitude,
      longitude: stop.longitude,
      name: stop.name,
      address: stop.address,
      note: stop.note,
      category: stop.category,
      editingId: stop.id,
    });
  }, []);

  const handleSubmitStop = useCallback(
    (stop: NewStop, editingId?: string) => {
      if (editingId !== undefined) {
        updateStop(editingId, stop);
      } else {
        addStop(stop);
      }
      setDraft(null);
    },
    [addStop, updateStop],
  );

  // --- Search -------------------------------------------------------------

  const runSearch = useCallback(
    async (options: { title: string; category: StopCategory; queryText: string; nearby: boolean }) => {
      const origin: Coordinate = {
        latitude: regionRef.current.latitude,
        longitude: regionRef.current.longitude,
      };
      const radiusMeters = regionRadiusMeters(regionRef.current);

      setSearch({
        title: options.title,
        category: options.category,
        origin,
        loading: true,
        error: null,
        results: [],
      });
      setResultsVisible(true);

      try {
        const runner = options.nearby ? searchNearby : searchPlaces;
        const results = await runner({
          query: options.queryText,
          center: origin,
          radiusMeters,
        });
        setSearch((previous) =>
          previous === null ? previous : { ...previous, loading: false, results },
        );
      } catch (error: unknown) {
        const message =
          error instanceof PlacesError
            ? error.message
            : 'Search failed. Check your connection and try again.';
        setSearch((previous) =>
          previous === null ? previous : { ...previous, loading: false, error: message },
        );
      }
    },
    [],
  );

  const handleNearby = useCallback(
    (category: StopCategory) => {
      const meta = categoryMeta(category);
      void runSearch({
        title: `${meta.label} nearby`,
        category,
        queryText: meta.nearbyQuery,
        nearby: true,
      });
    },
    [runSearch],
  );

  const handleSearchSubmit = useCallback(() => {
    const text = query.trim();
    if (text === '') return;
    void runSearch({ title: `“${text}”`, category: 'other', queryText: text, nearby: false });
  }, [query, runSearch]);

  const handleFocusPlace = useCallback((place: PlaceResult) => {
    setResultsVisible(false);
    mapRef.current?.animateToRegion(regionAround(place, 0.01), 400);
  }, []);

  const handleAddPlace = useCallback(
    (place: PlaceResult) => {
      // Two Modals in flight at once is glitchy on Android, so dismiss the
      // results sheet and only then open the add-stop sheet.
      setResultsVisible(false);
      const category = search?.category ?? 'other';

      clearTimeout(openDraftTimer.current);
      openDraftTimer.current = setTimeout(() => {
        setDraft({
          latitude: place.latitude,
          longitude: place.longitude,
          name: place.name,
          address: place.address,
          category,
        });
      }, SHEET_DISMISS_MS);
    },
    [search],
  );

  /** Tapping the map clears the search pins — the only way to dismiss them. */
  const handleMapPress = useCallback(() => {
    setSearch(null);
  }, []);

  const previewResults = search?.results ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        onLongPress={handleLongPress}
        onPoiClick={handlePoiClick}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        // Leave room for the tab bar and the summary card.
        mapPadding={{ top: 0, right: 0, bottom: 88, left: 0 }}>
        {stops.length >= 2 ? (
          <Polyline coordinates={routeCoordinates} strokeColor={theme.tint} strokeWidth={4} />
        ) : null}

        {stops.map((stop, index) => (
          <TripMarker
            // Appearance depends on category and order; changing either must
            // remount the marker so its bitmap is re-rasterised.
            key={`${stop.id}-${stop.category}-${index}`}
            stop={stop}
            order={index + 1}
            onPress={handleStopPress}
          />
        ))}

        {previewResults.map((place) => (
          <PlaceMarker
            key={`${place.id}-${search?.category ?? 'other'}`}
            place={place}
            category={search?.category ?? 'other'}
            onPress={handleAddPlace}
          />
        ))}
      </MapView>

      {/* Search + one-tap category searches */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        <View
          style={[
            styles.searchRow,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          <Icon name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search a place, town or address"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            accessibilityLabel="Search for a place"
            style={[styles.searchInput, { color: theme.text }]}
          />
          {busy ? <ActivityIndicator size="small" color={theme.tint} /> : null}
          {query !== '' && !busy ? (
            <IconButton
              name="close"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              size={18}
              style={styles.clearButton}
            />
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {NEARBY_CATEGORIES.map((category) => {
            const meta = categoryMeta(category);
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityLabel={`Find ${meta.label} near the map centre`}
                onPress={() => handleNearby(category)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Icon name={meta.icon} size={15} color={meta.color} />
                <ThemedText type="small">{meta.label}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {mapsKeyNoticeVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss the missing Maps key warning"
            onPress={() => setMapsKeyNoticeVisible(false)}
            style={[styles.notice, { backgroundColor: theme.background, borderColor: theme.danger }]}>
            <Icon name="key-outline" size={16} color={theme.danger} />
            <ThemedText type="small" style={styles.noticeText}>
              No Google Maps key in this build, so the map may render blank. See mobile/README.md.
            </ThemedText>
          </Pressable>
        ) : locationNotice ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss the location warning"
            onPress={() => setLocationNotice(null)}
            style={[styles.notice, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Icon name="information-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={styles.noticeText}>
              {locationNotice}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Camera controls */}
      <View style={styles.fabColumn}>
        <IconButton
          name="crosshairs-gps"
          accessibilityLabel="Centre on my location"
          onPress={recenterOnUser}
          disabled={userLocation === null}
          color={theme.tint}
          elevated
        />
        <IconButton
          name="arrow-expand-all"
          accessibilityLabel="Zoom to fit the whole trip"
          onPress={fitToTrip}
          disabled={stops.length === 0}
          color={theme.tint}
          elevated
        />
      </View>

      {/* Trip summary / hint */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          summary.count === 0 ? 'How to add stops' : 'Open the trip itinerary'
        }
        onPress={() => router.navigate('/itinerary')}
        style={[
          styles.summary,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}>
        <Icon
          name={summary.count === 0 ? 'gesture-tap-hold' : 'routes'}
          size={20}
          color={theme.tint}
        />
        <View style={styles.summaryText}>
          {summary.count === 0 ? (
            <>
              <ThemedText type="smallBold">Long-press the map to drop a stop</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Or tap Fuel above to find petrol nearby
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="smallBold">
                {summary.count} {summary.count === 1 ? 'stop' : 'stops'} · ~{summary.distanceLabel}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap to open the itinerary
              </ThemedText>
            </>
          )}
        </View>
        <Icon name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <AddStopSheet
        draft={draft}
        onChange={handleDraftChange}
        onClose={handleCloseDraft}
        onSubmit={handleSubmitStop}
      />

      {search ? (
        <ResultsSheet
          visible={resultsVisible}
          onClose={() => setResultsVisible(false)}
          title={search.title}
          loading={search.loading}
          error={search.error}
          results={search.results}
          category={search.category}
          origin={search.origin}
          onAdd={handleAddPlace}
          onFocus={handleFocusPlace}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: MinTouchSize + 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
  },
  chipRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  noticeText: {
    flex: 1,
  },
  fabColumn: {
    position: 'absolute',
    right: Spacing.three,
    bottom: 108,
    gap: Spacing.two,
  },
  summary: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    paddingRight: Spacing.one,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
  },
  summaryText: {
    flex: 1,
  },
});
