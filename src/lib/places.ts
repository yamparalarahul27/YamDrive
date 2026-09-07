import * as Location from 'expo-location';

import type { Coordinate } from '@/lib/types';

/**
 * Inlined into the JS bundle by Metro at build time (that is what the
 * EXPO_PUBLIC_ prefix means), so treat it as public and restrict it to the
 * Places API in the Google Cloud console. See app.config.ts.
 */
const PLACES_API_KEY = (process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '').trim();

export const hasPlacesKey = PLACES_API_KEY.length > 0;

const SEARCH_TEXT_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Only ask for the fields we render. The Places API bills by field mask, so a
 * narrower mask is both faster and cheaper.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
].join(',');

export type PlaceResult = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  /** Which backend produced this, so the UI can be honest about detail level. */
  source: 'places' | 'geocoder';
};

/** Carries Google's own message through to the UI instead of an empty list. */
export class PlacesError extends Error {
  readonly status?: string;

  constructor(message: string, status?: string) {
    super(message);
    this.name = 'PlacesError';
    this.status = status;
  }
}

type SearchOptions = {
  query: string;
  /** Bias results toward what the user is looking at. */
  center: Coordinate;
  radiusMeters: number;
  limit?: number;
  signal?: AbortSignal;
};

/** Shape of the bits of the searchText response we read. */
type SearchTextResponse = {
  places?: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
  }[];
  error?: { message?: string; status?: string };
};

async function searchViaPlaces({
  query,
  center,
  radiusMeters,
  limit = 15,
  signal,
}: SearchOptions): Promise<PlaceResult[]> {
  const response = await fetch(SEARCH_TEXT_ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: limit,
      locationBias: {
        circle: {
          center: { latitude: center.latitude, longitude: center.longitude },
          // The API rejects radii above 50 km.
          radius: Math.min(radiusMeters, 50_000),
        },
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as SearchTextResponse | null;

  if (!response.ok) {
    throw new PlacesError(
      data?.error?.message ?? `Places API returned HTTP ${response.status}.`,
      data?.error?.status,
    );
  }

  return (data?.places ?? [])
    .map((place): PlaceResult | null => {
      const latitude = place.location?.latitude;
      const longitude = place.location?.longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

      return {
        id: place.id ?? `${latitude},${longitude}`,
        name: place.displayName?.text ?? 'Unnamed place',
        address: place.formattedAddress,
        latitude,
        longitude,
        rating: place.rating,
        source: 'places',
      };
    })
    .filter((place): place is PlaceResult => place !== null);
}

/**
 * No-key fallback: the platform geocoder. It resolves place and address
 * strings to coordinates but returns no names, ratings or opening hours, so
 * results are labelled with the query itself.
 */
async function searchViaGeocoder(query: string): Promise<PlaceResult[]> {
  const matches = await Location.geocodeAsync(query);

  return matches.slice(0, 10).map((match, index) => ({
    id: `geocoder-${index}-${match.latitude},${match.longitude}`,
    name: matches.length > 1 ? `${query} (${index + 1})` : query,
    latitude: match.latitude,
    longitude: match.longitude,
    source: 'geocoder' as const,
  }));
}

/**
 * Free-text place search. Uses the Places API when a key is configured and
 * falls back to the OS geocoder otherwise, so search always does something.
 */
export async function searchPlaces(options: SearchOptions): Promise<PlaceResult[]> {
  const query = options.query.trim();
  if (query === '') return [];

  if (hasPlacesKey) {
    return searchViaPlaces({ ...options, query });
  }
  return searchViaGeocoder(query);
}

/**
 * Nearby search for a category. Needs a Places key — the OS geocoder cannot
 * answer "what is around here", only "where is this address".
 */
export async function searchNearby(options: SearchOptions): Promise<PlaceResult[]> {
  if (!hasPlacesKey) {
    throw new PlacesError(
      'Nearby search needs a Google Places API key. Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to .env and restart the dev server.',
      'MISSING_API_KEY',
    );
  }
  return searchViaPlaces(options);
}

/** Join the non-empty parts of a geocoded address into one line. */
function joinAddress(parts: (string | null | undefined)[]): string | undefined {
  const line = parts.filter((part): part is string => !!part && part.trim() !== '').join(', ');
  return line === '' ? undefined : line;
}

/**
 * Best-effort label for a point the user dropped on the map. Never throws —
 * a failed lookup just means the name field starts empty.
 */
export async function describeCoordinate(
  coordinate: Coordinate,
): Promise<{ name?: string; address?: string }> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinate);
    if (!place) return {};

    return {
      name: place.name ?? joinAddress([place.street, place.district, place.city]),
      address: joinAddress([
        place.name && place.name !== place.street ? place.name : null,
        joinAddress([place.streetNumber, place.street]),
        place.district,
        place.city,
        place.region,
        place.postalCode,
      ]),
    };
  } catch (error) {
    console.warn('[pitstop] reverse geocode failed', error);
    return {};
  }
}
