import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Place } from '@/services/geocoding/types';
import { persistStorage } from './storage';

export type SavedSlot = 'home' | 'work';

interface PlacesState {
  home?: Place;
  work?: Place;
  favorites: Place[];
  recents: Place[];
  setSlot: (slot: SavedSlot, place: Place | undefined) => void;
  toggleFavorite: (place: Place) => void;
  isFavorite: (id: string) => boolean;
  addRecent: (place: Place) => void;
  clearRecents: () => void;
}

const MAX_RECENTS = 12;

export const usePlaces = create<PlacesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],
      setSlot: (slot, place) => set({ [slot]: place }),
      toggleFavorite: (place) =>
        set((s) => ({
          favorites: s.favorites.some((f) => f.id === place.id)
            ? s.favorites.filter((f) => f.id !== place.id)
            : [place, ...s.favorites],
        })),
      isFavorite: (id) => get().favorites.some((f) => f.id === id),
      addRecent: (place) =>
        set((s) => ({ recents: [place, ...s.recents.filter((r) => r.id !== place.id)].slice(0, MAX_RECENTS) })),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'calmway.places',
      version: 1,
      storage: persistStorage,
      partialize: ({ home, work, favorites, recents }) => ({ home, work, favorites, recents }),
    },
  ),
);
