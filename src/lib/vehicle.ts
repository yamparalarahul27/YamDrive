export type PressureReading = { front: number; rear: number; at: string };
export type ServiceRecord = { date: string; km: number; notes: string };
export type FuelFill = { km: number; litres: number; cost: number; full: boolean; date: string };
export type Vehicle = { tankLitres?: number; purchaseDate?: string; completedServiceKm?: number; nextServiceKm?: number; nextServiceDate?: string; make: string; model: string; year: number; odometer: number; pressures: PressureReading[]; fuelFills?: FuelFill[]; services: ServiceRecord[]; maintenance: string };
export const DEFAULT_VEHICLE: Vehicle = { make: 'Royal Enfield', model: 'Hunter 350', year: 2022, odometer: 20000, pressures: [], services: [], maintenance: '' };
const finite = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validServiceDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date && date <= new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
export function parseVehicle(value: unknown): Vehicle {
  const v = value as Vehicle;
  if (!v || typeof v.make !== 'string' || !v.make.trim() || v.make.length > 60 || typeof v.model !== 'string' || !v.model.trim() || v.model.length > 60 || !Number.isInteger(v.year) || !finite(v.year, 1900, new Date().getFullYear() + 1) || !Number.isInteger(v.odometer) || !finite(v.odometer, 0, 2000000) || typeof v.maintenance !== 'string' || v.maintenance.length > 2000 || !Array.isArray(v.pressures) || !Array.isArray(v.services)) throw new Error('Check the vehicle details.');
  if (v.pressures.some(p => !p || !finite(p.front, 1, 100) || !finite(p.rear, 1, 100) || typeof p.at !== 'string' || !Number.isFinite(Date.parse(p.at)))) throw new Error('Enter front and rear pressure between 1 and 100 psi.');
  if (v.services.some(s => !s || typeof s.date !== 'string' || !validServiceDate(s.date) || !Number.isInteger(s.km) || !finite(s.km, 0, v.odometer) || typeof s.notes !== 'string' || s.notes.length > 2000)) throw new Error('Check service date and mileage. Service mileage cannot exceed the odometer.');
  if (v.tankLitres !== undefined && !finite(v.tankLitres, 1, 100)) throw new Error('Enter tank capacity between 1 and 100 litres.');
  if (v.purchaseDate && !validServiceDate(v.purchaseDate)) throw new Error('Enter a valid purchase date.');
  if (v.completedServiceKm !== undefined && (!Number.isInteger(v.completedServiceKm) || v.completedServiceKm < 0 || v.completedServiceKm > v.odometer || (v.completedServiceKm !== 0 && v.completedServiceKm !== 500 && v.completedServiceKm % 5000 !== 0))) throw new Error('Use a completed scheduled milestone: 0, 500, 5000, 10000…');
  if (v.nextServiceKm !== undefined && (!Number.isInteger(v.nextServiceKm) || !finite(v.nextServiceKm, 0, 2000000))) throw new Error('Enter a valid next-service odometer.');
  if (v.nextServiceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(v.nextServiceDate) || !Number.isFinite(Date.parse(v.nextServiceDate)) || new Date(v.nextServiceDate).toISOString().slice(0, 10) !== v.nextServiceDate)) throw new Error('Enter a valid next-service date.');
  const fuelFills = v.fuelFills ?? [];
  if (!Array.isArray(fuelFills) || fuelFills.some(f => !f || !Number.isInteger(f.km) || !finite(f.km, 0, v.odometer) || !finite(f.litres, 0.01, 100) || !finite(f.cost, 0.01, 100000) || typeof f.full !== 'boolean' || typeof f.date !== 'string' || !validServiceDate(f.date))) throw new Error('Check fuel date, odometer, litres and cost.');
  return { ...v, ...(v.fuelFills ? { fuelFills } : {}), make: v.make.trim(), model: v.model.trim() };
}

/** Full-to-full consumption excludes the starting fill, includes all intervening partial fills. */
export function fuelMetrics(fills: FuelFill[]) {
  const sorted = [...fills].sort((a, b) => a.km - b.km);
  const full = sorted.map((f, i) => f.full ? i : -1).filter(i => i >= 0);
  const spend = fills.reduce((sum, f) => sum + f.cost, 0);
  if (full.length < 2) return { spend, kmPerLitre: null, costPerKm: null };
  const end = full[full.length - 1], start = full[full.length - 2];
  const km = sorted[end].km - sorted[start].km;
  const interval = sorted.slice(start + 1, end + 1);
  const litres = interval.reduce((sum, f) => sum + f.litres, 0);
  return { spend, kmPerLitre: km > 0 && litres > 0 ? km / litres : null,
    costPerKm: km > 0 ? interval.reduce((sum, f) => sum + f.cost, 0) / km : null };
}
