import { parseCheckList, parseDepartureTime, type PreRideCheck } from './ride-preparation.ts';
export type EndpointPin = { latitude: number; longitude: number };

/** Offline planning preferences, not engine-temperature or fuel-level telemetry. */
export type RidePlan = {
  departureTime?: string;
  preRideChecks?: PreRideCheck[];
  lightMap?: boolean;
  speedRange?: { min: number; max: number };
  origin: string;
  destination: string;
  originPin?: EndpointPin;
  destinationPin?: EndpointPin;
  distanceKm: number;
  averageKph: number;
  breakEveryMinutes: number;
  breakMinutes: number;
  fuelEveryKm: number | null;
};

export const DEFAULT_RIDE_PLAN: RidePlan = {
  origin: 'Guntur', destination: 'Bangalore', distanceKm: 600,
  averageKph: 60, breakEveryMinutes: 60, breakMinutes: 15, fuelEveryKm: null,
};

export function parseRidePlan(value: unknown): RidePlan {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const number = (key: keyof RidePlan, min: number, max: number, fallback: number) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key]) && raw[key] >= min && raw[key] <= max
      ? raw[key] as number : fallback;
  const label = (key: 'origin' | 'destination') => typeof raw[key] === 'string' && raw[key].trim()
    ? raw[key].trim().slice(0, 200) : DEFAULT_RIDE_PLAN[key];
  const pin = (key: string) => {
    const p = raw[key] as EndpointPin | undefined;
    return p && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
      Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180
      ? { latitude: p.latitude, longitude: p.longitude } : undefined;
  };
  const originPin = pin('originPin'), destinationPin = pin('destinationPin');
  const r = raw.speedRange as { min: number; max: number } | undefined;
  const speedRange = r && Number.isFinite(r.min) && Number.isFinite(r.max) && r.min >= 0 && r.max > r.min && r.max <= 200 ? { min: r.min, max: r.max } : undefined;
  return {
    ...(parseDepartureTime(raw.departureTime) ? { departureTime: parseDepartureTime(raw.departureTime) } : {}),
    ...(Array.isArray(raw.preRideChecks) ? { preRideChecks: parseCheckList(raw.preRideChecks) } : {}),
    ...(typeof raw.lightMap === 'boolean' ? { lightMap: raw.lightMap } : {}),
    ...(speedRange ? { speedRange } : {}),
    ...(originPin ? { originPin } : {}), ...(destinationPin ? { destinationPin } : {}),
    origin: label('origin'), destination: label('destination'),
    distanceKm: number('distanceKm', 1, 3000, 600),
    averageKph: number('averageKph', 10, 120, 60),
    breakEveryMinutes: number('breakEveryMinutes', 15, 180, 60),
    breakMinutes: number('breakMinutes', 5, 120, 15),
    fuelEveryKm: raw.fuelEveryKm === null || raw.fuelEveryKm === undefined ? null
      : number('fuelEveryKm', 20, 500, 150),
  };
}

export type PlannedBreak = {
  km: number;
  ridingMinutes: number;
  elapsedMinutes: number;
  fuel: boolean;
  rest: boolean;
};

export function buildRideSchedule(plan: RidePlan) {
  const p = parseRidePlan(plan);
  const restKm = p.averageKph * p.breakEveryMinutes / 60;
  const events: { km: number; fuel: boolean; rest: boolean }[] = [];
  for (let i = 1; i * restKm < p.distanceKm - 0.000001; i++) {
    events.push({ km: i * restKm, fuel: false, rest: true });
  }
  if (p.fuelEveryKm !== null) {
    for (let i = 1; i * p.fuelEveryKm < p.distanceKm - 0.000001; i++) {
      const km = i * p.fuelEveryKm;
      const existing = events.find(event => Math.abs(event.km - km) < 0.000001);
      if (existing) existing.fuel = true;
      else events.push({ km, fuel: true, rest: false });
    }
  }
  events.sort((a, b) => a.km - b.km);
  const stops: PlannedBreak[] = events.map((event, index) => ({
    ...event, ridingMinutes: event.km / p.averageKph * 60,
    elapsedMinutes: event.km / p.averageKph * 60 + index * p.breakMinutes,
  }));
  const ridingMinutes = p.distanceKm / p.averageKph * 60;
  return { stops, ridingMinutes, elapsedMinutes: ridingMinutes + stops.length * p.breakMinutes };
}

export function rideDirectionsUrl(plan: RidePlan): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(plan.originPin ? `${plan.originPin.latitude},${plan.originPin.longitude}` : plan.origin.trim())}&destination=${encodeURIComponent(plan.destinationPin ? `${plan.destinationPin.latitude},${plan.destinationPin.longitude}` : plan.destination.trim())}&travelmode=two-wheeler`;
}
