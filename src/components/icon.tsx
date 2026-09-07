import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

/**
 * The app draws from a single icon set so glyph weights stay consistent.
 * Re-exported as one component to keep that decision in one place.
 */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: ComponentProps<typeof MaterialCommunityIcons>['style'];
};

export function Icon({ name, size = 20, color, style }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
