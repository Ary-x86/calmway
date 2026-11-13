import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { config } from '@/services/config';
import type { ColorScheme } from '../tokens';
import base from './positron-base.json';

/**
 * Calmway map style. Starts from OpenFreeMap's Positron layer set (quiet by
 * design) and recolours it to the app palette. Highways are drawn in a soft
 * sand tone so they read as "busy" without looking alarming.
 */
interface MapColors {
  background: string;
  park: string;
  wood: string;
  residential: string;
  ice: string;
  water: string;
  waterway: string;
  building: string;
  buildingOutline: string;
  path: string;
  minor: string;
  major: string;
  majorCasing: string;
  majorSubtle: string;
  motorway: string;
  motorwayCasing: string;
  motorwaySubtle: string;
  tunnel: string;
  rail: string;
  railDash: string;
  boundary: string;
  label: string;
  labelStrong: string;
  labelHalo: string;
  waterLabel: string;
  aeroway: string;
}

const COLORS: Record<ColorScheme, MapColors> = {
  light: {
    background: '#F1EDE4',
    park: '#DCE8D5',
    wood: '#D3E4CF',
    residential: '#ECE7DD',
    ice: '#F8F8F5',
    water: '#BAD8DC',
    waterway: '#A8CDD3',
    building: '#E6E0D4',
    buildingOutline: '#DAD2C3',
    path: '#E9E3D7',
    minor: '#FFFFFF',
    major: '#FFFFFF',
    majorCasing: '#DED6C6',
    majorSubtle: 'rgba(222, 214, 198, 0.7)',
    motorway: '#F6E2C4',
    motorwayCasing: '#E2C8A2',
    motorwaySubtle: 'rgba(226, 200, 162, 0.6)',
    tunnel: '#EFEAE0',
    rail: '#DAD3C5',
    railDash: '#F4F1EA',
    boundary: '#B8B0A2',
    label: '#5A6869',
    labelStrong: '#24353A',
    labelHalo: '#F4F1EA',
    waterLabel: '#4D7F88',
    aeroway: '#ECE7DD',
  },
  dark: {
    background: '#0F1B1D',
    park: '#13271F',
    wood: '#142A22',
    residential: '#122022',
    ice: '#1A2628',
    water: '#0A2A31',
    waterway: '#0E3640',
    building: '#172628',
    buildingOutline: '#1E3133',
    path: '#1B2C2E',
    minor: '#1F3335',
    major: '#29403F',
    majorCasing: '#0F1B1D',
    majorSubtle: 'rgba(41, 64, 63, 0.7)',
    motorway: '#4A4232',
    motorwayCasing: '#2A2519',
    motorwaySubtle: 'rgba(74, 66, 50, 0.6)',
    tunnel: '#1A2A2C',
    rail: '#243638',
    railDash: '#0F1B1D',
    boundary: '#3B5053',
    label: '#97ABA7',
    labelStrong: '#D6E3E0',
    labelHalo: '#0F1B1D',
    waterLabel: '#5E98A3',
    aeroway: '#152426',
  },
};

type Paint = Record<string, unknown>;

function overrides(c: MapColors): Record<string, Paint> {
  const label = { 'text-color': c.label, 'text-halo-color': c.labelHalo };
  const strong = { 'text-color': c.labelStrong, 'text-halo-color': c.labelHalo };
  return {
    background: { 'background-color': c.background },
    park: { 'fill-color': c.park },
    water: { 'fill-color': c.water },
    landcover_ice_shelf: { 'fill-color': c.ice },
    landcover_glacier: { 'fill-color': c.ice },
    landuse_residential: { 'fill-color': c.residential },
    landcover_wood: { 'fill-color': c.wood },
    waterway: { 'line-color': c.waterway },
    building: { 'fill-color': c.building, 'fill-outline-color': c.buildingOutline },
    tunnel_motorway_casing: { 'line-color': c.motorwayCasing },
    tunnel_motorway_inner: { 'line-color': c.tunnel },
    'aeroway-taxiway': { 'line-color': c.aeroway },
    'aeroway-runway-casing': { 'line-color': c.aeroway },
    'aeroway-area': { 'fill-color': c.aeroway },
    'aeroway-runway': { 'line-color': c.background },
    road_area_pier: { 'fill-color': c.background },
    road_pier: { 'line-color': c.background },
    highway_path: { 'line-color': c.path },
    highway_minor: { 'line-color': c.minor },
    highway_major_casing: { 'line-color': c.majorCasing },
    highway_major_inner: { 'line-color': c.major },
    highway_major_subtle: { 'line-color': c.majorSubtle },
    highway_motorway_casing: { 'line-color': c.motorwayCasing },
    highway_motorway_inner: { 'line-color': c.motorway },
    highway_motorway_subtle: { 'line-color': c.motorwaySubtle },
    railway_transit: { 'line-color': c.rail },
    railway_transit_dashline: { 'line-color': c.railDash },
    railway_service: { 'line-color': c.rail },
    railway_service_dashline: { 'line-color': c.railDash },
    railway: { 'line-color': c.rail },
    railway_dashline: { 'line-color': c.railDash },
    highway_motorway_bridge_casing: { 'line-color': c.motorwayCasing },
    highway_motorway_bridge_inner: { 'line-color': c.motorway },
    boundary_3: { 'line-color': c.boundary },
    boundary_2: { 'line-color': c.boundary },
    boundary_disputed: { 'line-color': c.boundary },
    waterway_line_label: { 'text-color': c.waterLabel, 'text-halo-color': c.labelHalo },
    water_name_point_label: { 'text-color': c.waterLabel, 'text-halo-color': c.labelHalo },
    water_name_line_label: { 'text-color': c.waterLabel, 'text-halo-color': c.labelHalo },
    'highway-name-path': label,
    'highway-name-minor': label,
    'highway-name-major': label,
    airport: label,
    label_other: label,
    label_village: strong,
    label_town: strong,
    label_state: label,
    label_city: strong,
    label_city_capital: strong,
    label_country_3: strong,
    label_country_2: strong,
    label_country_1: strong,
  };
}

const cache: Partial<Record<ColorScheme, StyleSpecification>> = {};

export function buildMapStyle(scheme: ColorScheme): StyleSpecification {
  const cached = cache[scheme];
  if (cached) return cached;
  const c = COLORS[scheme];
  const o = overrides(c);
  const style = JSON.parse(JSON.stringify(base)) as StyleSpecification & { layers: { id: string; paint?: Paint }[] };
  style.name = `Calmway ${scheme}`;
  style.glyphs = config.glyphsUrl;
  style.sources = {
    openmaptiles: { type: 'vector', url: config.tilesUrl },
  };
  for (const layer of style.layers) {
    const paint = o[layer.id];
    if (paint) layer.paint = { ...(layer.paint ?? {}), ...paint };
  }
  cache[scheme] = style;
  return style;
}

export const mapBackground = (scheme: ColorScheme) => COLORS[scheme].background;
