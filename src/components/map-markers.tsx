import { NavigationArrowIcon } from 'phosphor-react-native/src/icons/NavigationArrow';
import { Marker } from '@maplibre/maplibre-react-native';
import { View, Text, StyleSheet } from 'react-native';
import type { Position } from '@/lib/route-geometry';
export function MapPin({ id, point, label, color, onPress }: {
  id: string; point: Position; label: string; color: string; onPress?: () => void;
}) {
  return <Marker id={id} lngLat={point} onPress={onPress}>
    <View accessible accessibilityLabel={label} style={[styles.pin, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  </Marker>;
}
const styles = StyleSheet.create({
  pin: { minWidth: 28, height: 28, paddingHorizontal: 6, borderRadius: 14, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export function NavigationMarker({ point, heading, mapBearing, demo }: { point: Position; heading: number | null; mapBearing: number; demo: boolean }) {
  return <Marker id="navigation-position" lngLat={point}>
    <View accessible accessibilityLabel={`${demo ? 'Demo position' : 'Your position'}${heading === null ? ', heading unavailable' : ''}`}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
      {heading === null ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#2563eb' }} /> :
        <View style={{ transform: [{ rotate: `${heading - mapBearing + 45}deg` }] }}><NavigationArrowIcon size={30} color="#2563eb" weight="fill" /></View>}
    </View>
  </Marker>;
}
