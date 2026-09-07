import { parseRoadRoute } from '@/lib/route-geometry';
import { parseRidePlan } from '@/lib/ride-plan';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isStopCategory } from '@/lib/categories';
import type { Stop, Trip } from '@/lib/types';

/** Bump the suffix if the persisted shape ever changes incompatibly. */
const STORAGE_KEY = 'pitstop.trip.v1';

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

function parseTrip(value: unknown): Trip | null {
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

/** Returns null when there is nothing saved, or when what is saved is junk. */
export async function loadTrip(): Promise<Trip | null> {
  try {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    if (serialized === null) return null;
    return parseTrip(JSON.parse(serialized));
  } catch (error) {
    console.warn('[pitstop] could not read the saved trip, starting fresh', error);
    return null;
  }
}

export async function saveTrip(trip: Trip): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
  } catch (error) {
    console.warn('[pitstop] could not save the trip', error);
  }
}
