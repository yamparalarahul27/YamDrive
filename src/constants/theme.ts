/**
 * Colours, spacing and radii for the app. Light and dark are declared side by
 * side so `ThemeColor` stays the intersection of both and nothing can be
 * defined for one scheme only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#242523',
    background: '#F5F5F1',
    backgroundElement: '#EAEAE5',
    backgroundSelected: '#DEDFD8',
    textSecondary: '#636760',
    /** Brand / primary action. */
    tint: '#665000',
    onTint: '#242523',
    border: '#DCDDD6',
    primary: '#F4C430', surface: '#FFFFFF', navigation: '#246BAC',
    rest: '#E3DCEB', fuel: '#F0DFC4', positive: '#367923',
    departure: '#E8C2A6', onFeature: '#242523',
    danger: '#C22C24',
    /** Dim behind modal sheets. */
    scrim: 'rgba(11, 18, 21, 0.45)',
  },
  dark: {
    text: '#F5F5F1',
    background: '#141715',
    backgroundElement: '#252825',
    backgroundSelected: '#343833',
    textSecondary: '#B2B7AD',
    tint: '#F4C430',
    onTint: '#242523',
    border: '#41453E',
    primary: '#F4C430', surface: '#252825', navigation: '#70B4EF',
    rest: '#3B3345', fuel: '#443B2A', positive: '#86CD65',
    departure: '#E8C2A6', onFeature: '#242523',
    danger: '#F87171',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

/** Android's Material tab bar is taller than iOS's. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Minimum Android touch target, per Material guidance. */
export const MinTouchSize = 48;
