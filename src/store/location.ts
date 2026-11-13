import { create } from 'zustand';
import type { LngLat } from '@/core/geo';

export type Permission = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface Position {
  coord: LngLat;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

interface LocationState {
  permission: Permission;
  position?: Position;
  setPermission: (p: Permission) => void;
  setPosition: (p: Position) => void;
}

export const useLocation = create<LocationState>()((set) => ({
  permission: 'unknown',
  setPermission: (permission) => set({ permission }),
  setPosition: (position) => set({ position }),
}));
