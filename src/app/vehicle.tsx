import { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/text-field';
import { Sheet } from '@/components/sheet';
import { useTheme } from '@/hooks/use-theme';
import { useVehicle } from '@/lib/vehicle-store';
import { energyEstimate, serviceDue, HUNTER_MANUAL } from '@/lib/vehicle-dashboard';
import { fuelMetrics, type Vehicle } from '@/lib/vehicle';

type Editor = 'details' | 'fuel' | 'service' | 'maintenance' | 'energy' | 'health';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
export default function VehicleScreen() {
  const router = useRouter(), theme = useTheme(), insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { vehicle: v, ready, error } = useVehicle();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [editor, setEditor] = useState<Editor | null>(section === 'health' ? 'health' : section === 'energy' ? 'energy' : null);
  const energy = energyEstimate(v);
  const due = serviceDue(v, today());
  const landscape = width > height;
  const contentWidth = width - insets.left - insets.right - 32;
  const columnWidth = landscape ? (contentWidth - 16) / 2 : contentWidth;
  const bikeWidth = Math.max(1, columnWidth - 40);
  const bikeHeight = Math.min(bikeWidth / 1.5, landscape ? 200 : 240);
  const fills = v.fuelFills ?? [];
  const metrics = fuelMetrics(fills);
  const card = [styles.card, { backgroundColor: theme.surface }];
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, gap: 20 }}>
      <View style={styles.row}>
        <Button iconOnly icon="arrow-left" label="Back" variant="secondary" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <ThemedText type="label" style={{ flex: 1 }}>Vehicle info</ThemedText>
        <Button iconOnly icon="pencil-outline" label="Edit" variant="secondary" disabled={!ready} onPress={() => setEditor('details')} />
      </View>
      {error ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</ThemedText> : null}
      <View style={{ flexDirection: landscape ? 'row' : 'column', alignItems: 'flex-start', gap: 16 }}>
        <View style={[styles.card, { backgroundColor: '#FFFFFF', width: columnWidth, overflow: 'hidden' }]}>
          <ThemedText type="caption" style={{ color: '#636760' }}>{v.make}</ThemedText>
          <ThemedText style={{ color: '#242523', fontSize: 28, lineHeight: 34, fontWeight: '500' }}>{v.model}</ThemedText>
          <Image source={require('../../assets/images/vehicles/hunter-350-2022-rebel-red-side.png')} accessibilityLabel={`${v.make} ${v.model}`} resizeMode="contain" style={{ width: bikeWidth, height: bikeHeight, alignSelf: 'center' }} />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View><ThemedText type="caption" style={{ color: '#636760' }}>Year</ThemedText><ThemedText type="metric" style={{ color: '#242523' }}>{v.year}</ThemedText></View>
            <View><ThemedText type="caption" style={{ color: '#636760' }}>Odometer</ThemedText><ThemedText type="metric" style={{ color: '#242523' }}>{v.odometer.toLocaleString('en-IN')} km</ThemedText></View>
          </View>
        </View>
        <View style={{ gap: 16, width: columnWidth }}>
          <View style={card}>
            <ThemedText type="label">Fuel & mileage</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{energy ? `Estimated range ~${energy.rangeKm} km · ~${energy.litres.toFixed(1)} L` : 'Range needs tank capacity and two full-tank fills.'}</ThemedText>
            <Button label="Energy settings" variant="secondary" disabled={!ready} onPress={() => setEditor('energy')} />
            <View style={styles.row}>
              <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}><ThemedText type="metric">{metrics.kmPerLitre?.toFixed(1) ?? '—'}</ThemedText><ThemedText type="caption">km/L · Last tank</ThemedText></View>
              <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}><ThemedText type="metric">{metrics.costPerKm === null ? '—' : `₹${metrics.costPerKm.toFixed(2)}`}</ThemedText><ThemedText type="caption">per km · Fuel cost</ThemedText></View>
            </View>
            {metrics.kmPerLitre === null ? <ThemedText type="caption" themeColor="textSecondary">Add two full-tank fills to calculate mileage. Include every partial fill between them.</ThemedText> : null}
            <ThemedText type="small" themeColor="textSecondary">Total fuel spend · ₹{metrics.spend.toLocaleString('en-IN')}</ThemedText>
            <Button label="Add fuel fill" icon="gas-station" variant="secondary" disabled={!ready} onPress={() => setEditor('fuel')} />
            {[...fills].sort((a, b) => b.km - a.km).map((f, i) => <View key={i} style={{ gap: 4 }}><ThemedText type="smallBold">{dateLabel(f.date)} · {f.km.toLocaleString('en-IN')} km</ThemedText><ThemedText type="caption" themeColor="textSecondary">{f.litres} L · ₹{f.cost.toLocaleString('en-IN')} · {f.full ? 'Full tank' : 'Partial fill'}</ThemedText></View>)}
          </View>
          <View style={card}>
            <ThemedText type="label">Service history</ThemedText>
            <ThemedText type="small">{due ? `${due.due ? 'Service due' : 'Next service'} · ${due.km === undefined ? '' : `${due.km.toLocaleString('en-IN')} km`}${due.date ? ` · ${due.date}` : ''}` : 'Set your service schedule'}</ThemedText>
            <Button label="Service reminders" variant="secondary" disabled={!ready} onPress={() => setEditor('health')} />
            {v.services.length ? v.services.map((service, i) => <View key={i} style={{ gap: 4 }}>
              <ThemedText type="smallBold">{dateLabel(service.date)} · {service.km.toLocaleString('en-IN')} km</ThemedText>
              {service.notes ? <ThemedText type="small" themeColor="textSecondary">{service.notes}</ThemedText> : null}
            </View>) : <ThemedText type="small" themeColor="textSecondary">Add your last service to keep it handy.</ThemedText>}
            <Button label="Add service" icon="plus" variant="secondary" disabled={!ready} onPress={() => setEditor('service')} />
          </View>
          <View style={card}>
            <ThemedText type="label">Tyres & maintenance</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{v.maintenance || 'Keep tyre details, brake, chain and oil notes here.'}</ThemedText>
            <Button label={v.maintenance ? 'Edit notes' : 'Add notes'} icon="pencil-outline" variant="secondary" disabled={!ready} onPress={() => setEditor('maintenance')} />
          </View>
        </View>
      </View>
    </ScrollView>
    {editor && ready ? <VehicleEditor mode={editor} vehicle={v} onClose={() => setEditor(null)} /> : null}
  </>;
}
function VehicleEditor({ mode, vehicle, onClose }: { mode: Editor; vehicle: Vehicle; onClose: () => void }) {
  const { save } = useVehicle(), theme = useTheme();
  const [make, setMake] = useState(vehicle.make), [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(String(vehicle.year)), [km, setKm] = useState(String(vehicle.odometer));
  const [litres, setLitres] = useState(''), [cost, setCost] = useState(''), [date, setDate] = useState(today());
  const [tank, setTank] = useState(vehicle.tankLitres?.toString() ?? '');
  const [purchase, setPurchase] = useState(vehicle.purchaseDate ?? '');
  const [milestone, setMilestone] = useState(vehicle.completedServiceKm?.toString() ?? '');
  const [dueKm, setDueKm] = useState(vehicle.nextServiceKm?.toString() ?? '');
  const [dueDate, setDueDate] = useState(vehicle.nextServiceDate ?? '');
  const [full, setFull] = useState(false);
  const [notes, setNotes] = useState(mode === 'maintenance' ? vehicle.maintenance : '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit() {
    setError(''); setBusy(true);
    try {
      const next = { ...vehicle };
      if (mode === 'details') { if (!year.trim() || !km.trim()) throw new Error('Enter year and odometer.'); Object.assign(next, { make, model, year: Number(year), odometer: Number(km) }); }
      if (mode === 'fuel') {
        if (!km.trim() || Number(km) < vehicle.odometer) throw new Error('Enter the current odometer, at least the saved vehicle mileage.');
        if ((vehicle.fuelFills ?? []).some(f => f.km >= Number(km) || f.date > date)) throw new Error('New fills must follow the previous fill date and odometer.');
        next.odometer = Number(km);
        next.fuelFills = [...(vehicle.fuelFills ?? []), { km: Number(km), litres: Number(litres), cost: Number(cost), full, date }];
      }
      if (mode === 'service') { if (!km.trim()) throw new Error('Enter the service mileage.'); next.services = [{ date, km: Number(km), notes: notes.trim() }, ...vehicle.services].sort((a, b) => b.date.localeCompare(a.date)); }
      if (mode === 'energy') { next.tankLitres = tank.trim() ? Number(tank) : undefined; if (!km.trim()) throw new Error('Enter the current odometer.'); next.odometer = Number(km); }
      if (mode === 'health') Object.assign(next, { purchaseDate: purchase.trim() || undefined, completedServiceKm: milestone.trim() ? Number(milestone) : undefined, nextServiceKm: dueKm.trim() ? Number(dueKm) : undefined, nextServiceDate: dueDate.trim() || undefined });
      if (mode === 'maintenance') next.maintenance = notes.trim();
      await save(next); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  }
  return <Sheet visible onClose={() => { if (!busy) onClose(); }} title={{ details: 'Edit vehicle', fuel: 'Add fuel fill', service: 'Add service', maintenance: 'Maintenance notes', energy: 'Energy settings', health: 'Service reminders' }[mode]} showHandle topPadding={16}
    footer={<Button label={busy ? 'Saving…' : 'Save'} disabled={busy} stretch onPress={() => void submit()} />}>
    <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
      {mode === 'energy' ? <><TextField label="Tank capacity · litres" value={tank} onChangeText={setTank} keyboardType="decimal-pad" maxLength={6} /><TextField label="Current odometer · km" value={km} onChangeText={setKm} keyboardType="number-pad" maxLength={7} /><ThemedText type="small" themeColor="textSecondary">Range uses this odometer and your recorded fills. Update it after riding; GPS rides do not update it automatically. Log every fill. Estimates change with riding conditions.</ThemedText></> : null}
      {mode === 'health' ? <><ThemedText type="small" themeColor="textSecondary">2022 Hunter 350: 500 km / 45 days, then 5,000 km / 6-month milestones from purchase, whichever comes first. Confirm the scheduled milestone completed, not an unrelated repair. Other models use workshop due values below.</ThemedText><TextField label="Purchase date · YYYY-MM-DD" value={purchase} onChangeText={setPurchase} maxLength={10} /><TextField label="Last completed milestone · km (0 if none)" value={milestone} onChangeText={setMilestone} keyboardType="number-pad" maxLength={7} placeholder="500, 5000, 10000…" /><ThemedText type="label">Workshop override · optional</ThemedText><TextField label="Next service · km" value={dueKm} onChangeText={setDueKm} keyboardType="number-pad" maxLength={7} /><TextField label="Next service date · YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} maxLength={10} /><ThemedText type="caption" themeColor="textSecondary">Service reminders describe scheduled maintenance, not mechanical condition. Severe or dusty riding can require earlier maintenance.</ThemedText><Button label="Official manual" variant="secondary" onPress={() => { void Linking.openURL(HUNTER_MANUAL).catch(() => setError('Could not open the manual.')); }} /></> : null}
      {mode === 'details' ? <><TextField label="Make" value={make} onChangeText={setMake} maxLength={60} /><TextField label="Model" value={model} onChangeText={setModel} maxLength={60} /><TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} /><TextField label="Odometer · km" value={km} onChangeText={setKm} keyboardType="number-pad" maxLength={7} /></> : null}
      {mode === 'fuel' ? <><TextField label="Fill date · YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} /><TextField label="Odometer · km" value={km} onChangeText={setKm} keyboardType="number-pad" maxLength={7} /><TextField label="Petrol · litres" value={litres} onChangeText={setLitres} keyboardType="decimal-pad" maxLength={6} /><TextField label="Total cost · ₹" value={cost} onChangeText={setCost} keyboardType="decimal-pad" maxLength={9} /><View style={styles.row}><ThemedText style={{ flex: 1 }}>Filled to full tank</ThemedText><Switch accessibilityLabel="Filled to full tank" value={full} onValueChange={setFull} trackColor={{ true: theme.primary }} /></View><ThemedText type="caption" themeColor="textSecondary">Confirm the bike odometer. Saving updates your vehicle mileage.</ThemedText></> : null}
      {mode === 'service' ? <><TextField label="Service date · YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} /><TextField label="Odometer at service · km" value={km} onChangeText={setKm} keyboardType="number-pad" maxLength={7} /></> : null}
      {mode === 'service' || mode === 'maintenance' ? <TextField label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={2000} placeholder={mode === 'maintenance' ? 'Tyres, brakes, chain, oil…' : 'Work done, workshop…'} /> : null}
      {error ? <ThemedText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</ThemedText> : null}
    </ScrollView>
  </Sheet>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 20, borderRadius: 24, gap: 12 },
  metric: { flex: 1, padding: 16, borderRadius: 16, gap: 4 },
});
