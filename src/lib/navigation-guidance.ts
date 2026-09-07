import { kmBetween, type Position, type RouteStep } from './route-geometry.ts';
export function bearingBetween(a: Position, b: Position): number {
  const rad = Math.PI / 180, lat1 = a[1] * rad, lat2 = b[1] * rad, dlon = (b[0] - a[0]) * rad;
  return (Math.atan2(Math.sin(dlon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon)) / rad + 360) % 360;
}
/** Nearest point on the road line; this is not lane-level map matching. */
export type RouteBlock = { start: number; end: number; west: number; south: number; east: number; north: number };
export function indexRoute(points: Position[]): RouteBlock[] {
  const blocks: RouteBlock[] = [];
  for (let start = 1; start < points.length; start += 64) {
    const end = Math.min(start + 64, points.length), p = points[start - 1];
    let west = p[0], east = p[0], south = p[1], north = p[1];
    for (let i = start; i < end; i++) { west = Math.min(west, points[i][0]); east = Math.max(east, points[i][0]); south = Math.min(south, points[i][1]); north = Math.max(north, points[i][1]); }
    blocks.push({ start, end, west, east, south, north });
  }
  return blocks;
}
export function routeProgress(point: Position, points: Position[], cumulative: number[], blocks?: RouteBlock[]) {
  let distanceKm = Infinity, km = 0, segment = 0;
  const scale = Math.cos(point[1] * Math.PI / 180);
  // A conservative ~1 km box includes every segment within 500 m of the fix.
  // Full scan remains the fallback when off route or near the poles.
  const latPad = 1 / 110, lonPad = latPad / Math.max(0.01, Math.abs(scale));
  const candidates = blocks && Math.abs(point[1]) < 85 ? blocks.filter(b =>
    b.east >= point[0] - lonPad && b.west <= point[0] + lonPad && b.north >= point[1] - latPad && b.south <= point[1] + latPad) : undefined;
  const scan = (start: number, end: number) => { for (let i = start; i < end; i++) {
    const a = points[i - 1], b = points[i];
    const dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, (((point[0] - a[0]) * scale) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const projected: Position = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const distance = kmBetween(point, projected);
    if (distance < distanceKm) { distanceKm = distance; km = cumulative[i - 1] + (cumulative[i] - cumulative[i - 1]) * t; segment = i - 1; }
  } };
  if (candidates) {
    for (const block of candidates) scan(block.start, block.end);
    if (distanceKm > 0.5) scan(1, points.length);
  } else scan(1, points.length);
  return { distanceKm, km, segment };
}
export function nextTurn(steps: RouteStep[], cumulative: number[], progressKm: number) {
  const step = steps.find(s => s.type > 3 && cumulative[s.index] >= progressKm - 0.015);
  return step ? { ...step, distanceKm: Math.max(0, cumulative[step.index] - progressKm) } : null;
}
export function turnKind(type: number): 'left' | 'right' | 'uturn' | 'roundabout' | 'arrive' | 'straight' {
  if ([12,13].includes(type)) return 'uturn';
  if ([14,15,16,19,21,24].includes(type)) return 'left';
  if ([9,10,11,18,20,23].includes(type)) return 'right';
  if ([26,27].includes(type)) return 'roundabout';
  if ([4,5,6].includes(type)) return 'arrive';
  return 'straight';
}
