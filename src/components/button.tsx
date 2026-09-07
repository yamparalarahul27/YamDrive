import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { showActionHint } from '@/lib/action-hint';
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
  iconOnly?: boolean;
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
  iconOnly = false,
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
      accessibilityHint={iconOnly ? "Hold to show label" : undefined}
      onLongPress={iconOnly ? () => showActionHint(label) : undefined}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'danger' ? theme.border : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        stretch && styles.stretch,
        iconOnly && { width: 52, minHeight: 52, paddingHorizontal: 0 },
        style,
      ]}>
      {icon ? <Icon name={icon} size={iconOnly ? 24 : 18} color={foreground} /> : null}
      {!(iconOnly && icon) ? <ThemedText type="smallBold" style={{ color: foreground }}>
        {label}
      </ThemedText> : null}
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
