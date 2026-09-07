import { Image, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

/** A compact identity on planning screens; the riding map stays unobstructed. */
export function Brand() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 }}>
    <Image source={require('../../assets/images/icon.png')} accessible={false} style={{ width: 24, height: 24, borderRadius: 8 }} />
    <ThemedText style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: -0.2 }}>YamDrive</ThemedText>
  </View>;
}
