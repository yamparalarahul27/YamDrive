export function remainingRide(totalKm: number, routeMinutes: number, progressKm: number, geometryKm: number,
  averageKph: number, breakKm: number[], breakMinutes: number) {
  const fraction = geometryKm > 0 ? Math.max(0, Math.min(1, progressKm / geometryKm)) : 0;
  const travelledKm = totalKm * fraction;
  const remainingKm = Math.max(0, totalKm - travelledKm);
  const remainingBreaks = breakKm.filter(km => km > travelledKm + 0.025).length;
  const movingMinutes = Math.max(routeMinutes * (1 - fraction), remainingKm / averageKph * 60);
  return { travelledKm, remainingKm, remainingBreaks, minutes: movingMinutes + remainingBreaks * breakMinutes };
}
export type ElevationStats = { current: number; lowest: number; highest: number; timestamp: number };
export function recordElevation(previous: ElevationStats | null, altitude: number | null, accuracy: number | null, timestamp: number, now: number): ElevationStats | null {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || altitude === null || accuracy === null || !Number.isFinite(altitude) || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 30 || now - timestamp > 8000 || timestamp > now + 1000) return previous;
  return { current: altitude, lowest: Math.min(previous?.lowest ?? altitude, altitude), highest: Math.max(previous?.highest ?? altitude, altitude), timestamp };
}
