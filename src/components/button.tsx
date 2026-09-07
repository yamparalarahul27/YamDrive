import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  /** Fill the available width. Sheet footers use this. */
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  stretch = false,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const background =
    variant === 'primary'
      ? theme.tint
      : variant === 'danger'
        ? 'transparent'
        : theme.backgroundElement;
  const foreground =
    variant === 'primary' ? theme.onTint : variant === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'danger' ? theme.border : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        stretch && styles.stretch,
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={foreground} /> : null}
      <ThemedText type="smallBold" style={{ color: foreground }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stretch: {
    flex: 1,
  },
});
