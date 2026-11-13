import type { BBox, LngLat } from '@/core/geo';
import type { ColorScheme } from '@/theme/tokens';

export type MarkerKind = 'destination' | 'origin' | 'result' | 'pin' | 'stress';

export interface MapMarker {
  id: string;
  coord: LngLat;
  kind: MarkerKind;
  label?: string;
  selected?: boolean;
}

export interface MapRoute {
  id: string;
  geometry: LngLat[];
  selected: boolean;
  color: string;
}

export interface UserDot {
  coord: LngLat;
  heading?: number;
  navigating?: boolean;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CameraTarget {
  center: LngLat;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration?: number;
  padding?: Padding;
}

export interface CalmMapHandle {
  fitBounds(bbox: BBox, padding: Padding, duration?: number): void;
  easeTo(target: CameraTarget): void;
}

export interface CalmMapProps {
  scheme: ColorScheme;
  routes: MapRoute[];
  markers: MapMarker[];
  user?: UserDot;
  initialCenter: LngLat;
  initialZoom: number;
  onPress?: (coord: LngLat) => void;
  onLongPress?: (coord: LngLat) => void;
  onRoutePress?: (id: string) => void;
  onMarkerPress?: (id: string) => void;
  /** The user started moving the map themselves. */
  onUserGesture?: () => void;
  /** Map bearing changed, for the compass button. */
  onBearingChange?: (bearing: number) => void;
}
