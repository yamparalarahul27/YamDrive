import { TransformRequestManager } from '@maplibre/maplibre-react-native';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { APP_AGENT, SERVICES } from '@/lib/open-services';

TransformRequestManager.addHeader({ id: 'pitstop-identification', name: 'User-Agent', value: APP_AGENT });
export const mapStyle: StyleSpecification = {
  version: 8, sources: { osm: { type: 'raster', tiles: [SERVICES.tiles], tileSize: 256, maxzoom: 19,
    attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};
