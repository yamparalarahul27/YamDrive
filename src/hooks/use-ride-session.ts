import { recordElevation, type ElevationStats } from '@/lib/ride-overview';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { demoSpeed, demoDistanceKm, type SpeedRange, gpsSpeedKph, pauseClock, rideElapsed, type RideClock } from '@/lib/ride-speed';
const idle: RideClock = { status: 'idle', elapsedMs: 0, startedAt: null };
export function useRideSession(range: SpeedRange | null) {
  const [demo, setDemo] = useState(false);
  const demoRange = range ?? { min: 40, max: 60 };
  const [ride, setRide] = useState<RideClock>(idle);
  const [fix, setFix] = useState<Location.LocationObject | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [elevation, setElevation] = useState<ElevationStats | null>(null);
  const [error, setError] = useState('');
  const pause = useCallback(() => { setRide(previous => pauseClock(previous, Date.now())); setFix(null); }, []);
  const end = () => { setElevation(null); setDemo(false); setRide(idle); setFix(null); setError(''); };
  const start = () => { if (ride.status === 'idle') setElevation(null); setError(''); setFix(null); setNow(Date.now()); setRide(previous => ({ ...previous, status: 'active', startedAt: Date.now() })); };
  const startDemo = () => { setElevation(null); setDemo(true); setFix(null); setError(''); setNow(Date.now()); setRide({ status: 'active', startedAt: Date.now(), elapsedMs: 0 }); };
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    return () => listener.remove();
  }, [pause]);
  useEffect(() => {
    if (ride.status !== 'active') return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    if (!demo) void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) throw new Error('Allow location access to show live speed.');
        subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, point => {
          if (!cancelled) { setFix(point); setNow(Date.now()); setElevation(previous => recordElevation(previous, point.coords.altitude, point.coords.altitudeAccuracy, point.timestamp, Date.now())); }
        }, message => { if (!cancelled) { setError(message || 'GPS unavailable.'); pause(); } });
        if (cancelled) subscription.remove();
      } catch (e) { if (!cancelled) { setError(e instanceof Error ? e.message : 'GPS unavailable.'); pause(); } }
    })();
    return () => { cancelled = true; subscription?.remove(); clearInterval(timer); };
  }, [ride.status, pause, demo]);
  const elapsedMs = rideElapsed(ride, now);
  return { elevation, now, positionReady: ride.status === 'active' && !!fix && now - fix.timestamp <= 8000 && fix.coords.accuracy !== null && Number.isFinite(fix.coords.accuracy) && fix.coords.accuracy <= 30, demo, demoRange, demoKm: demoDistanceKm(elapsedMs, demoRange), startDemo, status: ride.status, fix, speed: ride.status === 'active' ? demo ? demoSpeed(elapsedMs, demoRange) : gpsSpeedKph(fix, now) : null,
    elapsedMs: rideElapsed(ride, now), error, start, pause, end };
}
