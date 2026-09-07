import { GasPumpIcon } from 'phosphor-react-native/src/icons/GasPump';
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

export function NavigationMarker({ point, heading, mapBearing, demo, roadLabel }: { roadLabel?: string; point: Position; heading: number | null; mapBearing: number; demo: boolean }) {
  return <Marker id="navigation-position" lngLat={point} anchor="top" offset={[0, -22]}>
    <View style={{ alignItems: 'center' }}>
    <View accessible accessibilityLabel={`${demo ? 'Demo position' : 'Your position'}${heading === null ? ', heading unavailable' : ''}`}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
      {heading === null ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#2563eb' }} /> :
        <View style={{ transform: [{ rotate: `${heading - mapBearing + 45}deg` }] }}><NavigationArrowIcon size={30} color="#2563eb" weight="fill" /></View>}
    </View>
    {roadLabel ? <View style={{ marginTop: 4, backgroundColor: '#1769AA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, width: 168 }}><Text numberOfLines={1} style={{ color: '#fff', fontSize: 11, lineHeight: 15 }}>Toward {roadLabel}</Text></View> : null}
    </View>
  </Marker>;
}

export function PetrolMarker({ id, point, label, planned = false, selected = false, onPress }: {
  id: string; point: Position; label: string; planned?: boolean; selected?: boolean; onPress?: () => void;
}) {
  return <Marker id={id} lngLat={point} anchor="bottom" onPress={onPress}>
    <View accessible accessibilityLabel={`${planned ? 'Planned refuelling area' : 'Petrol stop'}: ${label}`} style={{ alignItems: 'center', padding: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#242523', borderRadius: 24,
        padding: 4, paddingRight: 12, borderWidth: 2, borderColor: selected ? '#F4C430' : '#fff', maxWidth: 174 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: planned ? '#E9C2A8' : '#F4C430', alignItems: 'center', justifyContent: 'center' }}>
          <GasPumpIcon size={20} color="#242523" weight="fill" />
        </View>
        <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '600', flexShrink: 1 }}>{label}</Text>
      </View>
      <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#242523' }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#242523', backgroundColor: '#fff', marginTop: 2 }} />
    </View>
  </Marker>;
}
