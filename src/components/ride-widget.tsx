import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { useRideSession } from '@/hooks/use-ride-session';
import { speedBand, type SpeedRange } from '@/lib/ride-speed';
export function RideWidget({ session, range, onSettings }: { session: ReturnType<typeof useRideSession>; range: SpeedRange | null; onSettings: () => void }) {
  const theme = useTheme();
  const band = speedBand(session.speed, session.demo ? session.demoRange : range);
  const colored = session.status === 'active' && band !== 'unknown';
  const background = colored ? band === 'below' ? '#F4C430' : band === 'above' ? '#B62E28' : '#367923' : theme.backgroundElement;
  const foreground = colored ? band === 'below' ? '#422006' : '#fff' : theme.text;
  const status = session.status === 'paused' ? 'Paused' : session.status === 'idle' ? 'Start' : band === 'unknown' ? 'GPS…' : band === 'below' ? 'Below' : band === 'above' ? 'Above' : 'In range';
  const start = () => { if (!range && !session.demo) onSettings(); else session.start(); };
  return <View style={[styles.pill, { backgroundColor: background }]}>
    <View accessible accessibilityLabel={`${session.demo ? 'Demo, ' : ''}${session.status !== 'active' ? `0 kilometres per hour, ${status}` : session.speed === null ? status : `${Math.round(session.speed)} kilometres per hour, ${status}`}`}>
      <ThemedText style={[styles.speed, { color: foreground }]}>{session.status !== 'active' ? '0' : session.speed === null ? '—' : Math.round(session.speed)}<ThemedText type="caption" style={{ color: foreground }}> km/h</ThemedText></ThemedText>
    </View>
    <IconButton name={session.status === 'active' ? 'pause' : 'play'} accessibilityLabel={session.status === 'active' ? 'Pause ride' : session.status === 'paused' ? 'Resume ride' : 'Start ride'} color={foreground} onPress={session.status === 'active' ? session.pause : start} />
  </View>;
}
const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingVertical: 8, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  speed: { fontSize: 36, lineHeight: 40, fontWeight: '500', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
});
