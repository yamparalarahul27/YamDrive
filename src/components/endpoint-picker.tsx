import { Map, Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { MapPin } from '@/components/map-markers';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { mapStyle } from '@/lib/map-style';
import { searchPlaces, type PlaceResult } from '@/lib/places';
import type { EndpointPin } from '@/lib/ride-plan';

type Props = { title: string; label: string; initial?: EndpointPin; onClose: () => void; onSelect: (label: string, pin: EndpointPin) => void };
export function EndpointPicker({ title, label, initial, onClose, onSelect }: Props) {
  const theme = useTheme(), insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const camera = useRef<CameraRef>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState<EndpointPin | undefined>(initial);
  const [name, setName] = useState(label);
  const [locating, setLocating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 3) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchPlaces({ query, center: initial ?? { latitude: 16.3067, longitude: 80.4365 }, radiusMeters: 5000 });
        if (cancelled) return;
        const named = await Promise.all(found.slice(0, 4).map(async p => {
          try {
            const [address] = await Location.reverseGeocodeAsync(p);
            const description = address ? [...new Set([address.name, address.street, address.city, address.region].filter(Boolean))].join(', ') : '';
            return { ...p, name: description || p.name };
          } catch { return p; }
        }));
        if (cancelled) return;
        setResults(named);
        if (!found.length) setError('No matches. Try a nearby town, or tap the map.');
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Search unavailable. Choose a pin on the map.'); }
      finally { if (!cancelled) setLoading(false); }
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, initial]);
  const choose = (point: EndpointPin, text: string) => {
    setPin(point); setName(text.slice(0, 200)); setLoading(false); setQuery(''); setResults([]); setError(''); Keyboard.dismiss();
    camera.current?.flyTo({ center: [point.longitude, point.latitude], zoom: 14, duration: 500 });
  };
  const locate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Allow location access, or tap a pin on the map.');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (mounted.current) choose(fix.coords, 'My location');
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Location unavailable.'); }
    finally { if (mounted.current) setLocating(false); }
  };
  const surface = { backgroundColor: theme.background, borderColor: theme.border };
  return <Modal visible animationType="slide" supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Map mapStyle={mapStyle} style={{ flex: 1 }} logo={false} attribution={false}
        onDidFailLoadingMap={() => setError('Map unavailable. Check your connection.')}
        onPress={e => { const [longitude, latitude] = e.nativeEvent.lngLat; setPin({ latitude, longitude }); setName('Map pin'); setQuery(''); setResults([]); setLoading(false); Keyboard.dismiss(); }}>
        <Camera ref={camera} initialViewState={{ center: initial ? [initial.longitude, initial.latitude] : [80.4365, 16.3067], zoom: initial ? 13 : 6 }} />
        {pin ? <MapPin id="endpoint" point={[pin.longitude, pin.latitude]} label={title === 'Start' ? 'A' : 'B'} color={theme.tint} /> : null}
      </Map>
      <View style={[styles.top, { top: insets.top + 8, left: insets.left + 12, right: insets.right + 12 }, landscape && { width: Math.min(340, width * 0.45), right: undefined }]}>
        <View style={[styles.row, styles.card, surface]}><IconButton name="close" accessibilityLabel="Cancel location selection" onPress={onClose} />
          <TextInput style={{ flex: 1, minWidth: 0, fontSize: 16, color: theme.text }} accessibilityLabel={`Search ${title.toLowerCase()}`} placeholder={`Search ${title.toLowerCase()}`} placeholderTextColor={theme.textSecondary} value={query} onChangeText={value => { setQuery(value); setResults([]); setError(''); setLoading(false); }} returnKeyType="search" />
          {loading ? <ActivityIndicator color={theme.tint} /> : <IconButton name="crosshairs-gps" accessibilityLabel="Use my location" disabled={locating} onPress={() => void locate()} />}</View>
        {results.length ? <ScrollView keyboardShouldPersistTaps="handled" style={[styles.card, surface, { maxHeight: Math.min(180, height * 0.4) }]}>{results.map(result =>
          <Pressable key={result.id} accessibilityRole="button" style={styles.result} onPress={() => choose(result, result.name)}>
            <ThemedText type="smallBold">{result.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)} · tap to preview</ThemedText>
          </Pressable>)}</ScrollView> : null}
        {error ? <View style={[styles.card, surface]}><ThemedText type="small">{error}</ThemedText></View> : null}
      </View>
      <View style={[styles.bottom, { bottom: insets.bottom + 8, left: insets.left + 12, right: insets.right + 12 }, landscape && { width: Math.min(340, width * 0.45), left: undefined }]}>
        <View style={[styles.card, surface]}><ThemedText type="smallBold">{pin ? name : 'Tap the map to place a pin'}</ThemedText>
          {pin ? <ThemedText type="small" themeColor="textSecondary">{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)} · tap map to adjust</ThemedText> : null}
          <Button label={`Use as ${title.toLowerCase()}`} icon="check" disabled={!pin} onPress={() => { if (pin) onSelect(name === 'Map pin' ? `Pin ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}` : name, pin); }} />
        </View>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={{ backgroundColor: '#ffffffee', alignSelf: 'flex-start' }}><ThemedText type="small" style={{ color: '#1e293b', fontSize: 10 }}>© OpenStreetMap contributors</ThemedText></Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  top: { position: 'absolute', gap: 6 }, bottom: { position: 'absolute', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  result: { minHeight: 52, paddingVertical: 10, gap: 4 },
});
