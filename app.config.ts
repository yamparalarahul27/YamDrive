import type { ExpoConfig } from 'expo/config';

/**
 * Two separate Google keys, because they are consumed in two different ways:
 *
 * - `GOOGLE_MAPS_API_KEY` is baked into AndroidManifest.xml at prebuild time and
 *   read by the native Maps SDK. Restrict it to Android apps (package name +
 *   signing certificate SHA-1).
 * - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is inlined into the JS bundle by Metro
 *   and sent as a header on Places REST calls. Android app restrictions do not
 *   apply to plain REST requests, so restrict this one by API instead (Places
 *   API only) and treat it as public — anything in the bundle is extractable.
 *
 * Both are optional. Without the Maps key the map renders blank; without the
 * Places key the app falls back to the OS geocoder for search and tells you
 * what is missing. See README.md.
 */
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

const config: ExpoConfig = {
  name: 'Pitstop',
  slug: 'pitstop',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'pitstop',
  userInterfaceStyle: 'automatic',
  android: {
    // Change this before you publish anything.
    package: 'com.pitstop.app',
    adaptiveIcon: {
      backgroundColor: '#0F766E',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    config: {
      googleMaps: { apiKey: googleMapsApiKey },
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F766E',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Pitstop uses your location to centre the map and measure distances to your stops.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
