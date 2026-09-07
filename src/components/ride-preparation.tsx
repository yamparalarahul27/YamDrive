import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { RidePlan } from '@/lib/ride-plan';
import { PRE_RIDE_CHECKS, parseDepartureTime, plannedClock } from '@/lib/ride-preparation';

export function RidePreparation({ plan, elapsedMinutes, onChange }: { plan: RidePlan; elapsedMinutes: number; onChange: (plan: RidePlan) => void }) {
  const theme = useTheme(), { height } = useWindowDimensions(), insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<'departure' | 'checks' | null>(null);
  const [time, setTime] = useState(plan.departureTime ?? '05:00');
  const [error, setError] = useState('');
  const checked = plan.preRideChecks ?? [];
  const surface = { backgroundColor: theme.backgroundElement, borderColor: theme.border };
  const saveTime = () => {
    const value = time.trim();
    if (!parseDepartureTime(value)) { setError('Use 24-hour time, for example 05:00 or 16:30.'); return; }
    onChange({ ...plan, departureTime: value, preRideChecks: value === plan.departureTime ? checked : [] });
    setSheet(null);
  };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Set departure time" style={[styles.card, styles.row, surface]}
      onPress={() => { setTime(plan.departureTime ?? '05:00'); setError(''); setSheet('departure'); }}>
      <Icon name="clock" size={24} color={theme.tint} />
      <View style={{ flex: 1 }}><ThemedText type="smallBold">{plan.departureTime ? `Depart ${plannedClock(plan.departureTime)}` : 'Set departure'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{plan.departureTime ? `Arrive ~${plannedClock(plan.departureTime, elapsedMinutes)} · IST` : 'Plan stop times · India (IST)'}</ThemedText></View>
      <Icon name="pencil-outline" color={theme.textSecondary} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Pre-ride checklist, ${checked.length} of ${PRE_RIDE_CHECKS.length} checked`} style={[styles.card, styles.row, surface]} onPress={() => setSheet('checks')}>
      <Icon name="checklist" size={24} color={theme.tint} />
      <ThemedText type="smallBold" style={{ flex: 1 }}>Before you ride</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{checked.length}/{PRE_RIDE_CHECKS.length}</ThemedText><Icon name="chevron-down" color={theme.textSecondary} />
    </Pressable>
    <View style={[styles.card, styles.row, surface]}>
      <View style={{ flex: 1 }}><ThemedText type="smallBold">Light map</ThemedText><ThemedText type="small" themeColor="textSecondary">Less animation · best for Nokia</ThemedText></View>
      <Switch accessibilityLabel="Light map" value={plan.lightMap !== false} onValueChange={lightMap => onChange({ ...plan, lightMap })} trackColor={{ true: theme.tint }} />
    </View>
    <Sheet visible={sheet !== null} title={sheet === 'checks' ? 'Before you ride' : 'Departure'} onClose={() => setSheet(null)}
      footer={sheet === 'departure' ? <Button label="Save time" icon="check" onPress={saveTime} stretch /> : undefined}>
      <ScrollView style={{ maxHeight: Math.max(100, height - insets.top - insets.bottom - 240) }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
        {sheet === 'departure' ? <>
          <TextField label="Start time (IST · 24-hour)" value={time} placeholder="05:00" maxLength={5} onChangeText={value => { setTime(value); setError(''); }} autoCorrect={false} />
          <View style={[styles.row, { flexWrap: 'wrap' }]}>{['04:00', '04:30', '05:00', '06:00'].map(value => <Button key={value} label={value} variant={time === value ? 'primary' : 'secondary'} onPress={() => { setTime(value); setError(''); }} />)}</View>
          <ThemedText type="small" themeColor="textSecondary">India · IST (UTC+5:30). Estimates, not an alarm. Stop times include planned breaks; traffic and extra delays can change arrival.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">4–5 AM may mean riding in darkness. Choose a time that allows enough sleep and good visibility; fuel up beforehand.</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Changing departure time resets your checklist for the new plan.</ThemedText>
          {plan.departureTime ? <Button label="Clear time" variant="secondary" onPress={() => { onChange({ ...plan, departureTime: undefined, preRideChecks: [] }); setSheet(null); }} /> : null}
          {error ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</ThemedText> : null}
        </> : <>
          <ThemedText type="small" themeColor="textSecondary">{checked.length}/{PRE_RIDE_CHECKS.length} checked for this plan. Reset before each new ride.</ThemedText>
          {(['Before ride day', 'Before departure'] as const).map(group => <View key={group} style={{ gap: 6 }}>
            <ThemedText type="smallBold">{group}</ThemedText>
            {PRE_RIDE_CHECKS.filter(item => item.group === group).map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityHint={item.detail}
              accessibilityState={{ checked: checked.includes(item.id) }} style={[styles.check, { borderColor: theme.border }]}
              onPress={() => onChange({ ...plan, preRideChecks: checked.includes(item.id) ? checked.filter(id => id !== item.id) : [...checked, item.id] })}>
              <Icon name={checked.includes(item.id) ? 'check-square' : 'square'} color={checked.includes(item.id) ? theme.tint : theme.textSecondary} size={24} />
              <View style={{ flex: 1 }}><ThemedText type="smallBold">{item.title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.detail}</ThemedText></View>
            </Pressable>)}
          </View>)}
          <ThemedText type="small" themeColor="textSecondary">Checks are your record, not a mechanical diagnosis. Follow your bike manual; have brake, steering or alignment faults assessed before riding.</ThemedText>
          <Button label="Reset checks" variant="secondary" onPress={() => onChange({ ...plan, preRideChecks: [] })} />
          <Button label="Bike manual" variant="secondary" onPress={() => void Linking.openURL('https://www.royalenfield.com/in/en/support/owners-manual/')} />
          <Button label="MSF check guide" variant="secondary" onPress={() => void Linking.openURL('https://msf-usa.org/documents/library/t-clocs-pre-ride-inspection-checklist/')} />
        </>}
      </ScrollView>
    </Sheet>
  </>;
}
const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
