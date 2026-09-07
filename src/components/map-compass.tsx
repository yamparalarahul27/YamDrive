import { useEffect, useRef, useState } from 'react';
import { Animated, PixelRatio, Platform, Pressable, StyleSheet, View } from 'react-native';
import Motion, { FadeIn, FadeOut, useReducedMotion, withTiming } from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { showActionHint } from '@/lib/action-hint';
import { compassDirection, compassLabel, unwrapAngle } from '@/lib/compass';

function usePointer(angle: number | null) {
  const [rotation] = useState(() => new Animated.Value(angle ?? 0));
  const previous = useRef<number | null>(angle);
  useEffect(() => {
    if (angle === null) { previous.current = null; return; }
    if (previous.current === null) { rotation.setValue(angle); previous.current = angle; return; }
    const target = unwrapAngle(previous.current, angle);
    previous.current = target;
    const animation = Animated.timing(rotation, { toValue: target, duration: 250, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [angle, rotation]);
  return rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' });
}

const blurSupported = Platform.OS === 'android' && Number(Platform.Version) >= 31;
const enterHeading = () => {
  'worklet';
  return { initialValues: { opacity: 0, filter: [{ blur: 3 }] }, animations: {
    opacity: withTiming(1, { duration: 240 }), filter: [{ blur: withTiming(0, { duration: 240 }) }],
  } };
};
const exitHeading = () => {
  'worklet';
  return { initialValues: { opacity: 1, filter: [{ blur: 0 }] }, animations: {
    opacity: withTiming(0, { duration: 180 }), filter: [{ blur: withTiming(3, { duration: 180 }) }],
  } };
};

export function MapCompass({ heading, onReset }: { heading: number | null; onReset: () => void }) {
  const reducedMotion = useReducedMotion();
  const label = compassLabel(heading);
  const travelRotation = usePointer(heading);
  const direction = compassDirection(heading);
  return <Pressable accessibilityRole="button" accessibilityLabel="Reset map to north"
    accessibilityValue={{ text: heading === null ? 'Travel heading unavailable' : `Travel heading ${direction}` }}
    accessibilityHint="North is fixed at the top. Green shows travel direction relative to north. Tap to stop heading following and rotate north-up."
    onPress={onReset} onLongPress={() => showActionHint('Yellow: north · Green: travel · Tap: north-up')} style={styles.dial}>
    <Svg width={56} height={56} viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
      {[0, 90, 180, 270].map(angle => <Line key={angle} x1={28} y1={4} x2={28} y2={7}
        stroke="#D4D7D1" strokeWidth={1} transform={`rotate(${angle} 28 28)`} />)}
    </Svg>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={56} height={56} viewBox="0 0 56 56"><Polygon transform={`translate(0 ${3 / PixelRatio.get()})`} points="28,0 22,10 34,10" fill="#F4C430" /></Svg>
    </View>
    {heading !== null ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: travelRotation }] }]}>
      <Svg width={56} height={56} viewBox="0 0 56 56"><Polygon transform={`translate(0 ${3 / PixelRatio.get()})`} points="28,1 24,8 32,8" fill="#367923" stroke="#367923" strokeWidth={1.8} strokeLinejoin="round" /></Svg>
    </Animated.View> : null}
    <View pointerEvents="none" style={styles.labelBox}>
      <Motion.View key={label} style={styles.labelLayer}
        entering={reducedMotion ? undefined : blurSupported ? enterHeading : FadeIn.duration(240)}
        exiting={reducedMotion ? undefined : blurSupported ? exitHeading : FadeOut.duration(180)}>
        <ThemedText style={styles.heading}>{Array.from(label).map((letter, index) => <ThemedText key={index} style={[styles.heading, letter !== letter.toUpperCase() && { fontSize: 10, fontWeight: '500' }]}>{letter}</ThemedText>)}</ThemedText>
      </Motion.View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  dial: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  labelBox: { width: 34, height: 24, alignItems: 'center', justifyContent: 'center' },
  labelLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  heading: { color: '#242523', fontSize: 13, lineHeight: 16, fontWeight: '600' },
});
