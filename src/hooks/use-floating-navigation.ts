import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useFloatingNavigation() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const dockWidth = Math.min(landscape ? 320 : 360, width - insets.left - insets.right - 32);
  const bottom = insets.bottom + 12;
  const style = useMemo<ViewStyle>(() => ({
    position: 'absolute', start: (width - dockWidth) / 2, end: (width - dockWidth) / 2,
    bottom, height: 56, paddingBottom: 0, paddingTop: 0,
    backgroundColor: '#202220', borderTopWidth: 0, borderRadius: 28,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  }), [width, dockWidth, bottom]);
  return { style, clearance: bottom + 72, landscape };
}
