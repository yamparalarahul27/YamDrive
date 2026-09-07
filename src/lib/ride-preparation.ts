export const PRE_RIDE_CHECKS = [
  { id: 'fuel', group: 'Before ride day', title: 'Petrol ready', detail: 'Refuel beforehand; choose a first fuel stop and confirm opening hours.' },
  { id: 'tyres', group: 'Before ride day', title: 'Tyres & wheels', detail: 'Check cold pressure for your load, tread, damage and wheel condition.' },
  { id: 'brakes', group: 'Before ride day', title: 'Brakes & pads', detail: 'Check braking action, pad wear and fluid level. Have worn parts or faults repaired.' },
  { id: 'chain', group: 'Before ride day', title: 'Chain & alignment', detail: 'Check chain slack, lubrication and rear-wheel alignment to the bike manual. Use a mechanic for adjustment if unsure.' },
  { id: 'oil', group: 'Before ride day', title: 'Oil & leaks', detail: 'Check engine oil as the manual describes; inspect for fuel, oil or brake-fluid leaks.' },
  { id: 'lights', group: 'Before departure', title: 'Lights & controls', detail: 'Check headlight, brake light, indicators, horn, mirrors, throttle, clutch and side stand.' },
  { id: 'luggage', group: 'Before departure', title: 'Gear & luggage', detail: 'Helmet, gloves and riding gear ready; secure luggage and phone mount clear of controls.' },
  { id: 'supplies', group: 'Before departure', title: 'Phone & essentials', detail: 'Charge phone and power bank; carry water, documents, emergency contacts and a puncture kit.' },
  { id: 'route', group: 'Before departure', title: 'Route & conditions', detail: 'Review weather, visibility and stop availability. Build the route while connected.' },
  { id: 'rest', group: 'Before departure', title: 'Rested & ready', detail: 'Start after enough sleep. Delay departure if tired or visibility is poor.' },
] as const;
export type PreRideCheck = typeof PRE_RIDE_CHECKS[number]['id'];
export function parseCheckList(value: unknown): PreRideCheck[] {
  return Array.isArray(value) ? PRE_RIDE_CHECKS.filter(item => value.includes(item.id)).map(item => item.id) : [];
}
export function parseDepartureTime(value: unknown): string | undefined {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}
/** Wall-clock planning in IST (India, UTC+05:30); not an alarm or traffic ETA. */
export function plannedClock(departure: string | undefined, elapsedMinutes = 0): string | null {
  if (!parseDepartureTime(departure) || !Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) return null;
  const [hour, minute] = departure!.split(':').map(Number);
  const total = hour * 60 + minute + Math.round(elapsedMinutes);
  const days = Math.floor(total / 1440), clock = total % 1440;
  const h = Math.floor(clock / 60), m = clock % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}${days ? ` (+${days}d)` : ''}`;
}
