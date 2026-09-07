import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/sheet';
import { Button } from '@/components/button';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceKm, formatDuration } from '@/lib/geo';
import type { ElevationStats } from '@/lib/ride-overview';

type Props = { totalKm: number; totalMinutes: number; landscape: boolean; remainingKm: number | null; minutes: number | null; nextStop?: { name: string; km: number }; destination: string; breaks: number; paused: boolean; demo: boolean; elevation: ElevationStats | null; now: number; onEnd: () => void; onStops: () => void };
export function RideOverview(p: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const arrival = p.minutes === null || p.paused ? '—' : new Date(p.now + p.minutes * 60000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const remaining = p.remainingKm === null ? 'Position unavailable' : `${formatDistanceKm(p.remainingKm)} left`;
  const freshAltitude = !p.demo && !p.paused && p.elevation && p.now - p.elevation.timestamp <= 8000 ? Math.round(p.elevation.current) : null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open ride summary" onPress={() => setOpen(true)} style={{ flexDirection: 'row', gap: 4 }}>
      {[
        { label: remaining, ratio: p.remainingKm === null || p.totalKm <= 0 ? 0 : 1 - p.remainingKm / p.totalKm, fill: '#D5DDBB' },
        { label: p.minutes === null ? 'Time unavailable' : `~${formatDuration(p.minutes)} left`, ratio: p.minutes === null || p.totalMinutes <= 0 ? 0 : 1 - p.minutes / p.totalMinutes, fill: '#E3D9EC' },
      ].map((bar, index) => <View key={index}
        style={{ flex: 1, minWidth: 0, minHeight: p.landscape ? 48 : 44, justifyContent: 'center', backgroundColor: '#F5F5F1', borderRadius: 12, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.max(0, Math.min(1, bar.ratio)) * 100}%`, backgroundColor: bar.fill }} />
        <ThemedText type="caption" style={{ color: '#242523', paddingHorizontal: 10, paddingVertical: 4, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{bar.label}</ThemedText>
      </View>)}
    </Pressable>
    <Sheet visible={open} onClose={() => setOpen(false)} title="Ride summary" subtitle={p.destination} showHandle>
      <View style={{ gap: 12 }}>
        <ThemedText type="smallBold">{remaining} · {p.minutes === null ? '—' : `~${formatDuration(p.minutes)}`}</ThemedText>
        <ThemedText>Estimated arrival · {arrival}{arrival === '—' ? '' : ' IST'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{p.demo ? 'Demo preview. ' : ''}Approximate route time and planning pace, including {p.breaks} remaining planned breaks. No live traffic. Extra stops and delays can change arrival.</ThemedText>
        {p.nextStop ? <ThemedText>Next: {p.nextStop.name} · {formatDistanceKm(p.nextStop.km)}</ThemedText> : null}
        <View style={{ backgroundColor: theme.backgroundElement, borderRadius: 16, padding: 16, gap: 6 }}>
          <ThemedText type="smallBold">Elevation · metres</ThemedText>
          <ThemedText style={{ fontSize: 28, lineHeight: 34 }}>{freshAltitude === null ? '—' : `${freshAltitude} m`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Low {p.elevation ? Math.round(p.elevation.lowest) : '—'} · High {p.elevation ? Math.round(p.elevation.highest) : '—'}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{p.demo ? 'Elevation is not simulated.' : 'GPS estimate · valid readings from this ride only. Unavailable or inaccurate readings are ignored.'}</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Route & stops" variant="secondary" stretch onPress={() => { setOpen(false); p.onStops(); }} />
          <Button label={p.demo ? 'End demo' : 'End ride'} stretch onPress={() => { setOpen(false); p.onEnd(); }} />
        </View>
      </View>
    </Sheet>
  </>;
}
