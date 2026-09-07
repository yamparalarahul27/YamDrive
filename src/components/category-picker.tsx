import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_ORDER, categoryMeta } from '@/lib/categories';
import type { StopCategory } from '@/lib/types';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CategoryPickerProps = {
  value: StopCategory;
  onChange: (category: StopCategory) => void;
};

/** Single-select chip row. The selected chip takes on the category colour. */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {CATEGORY_ORDER.map((category) => {
        const meta = categoryMeta(category);
        const selected = category === value;

        return (
          <Pressable
            key={category}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={meta.label}
            onPress={() => onChange(category)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? meta.color : theme.backgroundElement,
                borderColor: selected ? meta.color : theme.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Icon name={meta.icon} size={16} color={selected ? '#FFFFFF' : meta.color} />
            <ThemedText type="small" style={{ color: selected ? '#FFFFFF' : theme.text }}>
              {meta.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    minHeight: MinTouchSize - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
