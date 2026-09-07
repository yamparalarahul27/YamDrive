import * as Location from 'expo-location';
import type { Coordinate, StopCategory } from '@/lib/types';
import { publicJson, SERVICES } from '@/lib/open-services';
import { haversineKm } from '@/lib/geo';

export type PlaceResult = Coordinate & { id: string; name: string; address?: string; rating?: number; source: 'osm' | 'geocoder' };
export class PlacesError extends Error {}
type SearchOptions = { query: string; center: Coordinate; radiusMeters: number; category?: StopCategory };
export async function searchPlaces({ query }: SearchOptions): Promise<PlaceResult[]> {
  if (!query.trim()) return [];
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Address lookup needs location permission on Android. You can still long-press the map to add stops.');
  const results = await Location.geocodeAsync(query.trim());
  return results.slice(0, 6).map((p, i) => ({ id: `address-${p.latitude}-${p.longitude}`, name: results.length > 1 ? `${query} (${i + 1})` : query,
    latitude: p.latitude, longitude: p.longitude, source: 'geocoder' as const }));
}
const FILTERS: Record<StopCategory, string[]> = {
  fuel: ['[amenity=fuel]'], food: ['[amenity~"^(restaurant|fast_food)$"]'],
  rest: ['[amenity=cafe]', '[highway~"^(rest_area|services)$"]'],
  stay: ['[tourism~"^(hotel|motel|guest_house)$"]'], sight: ['[tourism=attraction]'], other: ['[amenity=cafe]'],
};
export async function searchNearby({ center, radiusMeters, category = 'fuel' }: SearchOptions): Promise<PlaceResult[]> {
  const radius = Math.min(5000, Math.max(500, Math.round(radiusMeters)));
  const area = `(around:${radius},${center.latitude.toFixed(5)},${center.longitude.toFixed(5)})`;
  const query = `[out:json][timeout:25];(${FILTERS[category].map(f => `nwr${f}${area};`).join('')});out center tags 60;`;
  const result = await publicJson<{ elements?: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]; remark?: string }>(
    SERVICES.places, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` });
  if (result.remark || !Array.isArray(result.elements)) throw new Error('Place search is temporarily unavailable. Try again later.');
  return result.elements.map(p => ({ id: `${p.type}/${p.id}`, name: p.tags?.name || p.tags?.brand || `Unnamed ${category} location`,
    latitude: p.lat ?? p.center?.lat ?? NaN, longitude: p.lon ?? p.center?.lon ?? NaN,
    address: [p.tags?.['addr:street'], p.tags?.['addr:city']].filter(Boolean).join(', ') || 'OpenStreetMap · opening/access not verified', source: 'osm' as const }))
    .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .sort((a, b) => haversineKm(center, a) - haversineKm(center, b)).slice(0, 30);
}
