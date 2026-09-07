import type { Coordinate } from '@/lib/types';

/** Mean Earth radius, km (IUGG). */
const EARTH_RADIUS_KM = 6371.0088;

/**
 * Straight-line distances underestimate driving distance. This multiplier is a
 * rough correction for road winding; it is not a routing result. Swap the
 * estimate helpers for the Google Directions API when you need real numbers.
 */
export const ROAD_WINDING_FACTOR = 1.25;

/** Assumed average moving speed for the drive-time estimate, km/h. */
export const AVERAGE_SPEED_KPH = 45;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const latA = toRadians(a.latitude);
  const latB = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance from each stop to the one before it. Same length as `stops`, with
 * index 0 always 0 so it can be indexed alongside the list while rendering.
 */
export function legDistancesKm(stops: Coordinate[]): number[] {
  return stops.map((stop, index) => (index === 0 ? 0 : haversineKm(stops[index - 1], stop)));
}

/** Sum of the straight-line legs, in kilometres. */
export function totalStraightLineKm(stops: Coordinate[]): number {
  return legDistancesKm(stops).reduce((sum, leg) => sum + leg, 0);
}

/** Straight-line kilometres nudged upward to approximate road distance. */
export function estimatedRoadKm(straightLineKm: number): number {
  return straightLineKm * ROAD_WINDING_FACTOR;
}

/** Rough moving time for a road distance, in minutes. Excludes stop time. */
export function estimatedDriveMinutes(roadKm: number, speedKph = AVERAGE_SPEED_KPH): number {
  if (speedKph <= 0) return 0;
  return (roadKm / speedKph) * 60;
}

/** Group thousands with commas without depending on Intl being present. */
function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${groupThousands(Math.round(km))} km`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/**
 * Strip everything but latitude/longitude.
 *
 * `Stop` and place results are structurally valid coordinates, but they carry
 * ids, names and notes. react-native-maps forwards coordinate arrays straight
 * to its native commands without normalising them, so hand it clean objects.
 */
export function coordinatesOf(points: Coordinate[]): Coordinate[] {
  return points.map(({ latitude, longitude }) => ({ latitude, longitude }));
}

export type MapRegion = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

/** Fallback view when we have no stops and no location fix yet. */
export const DEFAULT_REGION: MapRegion = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 24,
  longitudeDelta: 24,
};

const MIN_DELTA = 0.02;

/**
 * Smallest region containing every coordinate, plus breathing room.
 *
 * Does not handle routes that cross the antimeridian — the resulting region
 * would span the globe. Fine for road trips, not for Pacific crossings.
 */
export function regionForCoordinates(
  coordinates: Coordinate[],
  paddingFactor = 1.4,
): MapRegion | null {
  if (coordinates.length === 0) return null;

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;

  for (const { latitude, longitude } of coordinates) {
    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
    minLon = Math.min(minLon, longitude);
    maxLon = Math.max(maxLon, longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * paddingFactor, MIN_DELTA),
    longitudeDelta: Math.max((maxLon - minLon) * paddingFactor, MIN_DELTA),
  };
}

/**
 * Region centred on a point at roughly neighbourhood zoom. Fields are copied
 * explicitly rather than spread: callers pass Stops and place results, whose
 * extra keys must not leak through to the native map.
 */
export function regionAround(coordinate: Coordinate, delta = 0.05): MapRegion {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Approximate radius, in metres, of the visible region — for search bias. */
export function regionRadiusMeters(region: MapRegion): number {
  const halfHeightKm = haversineKm(
    { latitude: region.latitude - region.latitudeDelta / 2, longitude: region.longitude },
    { latitude: region.latitude + region.latitudeDelta / 2, longitude: region.longitude },
  );
  return Math.max(1000, Math.round((halfHeightKm / 2) * 1000));
}
