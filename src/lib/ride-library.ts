import { parseRoadRoute } from './route-geometry.ts';
import { parseRidePlan } from './ride-plan.ts';
import { isStopCategory } from './types.ts';
import type { Stop, Trip } from './types';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Validate one persisted stop. Returns null for anything unusable so a single
 * corrupt entry cannot take the whole trip down with it.
 */
function parseStop(value: unknown): Stop | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.id !== 'string' || raw.id === '') return null;
  if (!isFiniteNumber(raw.latitude) || !isFiniteNumber(raw.longitude)) return null;
  if (Math.abs(raw.latitude) > 90 || Math.abs(raw.longitude) > 180) return null;

  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name !== '' ? raw.name : 'Unnamed stop',
    category: isStopCategory(raw.category) ? raw.category : 'other',
    latitude: raw.latitude,
    longitude: raw.longitude,
    address: typeof raw.address === 'string' ? raw.address : undefined,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    createdAt: isFiniteNumber(raw.createdAt) ? raw.createdAt : Date.now(),
  };
}

export function parseTrip(value: unknown): Trip | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '') return null;

  const stops = Array.isArray(raw.stops)
    ? raw.stops.map(parseStop).filter((stop): stop is Stop => stop !== null)
    : [];

  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name !== '' ? raw.name : 'My trip',
    stops,
    ridePlan: parseRidePlan(raw.ridePlan),
    roadRoute: parseRoadRoute(raw.roadRoute),
    updatedAt: isFiniteNumber(raw.updatedAt) ? raw.updatedAt : Date.now(),
  };
}


export type RideLibrary = { activeId: string; trips: Trip[] };
export function parseRideLibrary(value: unknown): RideLibrary | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.trips)) return null;
  const ids = new Set<string>();
  const trips = raw.trips.map(parseTrip).filter((trip): trip is Trip => {
    if (!trip || ids.has(trip.id)) return false;
    ids.add(trip.id); return true;
  });
  if (!trips.length) return null;
  return { trips, activeId: trips.some(t => t.id === raw.activeId) ? raw.activeId as string : trips[0].id };
}
export function upsertRide(trips: Trip[], trip: Trip): Trip[] {
  return trips.some(t => t.id === trip.id) ? trips.map(t => t.id === trip.id ? trip : t) : [...trips, trip];
}
export function switchRide(current: Trip, trips: Trip[], id: string): { trip: Trip; trips: Trip[] } {
  const saved = upsertRide(trips, current);
  return { trip: saved.find(t => t.id === id) ?? current, trips: saved };
}
