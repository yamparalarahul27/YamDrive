import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { loadTrip, saveTrip } from '@/lib/storage';
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
  | { type: 'hydrate'; trip: Trip | null }
  | { type: 'addStop'; stop: NewStop }
  | { type: 'updateStop'; id: string; changes: Partial<Omit<Stop, 'id' | 'createdAt'>> }
  | { type: 'removeStop'; id: string }
  | { type: 'moveStop'; id: string; offset: number }
  | { type: 'renameTrip'; name: string }
  | { type: 'clearStops' };

type State = {
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
      return { trip: action.trip ?? state.trip, hydrated: true };

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

    case 'clearStops':
      return touch([]);

    default:
      return state;
  }
}

type TripContextValue = {
  trip: Trip;
  hydrated: boolean;
  addStop: (stop: NewStop) => void;
  updateStop: (id: string, changes: Partial<Omit<Stop, 'id' | 'createdAt'>>) => void;
  removeStop: (id: string) => void;
  moveStop: (id: string, offset: number) => void;
  renameTrip: (name: string) => void;
  clearStops: () => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    trip: emptyTrip(),
    hydrated: false,
  }));

  // Read the saved trip once on mount.
  useEffect(() => {
    let cancelled = false;
    loadTrip().then((trip) => {
      if (!cancelled) dispatch({ type: 'hydrate', trip });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after every change, but never before hydration has landed.
  const lastSaved = useRef<Trip | null>(null);
  useEffect(() => {
    if (!state.hydrated) return;
    if (lastSaved.current === state.trip) return;
    lastSaved.current = state.trip;
    void saveTrip(state.trip);
  }, [state.hydrated, state.trip]);

  const addStop = useCallback((stop: NewStop) => dispatch({ type: 'addStop', stop }), []);
  const updateStop = useCallback(
    (id: string, changes: Partial<Omit<Stop, 'id' | 'createdAt'>>) =>
      dispatch({ type: 'updateStop', id, changes }),
    [],
  );
  const removeStop = useCallback((id: string) => dispatch({ type: 'removeStop', id }), []);
  const moveStop = useCallback(
    (id: string, offset: number) => dispatch({ type: 'moveStop', id, offset }),
    [],
  );
  const renameTrip = useCallback((name: string) => dispatch({ type: 'renameTrip', name }), []);
  const clearStops = useCallback(() => dispatch({ type: 'clearStops' }), []);

  const value = useMemo<TripContextValue>(
    () => ({
      trip: state.trip,
      hydrated: state.hydrated,
      addStop,
      updateStop,
      removeStop,
      moveStop,
      renameTrip,
      clearStops,
    }),
    [state.trip, state.hydrated, addStop, updateStop, removeStop, moveStop, renameTrip, clearStops],
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
