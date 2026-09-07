import type { Coordinate, Stop } from '@/lib/types';

/**
 * The Google Maps URL API accepts at most 9 intermediate waypoints, on top of
 * an origin and a destination.
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export const MAX_WAYPOINTS = 9;

const MAPS_DIR_URL = 'https://www.google.com/maps/dir/';

const asPair = ({ latitude, longitude }: Coordinate) => `${latitude},${longitude}`;

/**
 * Built by hand rather than with URLSearchParams: React Native's URL polyfill
 * is only partially implemented, and the escaping here is simple enough.
 */
function buildUrl(params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${MAPS_DIR_URL}?${query}`;
}

/** Driving directions to a single point. */
export function directionsUrlTo(destination: Coordinate): string {
  return buildUrl({
    api: '1',
    destination: asPair(destination),
    travelmode: 'driving',
  });
}

export type RouteLink = {
  url: string;
  /** How many stops the link actually covers, after the waypoint cap. */
  includedStops: number;
  /** Stops dropped because Google Maps would reject them. */
  droppedStops: number;
};

/**
 * A driving route through the trip, in order. Returns null for fewer than two
 * stops, since there is no route to open.
 */
export function routeUrl(stops: Stop[]): RouteLink | null {
  if (stops.length < 2) return null;

  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const middle = stops.slice(1, -1);
  const waypoints = middle.slice(0, MAX_WAYPOINTS);

  const params: Record<string, string> = {
    api: '1',
    origin: asPair(origin),
    destination: asPair(destination),
    travelmode: 'driving',
  };
  if (waypoints.length > 0) {
    params.waypoints = waypoints.map(asPair).join('|');
  }

  return {
    url: buildUrl(params),
    includedStops: waypoints.length + 2,
    droppedStops: middle.length - waypoints.length,
  };
}
