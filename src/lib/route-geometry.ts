export type Position = [number, number];
export type RouteStep = { index: number; type: number; instruction: string };
export type RoadRoute = {
  steps?: RouteStep[];
  signature: string;
  coordinates: Position[];
  distanceKm: number;
  durationMinutes: number;
  savedAt: number;
};
export function decodePolyline6(encoded: string): Position[] {
  let index = 0, lat = 0, lon = 0;
  const result: Position[] = [];
  const read = () => {
    let value = 0, shift = 0, byte: number;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route geometry');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error('Invalid route geometry');
      value |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  while (index < encoded.length) {
    lat += read(); lon += read();
    if (Math.abs(lat) > 90000000 || Math.abs(lon) > 180000000) throw new Error('Invalid route coordinates');
    result.push([lon / 1e6, lat / 1e6]);
  }
  return result;
}
export function kmBetween(a: Position, b: Position): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 12742.0176 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function cumulativeKm(points: Position[]): number[] {
  let total = 0;
  return points.map((point, i) => { if (i) total += kmBetween(points[i - 1], point); return total; });
}
/** Interpolate on the road polyline, rather than a straight origin/destination line. */
export function pointAlong(points: Position[], cumulative: number[], fraction: number): Position {
  const target = Math.max(0, Math.min(1, fraction)) * cumulative[cumulative.length - 1];
  let low = 0, high = cumulative.length - 1;
  while (low < high) { const mid = (low + high) >>> 1; if (cumulative[mid] < target) low = mid + 1; else high = mid; }
  const i = low;
  if (i <= 0) return points[0];
  const t = (target - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1] || 1);
  return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
    points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t];
}

/** Display-only Douglas–Peucker simplification. Navigation always keeps the original line. */
export function simplifyRoute(points: Position[], toleranceMetres = 5): Position[] {
  if (points.length < 3 || toleranceMetres <= 0) return points;
  const scale = Math.cos(points[Math.floor(points.length / 2)][1] * Math.PI / 180);
  const toleranceSquared = (toleranceMetres / 111195) ** 2;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    const a = points[start], b = points[end], dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
    let farthest = -1, max = toleranceSquared;
    for (let i = start + 1; i < end; i++) {
      const x = (points[i][0] - a[0]) * scale, y = points[i][1] - a[1];
      const t = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy || 1)));
      const distance = (x - t * dx) ** 2 + (y - t * dy) ** 2;
      if (distance > max) { max = distance; farthest = i; }
    }
    if (farthest >= 0) { keep[farthest] = 1; stack.push([start, farthest], [farthest, end]); }
  }
  return points.filter((_, i) => keep[i]);
}
export function routeSignature(origin: string, destination: string, stops: { latitude: number; longitude: number }[], originPin?: { latitude: number; longitude: number }, destinationPin?: { latitude: number; longitude: number }): string {
  return JSON.stringify([origin.trim().toLowerCase(), destination.trim().toLowerCase(), stops.map(s => [s.longitude, s.latitude]), ...(originPin || destinationPin ? [originPin ? [originPin.longitude, originPin.latitude] : null, destinationPin ? [destinationPin.longitude, destinationPin.latitude] : null] : [])]);
}
export function parseRoadRoute(value: unknown): RoadRoute | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as RoadRoute;
  if (typeof r.signature !== 'string' || !Number.isFinite(r.distanceKm) || r.distanceKm <= 0 ||
      !Number.isFinite(r.durationMinutes) || r.durationMinutes <= 0 || !Number.isFinite(r.savedAt) ||
      !Array.isArray(r.coordinates) || r.coordinates.length < 2 || r.coordinates.length > 100000 ||
      !r.coordinates.every(p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) return null;
  const steps = Array.isArray(r.steps) && r.steps.every(s => Number.isInteger(s.index) && s.index >= 0 && s.index < r.coordinates.length &&
    Number.isInteger(s.type) && typeof s.instruction === 'string' && s.instruction.length <= 600) ? r.steps : undefined;
  return { ...r, steps };
}
export function routeBounds(points: Position[]): [number, number, number, number] {
  if (!points.length) throw new Error('Route is empty');
  return points.reduce<[number, number, number, number]>((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])],
    [points[0][0], points[0][1], points[0][0], points[0][1]]);
}
