import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { showActionHint } from '@/lib/action-hint';
import { Icon, type IconName } from '@/components/icon';
import { MinTouchSize, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconButtonProps = {
  name: IconName;
  /** Required: an icon alone gives screen readers nothing to announce. */
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  /** Floating buttons over the map need a solid background and a shadow. */
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 22,
  color,
  disabled = false,
  elevated = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityHint="Hold to show label"
      disabled={disabled}
      onPress={onPress}
      onLongPress={() => showActionHint(accessibilityLabel)}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        elevated && [styles.elevated, { backgroundColor: theme.background }],
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
        style,
      ]}>
      <Icon name={name} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: MinTouchSize,
    minHeight: MinTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  elevated: {
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
