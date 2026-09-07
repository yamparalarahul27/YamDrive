/**
 * Colours, spacing and radii for the app. Light and dark are declared side by
 * side so `ThemeColor` stays the intersection of both and nothing can be
 * defined for one scheme only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1215',
    background: '#FFFFFF',
    backgroundElement: '#F2F4F5',
    backgroundSelected: '#E2E6E8',
    textSecondary: '#5A6572',
    /** Brand / primary action. */
    tint: '#0F766E',
    onTint: '#FFFFFF',
    border: '#D9DEE2',
    danger: '#C22C24',
    /** Dim behind modal sheets. */
    scrim: 'rgba(11, 18, 21, 0.45)',
  },
  dark: {
    text: '#F2F5F7',
    background: '#0B1215',
    backgroundElement: '#181F23',
    backgroundSelected: '#252E33',
    textSecondary: '#9BA6B2',
    tint: '#2DD4BF',
    onTint: '#04211E',
    border: '#2A343A',
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
    sans: 'normal',
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
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Android's Material tab bar is taller than iOS's. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Minimum Android touch target, per Material guidance. */
export const MinTouchSize = 44;
