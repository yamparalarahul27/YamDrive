import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'YamDrive',
  slug: 'yamdrive',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: ['yamdrive', 'pitstop'],
  userInterfaceStyle: 'automatic',
  android: {
    // Preserve installed-app identity and saved trips during the YamDrive rename.
    package: 'com.pitstop.app',
    adaptiveIcon: {
      backgroundColor: '#242523',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    '@maplibre/maplibre-react-native',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#242523',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'YamDrive uses your location to centre the map and measure distances to your stops.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
