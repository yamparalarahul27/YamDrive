export type SpeedRange = { min: number; max: number };
export function parseSpeedRange(value: unknown): SpeedRange | null {
  if (!value || typeof value !== 'object') return null;
  const { min, max } = value as SpeedRange;
  return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max > min && max <= 200 ? { min, max } : null;
}
export function gpsSpeedKph(fix: { timestamp: number; coords: { speed: number | null; accuracy: number | null } } | null, now: number): number | null {
  if (!fix || !Number.isFinite(fix.timestamp) || now - fix.timestamp > 8000 || fix.timestamp > now + 2000 || fix.coords.accuracy === null || !Number.isFinite(fix.coords.accuracy) || fix.coords.accuracy > 30 || fix.coords.accuracy < 0 ||
    fix.coords.speed === null || !Number.isFinite(fix.coords.speed) || fix.coords.speed < 0) return null;
  return fix.coords.speed * 3.6;
}
export function speedBand(speed: number | null, range: SpeedRange | null) {
  if (speed === null || !range) return 'unknown';
  return speed < range.min ? 'below' : speed > range.max ? 'above' : 'within';
}
export type RideClock = { status: 'idle' | 'active' | 'paused'; elapsedMs: number; startedAt: number | null };
export function rideElapsed(ride: RideClock, now: number) {
  return ride.elapsedMs + (ride.startedAt === null ? 0 : Math.max(0, now - ride.startedAt));
}
export function pauseClock(ride: RideClock, now: number): RideClock {
  return ride.status === 'active' ? { status: 'paused', elapsedMs: rideElapsed(ride, now), startedAt: null } : ride;
}

/** Artificial demo values only. Route playback is accelerated 100x. */
export function demoSpeed(elapsedMs: number, range: SpeedRange) {
  const phase = Math.floor(elapsedMs / 8000) % 4;
  return [Math.max(0, range.min - 10), (range.min + range.max) / 2, range.max + 10, 0][phase];
}
export function demoDistanceKm(elapsedMs: number, range: SpeedRange) {
  const speeds = [Math.max(0, range.min - 10), (range.min + range.max) / 2, range.max + 10, 0];
  const cycles = Math.floor(elapsedMs / 32000), remainder = elapsedMs % 32000;
  return (cycles * speeds.reduce((sum, speed) => sum + speed * 8, 0) +
    speeds.reduce((sum, speed, i) => sum + speed * Math.max(0, Math.min(8, remainder / 1000 - i * 8)), 0)) / 3600 * 100;
}
