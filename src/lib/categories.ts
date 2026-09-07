import type { IconName } from '@/components/icon';
import type { StopCategory } from '@/lib/types';

export type CategoryMeta = {
  label: string;
  /** MaterialCommunityIcons glyph name. */
  icon: IconName;
  /** Marker + chip colour. Kept distinct enough to tell apart on a map. */
  color: string;
  /**
   * Text query used for nearby search. Free text rather than a Places type
   * enum so regional phrasing works ("petrol pump" reads better than
   * "gas station" in India). Tune these to your region.
   */
  nearbyQuery: string;
};

export const CATEGORIES: Record<StopCategory, CategoryMeta> = {
  fuel: {
    label: 'Fuel',
    icon: 'gas-station',
    color: '#EA580C',
    nearbyQuery: 'petrol pump',
  },
  food: {
    label: 'Food',
    icon: 'silverware-fork-knife',
    color: '#DC2626',
    nearbyQuery: 'restaurant',
  },
  rest: {
    label: 'Break',
    icon: 'coffee-outline',
    color: '#0891B2',
    nearbyQuery: 'rest stop cafe',
  },
  stay: {
    label: 'Stay',
    icon: 'bed-outline',
    color: '#7C3AED',
    nearbyQuery: 'hotel',
  },
  sight: {
    label: 'Sight',
    icon: 'camera-outline',
    color: '#059669',
    nearbyQuery: 'tourist attraction',
  },
  other: {
    label: 'Other',
    icon: 'map-marker-outline',
    color: '#475569',
    nearbyQuery: 'point of interest',
  },
};

/** Display order for pickers and the nearby-search bar. */
export const CATEGORY_ORDER: StopCategory[] = ['fuel', 'food', 'rest', 'stay', 'sight', 'other'];

/** Categories offered as one-tap nearby searches. `other` is too vague to help. */
export const NEARBY_CATEGORIES: StopCategory[] = ['fuel', 'food', 'rest', 'stay', 'sight'];

export function categoryMeta(category: StopCategory): CategoryMeta {
  return CATEGORIES[category] ?? CATEGORIES.other;
}

export { isStopCategory } from './types.ts';
