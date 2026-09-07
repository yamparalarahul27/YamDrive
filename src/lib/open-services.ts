import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_AGENT = 'Pitstop/1.0 (https://github.com/yamparalarahul27/YamDrive)';
export const SERVICES = {
  tiles: process.env.EXPO_PUBLIC_OSM_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  route: process.env.EXPO_PUBLIC_ROUTING_URL || 'https://valhalla1.openstreetmap.de/route',
  places: process.env.EXPO_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
};
let queue = Promise.resolve();
let lastRequest = 0;
let cooldownUntil = 0;
// Serialize all public-service calls, cache bounded results, never poll or autocomplete.
export async function publicJson<T>(url: string, init: RequestInit = {}, ttl = 86400000): Promise<T> {
  const key = 'pitstop.http.v1';
  const requestKey = url + (init.body ?? '');
  const task = async () => {
    type Cache = { key: string; at: number; data: T }[];
    const cache: Cache = await AsyncStorage.getItem(key).then(s => s ? JSON.parse(s) : []).catch(() => []);
    const validCache = Array.isArray(cache) ? cache : [];
    const hit = validCache.find(entry => entry.key === requestKey && Date.now() - entry.at < ttl);
    if (hit) return hit.data;
    if (Date.now() < cooldownUntil) throw new Error('The public service is busy. Please wait a minute before retrying.');
    const delay = Math.max(0, 1500 - (Date.now() - lastRequest));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    lastRequest = Date.now();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 35000);
    try {
      const response = await fetch(url, { ...init, signal: abort.signal,
        headers: { 'User-Agent': APP_AGENT, ...init.headers } });
      if (!response.ok) {
        if ([406, 429, 503, 504].includes(response.status)) cooldownUntil = Date.now() + 60000;
        throw new Error(`Public map service returned ${response.status}. Please try again later.`);
      }
      const data = await response.json().catch(() => { throw new Error('The public map service returned an unreadable response. Please try again later.'); }) as T;
      const next = [{ key: requestKey, at: Date.now(), data }, ...validCache.filter(entry => entry.key !== requestKey).slice(0, 19)];
      while (next.length && JSON.stringify(next).length > 900000) next.pop();
      await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return data;
    } catch (error) {
      if (abort.signal.aborted) throw new Error('The map service timed out. Check your connection and retry.');
      throw error;
    } finally { clearTimeout(timer); }
  };
  const result = queue.then(task);
  queue = result.then(() => {}, () => {});
  return result;
}
