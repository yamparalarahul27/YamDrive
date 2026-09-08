import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_VEHICLE, parseVehicle, type Vehicle } from '@/lib/vehicle';
const KEY = 'yamdrive.vehicle.v1';
const Context = createContext<{ vehicle: Vehicle; ready: boolean; error: string; save: (value: Vehicle) => Promise<void> } | null>(null);
export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE), [ready, setReady] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      const value = raw === null ? DEFAULT_VEHICLE : parseVehicle(JSON.parse(raw));
      if (active) { setVehicle(value); setReady(true); }
    }).catch(() => { if (active) setError('Could not load vehicle details. Restart to retry.'); });
    return () => { active = false; };
  }, []);
  async function save(value: Vehicle) {
    if (!ready || saving.current) throw new Error('Vehicle details are not ready. Try again.');
    const checked = parseVehicle(value);
    saving.current = true;
    try { await AsyncStorage.setItem(KEY, JSON.stringify(checked)); setVehicle(checked); }
    catch { throw new Error('Could not save. Please try again.'); }
    finally { saving.current = false; }
  }
  return <Context.Provider value={{ vehicle, ready, error, save }}>{children}</Context.Provider>;
}
export function useVehicle() { const value = useContext(Context); if (!value) throw new Error('VehicleProvider missing'); return value; }
