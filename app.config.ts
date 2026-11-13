import type { ConfigContext, ExpoConfig } from 'expo/config';

const LOCATION_REASON = 'Calmway uses your location to show where you are on the map and to guide you turn by turn.';

/**
 * EXPO_BASE_URL is set when exporting the web build for GitHub Pages, which
 * serves the site from /calmway instead of the domain root.
 */
const baseUrl = process.env.EXPO_BASE_URL || undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Calmway',
  slug: 'calmway',
  version: '0.1.0',
  description: 'Navigation for anxious drivers. Longer route, calmer drive.',
  scheme: 'calmway',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F4F1EA',
  ios: {
    bundleIdentifier: 'com.aryx86.calmway',
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_REASON,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.aryx86.calmway',
    adaptiveIcon: {
      backgroundColor: '#2C7A6B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
    name: 'Calmway',
    shortName: 'Calmway',
    themeColor: '#2C7A6B',
    backgroundColor: '#F4F1EA',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        backgroundColor: '#F4F1EA',
        dark: { backgroundColor: '#0D1819' },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: LOCATION_REASON,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    '@maplibre/maplibre-react-native',
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
    ...(baseUrl ? { baseUrl } : {}),
  },
});
