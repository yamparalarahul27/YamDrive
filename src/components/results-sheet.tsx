import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { categoryMeta } from '@/lib/categories';
import { formatDistanceKm, haversineKm } from '@/lib/geo';
import type { PlaceResult } from '@/lib/places';
import type { Coordinate, StopCategory } from '@/lib/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ResultsSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  loading: boolean;
  error: string | null;
  results: PlaceResult[];
  /** Category the results will be filed under when added. */
  category: StopCategory;
  /** Point distances are measured from — the map centre at search time. */
  origin: Coordinate;
  onAdd: (place: PlaceResult) => void;
  onFocus: (place: PlaceResult) => void;
};

export function ResultsSheet({
  visible,
  onClose,
  title,
  loading,
  error,
  results,
  category,
  origin,
  onAdd,
  onFocus,
}: ResultsSheetProps) {
  const theme = useTheme();
  const meta = categoryMeta(category);

  const subtitle = loading
    ? 'Searching…'
    : error
      ? undefined
      : `${results.length} ${results.length === 1 ? 'result' : 'results'} near the map centre`;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : error ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Icon name="alert-circle-outline" size={20} color={theme.danger} />
          <ThemedText type="small" style={styles.noticeText}>
            {error}
          </ThemedText>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Nothing found here. Try zooming out, panning somewhere else, or searching for
            something more specific.
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {results.map((place) => {
            const distance = haversineKm(origin, place);

            return (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                accessibilityLabel={`Show ${place.name} on the map`}
                onPress={() => onFocus(place)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}>
                <View style={[styles.rowIcon, { backgroundColor: meta.color }]}>
                  <Icon name={meta.icon} size={16} color="#FFFFFF" />
                </View>

                <View style={styles.rowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {place.name}
                  </ThemedText>
                  {place.address ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {place.address}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDistanceKm(distance)} away
                    {place.rating !== undefined ? ` · ★ ${place.rating.toFixed(1)}` : ''}
                  </ThemedText>
                </View>

                <IconButton
                  name="plus-circle"
                  accessibilityLabel={`Add ${place.name} to the trip`}
                  onPress={() => onAdd(place)}
                  color={theme.tint}
                  size={26}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
  },
  list: {
    // Keep the map visible behind the sheet.
    maxHeight: 340,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
});
