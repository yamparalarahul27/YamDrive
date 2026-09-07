import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * False while rendering on the server, true once the client has hydrated.
 * `useSyncExternalStore` is the hydration-safe way to ask this — it reports the
 * server snapshot during SSR without a state update in an effect.
 */
function useHasHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Static web rendering has no colour scheme to read, so the first paint has to
 * assume one and re-resolve on the client.
 */
export function useColorScheme() {
  const hasHydrated = useHasHydrated();
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
