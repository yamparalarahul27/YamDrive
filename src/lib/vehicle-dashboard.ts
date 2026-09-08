import { fuelMetrics, type Vehicle } from './vehicle.ts';
export const HUNTER_MANUAL = 'https://www.royalenfield.com/content/dam/royal-enfield/hunter-350/owners-manual/hunter-350-dual-channel.pdf';
export function energyEstimate(v: Vehicle) {
  const fills = [...(v.fuelFills ?? [])].sort((a, b) => a.km - b.km);
  const mileage = fuelMetrics(fills).kmPerLitre;
  const baseline = fills.findLastIndex(f => f.full);
  if (!v.tankLitres || !mileage || baseline < 0) return null;
  let litres = v.tankLitres, previous = fills[baseline].km;
  for (const fill of fills.slice(baseline + 1)) {
    litres = Math.min(v.tankLitres, Math.max(0, litres - (fill.km - previous) / mileage) + fill.litres);
    previous = fill.km;
  }
  litres = Math.max(0, litres - Math.max(0, v.odometer - previous) / mileage);
  return { litres, rangeKm: Math.floor(litres * mileage), fraction: litres / v.tankLitres };
}
function addMonths(date: string, months: number) {
  const start = new Date(`${date}T00:00:00Z`), day = start.getUTCDate();
  start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() + months);
  const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, last)); return start.toISOString().slice(0, 10);
}
export function serviceDue(v: Vehicle, today: string) {
  let km = v.nextServiceKm, date = v.nextServiceDate;
  const supported = v.make.toLowerCase().includes('royal enfield') && v.model.toLowerCase().includes('hunter') && v.year === 2022;
  if (supported && v.purchaseDate && v.completedServiceKm !== undefined) {
    const nextKm = v.completedServiceKm === 0 ? 500 : v.completedServiceKm === 500 ? 5000 : v.completedServiceKm + 5000;
    km ??= nextKm;
    if (!date) {
      if (nextKm === 500) { const d = new Date(`${v.purchaseDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 45); date = d.toISOString().slice(0, 10); }
      else date = addMonths(v.purchaseDate, nextKm / 5000 * 6);
    }
  }
  if (km === undefined && !date) return null;
  const kmLeft = km === undefined ? null : km - v.odometer;
  const daysLeft = date ? Math.ceil((Date.parse(date) - Date.parse(today)) / 86400000) : null;
  return { km, date, kmLeft, daysLeft, due: (kmLeft !== null && kmLeft <= 0) || (daysLeft !== null && daysLeft <= 0) };
}
