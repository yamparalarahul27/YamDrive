/** A plain WGS84 point. Structurally compatible with react-native-maps' LatLng. */
export type Coordinate = {
  latitude: number;
  longitude: number;
};

/**
 * What a stop is for. Drives the marker colour/icon and the nearby-search
 * query, so adding a category means touching `categories.ts` and nothing else.
 */
export type StopCategory = 'fuel' | 'food' | 'rest' | 'stay' | 'sight' | 'other';

export type Stop = Coordinate & {
  id: string;
  name: string;
  category: StopCategory;
  /** Reverse-geocoded or from a Places result. Display only. */
  address?: string;
  /** Free-text reminder: "fill up before the ghat section", etc. */
  note?: string;
  createdAt: number;
};

/**
 * One trip in stop order. v1 keeps a single active trip; the shape is already
 * id'd so a trip list can be layered on without a migration.
 */
export type Trip = {
  id: string;
  name: string;
  stops: Stop[];
  updatedAt: number;
};
