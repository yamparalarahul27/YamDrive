import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icon';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function RouteSummary({ origin, destination, detail, onTools, onPlan, onFit, hasRoute }: {
  origin: string; destination: string; detail: string; onTools: () => void;
  onPlan: () => void; onFit: () => void; hasRoute: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  return <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border,
    width: expanded ? '100%' : 'auto', borderRadius: expanded ? 16 : 24 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} route: ${origin} to ${destination}`}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.toggle}>
      <Icon name="map-marker-path" size={18} color={theme.tint} />
      <ThemedText type="smallBold" numberOfLines={expanded ? 2 : 1} style={[styles.title, { fontSize: expanded ? 15 : 13 }]}>{origin} → {destination}</ThemedText>
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
    </Pressable>
    {expanded ? <View style={styles.details}>
      <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText>
      <View style={styles.actions}>
        <Button label="Route & stops" icon="tune-variant" variant="secondary" onPress={onTools} stretch />
        {hasRoute ? <Button iconOnly label="Fit route" icon="fit-to-screen-outline" variant="secondary" onPress={onFit} /> : null}
        <Button iconOnly label="Edit ride plan" icon="pencil-outline" variant="secondary" onPress={onPlan} />
      </View>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { alignSelf: 'flex-start', maxWidth: '100%', borderWidth: StyleSheet.hairlineWidth },
  toggle: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, minWidth: 0, lineHeight: 20 },
  details: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
