import { publicJson, SERVICES } from '@/lib/open-services';
import { searchPlaces } from '@/lib/places';
import { decodePolyline6, routeSignature, type RouteStep, type RoadRoute, type Position } from '@/lib/route-geometry';
import type { RidePlan } from '@/lib/ride-plan';
import type { Stop } from '@/lib/types';
export async function calculateRoute(plan: RidePlan, stops: Stop[]): Promise<RoadRoute> {
  if (stops.length > 18) throw new Error('This public routing service supports up to 18 intermediate stops. Remove stops to calculate a route.');
  const resolve = async (query: string) => {
    const matches = await searchPlaces({ query, center: { latitude: 16.3, longitude: 80.4 }, radiusMeters: 5000 });
    if (!matches.length) throw new Error(`Could not find ${query}. Use a more specific start or destination in Ride Plan.`);
    return { lat: matches[0].latitude, lon: matches[0].longitude };
  };
  const start = plan.originPin ? { lat: plan.originPin.latitude, lon: plan.originPin.longitude } : await resolve(plan.origin);
  const end = plan.destinationPin ? { lat: plan.destinationPin.latitude, lon: plan.destinationPin.longitude } : await resolve(plan.destination);
  const payload = { locations: [start, ...stops.map(s => ({ lat: s.latitude, lon: s.longitude })), end],
    costing: 'motorcycle', units: 'kilometers', language: 'en-US' };
  const response = await publicJson<{ trip?: { status: number; summary: { length: number; time: number }; legs: { shape: string; maneuvers?: { begin_shape_index: number; type: number; instruction: string }[] }[] }; error?: string }>(
    `${SERVICES.route}?json=${encodeURIComponent(JSON.stringify(payload))}`);
  const trip = response.trip;
  if (!trip || trip.status !== 0 || !trip.legs?.length) throw new Error(response.error || 'No motorcycle route found. Check the selected stops.');
  const coordinates: Position[] = [], steps: RouteStep[] = [];
  for (const leg of trip.legs) {
    const points = decodePolyline6(leg.shape), offset = Math.max(0, coordinates.length - 1);
    for (const m of leg.maneuvers ?? []) {
      if (Number.isInteger(m.begin_shape_index) && m.begin_shape_index >= 0 && m.begin_shape_index < points.length && Number.isInteger(m.type) && typeof m.instruction === 'string')
        steps.push({ index: offset + m.begin_shape_index, type: m.type, instruction: m.instruction.slice(0, 600) });
    }
    coordinates.push(...(coordinates.length ? points.slice(1) : points));
  }
  if (coordinates.length < 2 || !Number.isFinite(trip.summary.length) || trip.summary.length <= 0) throw new Error('Routing service returned an invalid route.');
  return { signature: routeSignature(plan.origin, plan.destination, stops, plan.originPin, plan.destinationPin), coordinates, steps,
    distanceKm: trip.summary.length, durationMinutes: trip.summary.time / 60, savedAt: Date.now() };
}
