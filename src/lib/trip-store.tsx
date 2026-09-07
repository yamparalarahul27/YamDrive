import type { RoadRoute } from '@/lib/route-geometry';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { parseRidePlan, type RidePlan } from '@/lib/ride-plan';
import { loadRideLibrary, saveRideLibrary } from '@/lib/storage';
import { upsertRide, switchRide, type RideLibrary } from '@/lib/ride-library';
import type { Stop, StopCategory, Trip } from '@/lib/types';

/** Good enough for local ids; no uuid dependency for something never synced. */
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTrip(): Trip {
  return { id: createId(), name: 'My trip', stops: [], updatedAt: Date.now() };
}

export type NewStop = {
  name: string;
  category: StopCategory;
  latitude: number;
  longitude: number;
  address?: string;
  note?: string;
};

type Action =
  | { type: 'hydrate'; library: RideLibrary | null }
  | { type: 'createRide'; trip: Trip }
  | { type: 'switchRide'; id: string }
  | { type: 'deleteRide'; id: string }
  | { type: 'addStop'; stop: NewStop }
  | { type: 'updateStop'; id: string; changes: Partial<Omit<Stop, 'id' | 'createdAt'>> }
  | { type: 'removeStop'; id: string }
  | { type: 'moveStop'; id: string; offset: number }
  | { type: 'renameTrip'; name: string }
  | { type: 'clearStops' }
  | { type: 'setRidePlan'; plan: RidePlan }
  | { type: 'setRoadRoute'; route: RoadRoute };

type State = {
  trips: Trip[];
  trip: Trip;
  /** False until AsyncStorage has been read, so we never persist over saved data. */
  hydrated: boolean;
};

/** Move an item by a relative offset, clamped to the array bounds. */
function moveByOffset<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function reducer(state: State, action: Action): State {
  // Every branch below stamps updatedAt, so compute it once.
  const touch = (stops: Stop[], name = state.trip.name): State => ({
    ...state,
    trip: { ...state.trip, name, stops, updatedAt: Date.now() },
  });

  switch (action.type) {
    case 'hydrate':
      return { trip: action.library?.trips.find(t => t.id === action.library?.activeId) ?? state.trip, trips: action.library?.trips ?? [state.trip], hydrated: true };
    case 'deleteRide':
      return action.id === state.trip.id ? state : { ...state, trips: state.trips.filter(t => t.id !== action.id) };
    case 'createRide':
      return { ...state, trips: upsertRide(upsertRide(state.trips, state.trip), action.trip), trip: action.trip };
    case 'switchRide':
      return { ...state, ...switchRide(state.trip, state.trips, action.id) };

    case 'addStop': {
      const stop: Stop = { ...action.stop, id: createId(), createdAt: Date.now() };
      return touch([...state.trip.stops, stop]);
    }

    case 'updateStop':
      return touch(
        state.trip.stops.map((stop) =>
          stop.id === action.id ? { ...stop, ...action.changes } : stop,
        ),
      );

    case 'removeStop':
      return touch(state.trip.stops.filter((stop) => stop.id !== action.id));

    case 'moveStop': {
      const index = state.trip.stops.findIndex((stop) => stop.id === action.id);
      const stops = moveByOffset(state.trip.stops, index, action.offset);
      // Reference-equal when the move was a no-op at the list edge.
      return stops === state.trip.stops ? state : touch(stops);
    }

    case 'renameTrip':
      return touch(state.trip.stops, action.name);

    case 'setRoadRoute':
      return { ...state, trip: { ...state.trip, roadRoute: action.route, updatedAt: Date.now() } };

    case 'setRidePlan':
      return { ...state, trip: { ...state.trip, ridePlan: parseRidePlan(action.plan), updatedAt: Date.now() } };

    case 'clearStops':
      return touch([]);

    default:
      return state;
  }
}

