import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { TripProvider, useTrip } from '@/lib/trip-store';

SplashScreen.preventAutoHideAsync();

/**
 * Holds the splash screen until the saved trip has been read, so the app never
 * flashes an empty itinerary before hydrating.
 */
function SplashGate() {
  const { hydrated, storageError } = useTrip();

  useEffect(() => {
    if (!hydrated && !storageError) return;
    SplashScreen.hideAsync().catch(() => {
      // Already hidden — nothing to do.
    });
  }, [hydrated, storageError]);

  return null;
}

function RideStack() {
  const { trip } = useTrip();
  return <Stack key={trip.id} screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /></Stack>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <TripProvider>
        <SplashGate />
        <StatusBar style={dark ? 'light' : 'dark'} />
        <RideStack />
      </TripProvider>
    </ThemeProvider>
  );
}
