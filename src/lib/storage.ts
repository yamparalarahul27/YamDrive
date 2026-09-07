import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseTrip, parseRideLibrary, type RideLibrary } from '@/lib/ride-library';

const LEGACY_KEY = 'pitstop.trip.v1';
const LIBRARY_KEY = 'yamdrive.rides.v1';

/** Preserve the original single-ride key as a migration backup. */
export async function loadRideLibrary(): Promise<RideLibrary | null> {
  const saved = await AsyncStorage.getItem(LIBRARY_KEY);
  if (saved !== null) {
    const library = parseRideLibrary(JSON.parse(saved));
    if (!library) throw new Error('Saved rides could not be read.');
    return library;
  }
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy === null) return null;
  const trip = parseTrip(JSON.parse(legacy));
  if (!trip) throw new Error('Your previous ride could not be read.');
  return { activeId: trip.id, trips: [trip] };
}
// Serialize writes so an older snapshot cannot finish after a newer one.
let writes: Promise<void> = Promise.resolve();
export function saveRideLibrary(library: RideLibrary): Promise<void> {
  const serialized = JSON.stringify(library);
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(LIBRARY_KEY, serialized));
  return writes;
}
