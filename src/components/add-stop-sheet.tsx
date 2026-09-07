import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CategoryPicker } from '@/components/category-picker';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { categoryMeta } from '@/lib/categories';
import type { NewStop } from '@/lib/trip-store';
import type { StopCategory } from '@/lib/types';

/**
 * The in-progress stop. This doubles as the form state: the sheet is fully
 * controlled by its owner, so there is no prop-to-state copy to keep in sync
 * when the user picks a different point.
 */
export type StopDraft = {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  note?: string;
  category: StopCategory;
  /** Set when editing an existing stop rather than adding a new one. */
  editingId?: string;
};

export type AddStopSheetProps = {
  /** Null hides the sheet. */
  draft: StopDraft | null;
  onChange: (changes: Partial<StopDraft>) => void;
  onClose: () => void;
  onSubmit: (stop: NewStop, editingId?: string) => void;
};

const formatCoordinate = (latitude: number, longitude: number) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export function AddStopSheet({ draft, onChange, onClose, onSubmit }: AddStopSheetProps) {
  const isEditing = draft?.editingId !== undefined;

  const handleSubmit = () => {
    if (draft === null) return;

    const name = draft.name.trim();
    const note = draft.note?.trim();

    onSubmit(
      {
        // Reverse geocoding can come back empty; never save a nameless stop.
        name: name === '' ? `${categoryMeta(draft.category).label} stop` : name,
        category: draft.category,
        latitude: draft.latitude,
        longitude: draft.longitude,
        address: draft.address,
        note: note === '' ? undefined : note,
      },
      draft.editingId,
    );
  };

  return (
    <Sheet
      visible={draft !== null}
      onClose={onClose}
      title={isEditing ? 'Edit stop' : 'Add stop'}
      subtitle={
        draft ? (draft.address ?? formatCoordinate(draft.latitude, draft.longitude)) : undefined
      }
      footer={
        <>
          <Button label="Cancel" variant="secondary" onPress={onClose} stretch />
          <Button
            label={isEditing ? 'Save' : 'Add to trip'}
            icon={isEditing ? 'check' : 'plus'}
            onPress={handleSubmit}
            stretch
          />
        </>
      }>
      <View style={styles.body}>
        <TextField
          label="Name"
          value={draft?.name ?? ''}
          onChangeText={(name) => onChange({ name })}
          placeholder="Bharat Petroleum, Nashik bypass"
          autoCapitalize="words"
          returnKeyType="done"
        />

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            What is this stop for?
          </ThemedText>
          <CategoryPicker
            value={draft?.category ?? 'other'}
            onChange={(category) => onChange({ category })}
          />
        </View>

        <TextField
          label="Note (optional)"
          value={draft?.note ?? ''}
          onChangeText={(note) => onChange({ note })}
          placeholder="Fill up here — next pump is 90 km"
          multiline
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.one,
  },
});