type TripContextValue = {
  trip: Trip;
  trips: Trip[];
  storageError: string;
  createRide: (name: string, plan: RidePlan) => void;
  selectRide: (id: string) => void;
  deleteRide: (id: string) => void;
  hydrated: boolean;
  addStop: (stop: NewStop) => void;
  updateStop: (id: string, changes: Partial<Omit<Stop, 'id' | 'createdAt'>>) => void;
  removeStop: (id: string) => void;
  moveStop: (id: string, offset: number) => void;
  renameTrip: (name: string) => void;
  clearStops: () => void;
  setRidePlan: (plan: RidePlan) => void;
  setRoadRoute: (route: RoadRoute) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer((state: State, action: Action & { scope?: string }) => action.scope && action.scope !== state.trip.id ? state : reducer(state, action), undefined, () => ({
    trips: [],
    trip: emptyTrip(),
    hydrated: false,
  }));

  const [storageError, setStorageError] = useState('');
  // Scope delayed map/search results to the ride that initiated them.
  const dispatch = useCallback((action: Action) => rawDispatch({ ...action, scope: state.trip.id }), [state.trip.id]);
  // Read the saved trip once on mount.
  useEffect(() => {
    let cancelled = false;
    loadRideLibrary().then((library) => {
      if (!cancelled) rawDispatch({ type: 'hydrate', library });
    }).catch(() => { if (!cancelled) setStorageError('Could not load saved rides. Restart the app to retry. Your saved data has not been replaced.'); });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after every change, but never before hydration has landed.
  const lastSaved = useRef<State | null>(null);
  useEffect(() => {
    if (!state.hydrated) return;
    if (lastSaved.current === state) return;
    lastSaved.current = state;
    void saveRideLibrary({ activeId: state.trip.id, trips: upsertRide(state.trips, state.trip) }).catch(() => setStorageError('Changes could not be saved. Keep the app open and try another change after freeing storage.'));
  }, [state]);

  const addStop = useCallback((stop: NewStop) => dispatch({ type: 'addStop', stop }), [dispatch]);
  const updateStop = useCallback(
    (id: string, changes: Partial<Omit<Stop, 'id' | 'createdAt'>>) =>
      dispatch({ type: 'updateStop', id, changes }),
    [dispatch],
  );
  const removeStop = useCallback((id: string) => dispatch({ type: 'removeStop', id }), [dispatch]);
  const moveStop = useCallback(
    (id: string, offset: number) => dispatch({ type: 'moveStop', id, offset }),
    [dispatch],
  );
  const renameTrip = useCallback((name: string) => dispatch({ type: 'renameTrip', name }), [dispatch]);
  const setRoadRoute = useCallback((route: RoadRoute) => dispatch({ type: 'setRoadRoute', route }), [dispatch]);
  const setRidePlan = useCallback((plan: RidePlan) => dispatch({ type: 'setRidePlan', plan }), [dispatch]);
  const clearStops = useCallback(() => dispatch({ type: 'clearStops' }), [dispatch]);

  const createRide = useCallback((name: string, plan: RidePlan) => {
    if (!state.hydrated) return;
    dispatch({ type: 'createRide', trip: { id: createId(), name: name.trim(), stops: [], ridePlan: { ...parseRidePlan(plan), preRideChecks: [] }, updatedAt: Date.now() } });
  }, [dispatch, state.hydrated]);
  const deleteRide = useCallback((id: string) => { if (state.hydrated) dispatch({ type: 'deleteRide', id }); }, [dispatch, state.hydrated]);
  const selectRide = useCallback((id: string) => { if (state.hydrated) dispatch({ type: 'switchRide', id }); }, [dispatch, state.hydrated]);
  const value = useMemo<TripContextValue>(
    () => ({
      trip: state.trip,
      trips: upsertRide(state.trips, state.trip), storageError, createRide, selectRide, deleteRide,
      hydrated: state.hydrated,
      addStop,
      updateStop,
      removeStop,
      moveStop,
      renameTrip,
      clearStops,
      setRidePlan,
      setRoadRoute,
    }),
    [state.trip, state.trips, state.hydrated, storageError, createRide, selectRide, deleteRide, addStop, updateStop, removeStop, moveStop, renameTrip, clearStops, setRidePlan, setRoadRoute],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const value = useContext(TripContext);
  if (value === null) {
    throw new Error('useTrip must be used inside a <TripProvider>');
  }
  return value;
}
