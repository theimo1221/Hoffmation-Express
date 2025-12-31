import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'hoffmation-favorites';

interface FavoritesState {
  favoriteIds: string[];
  isFavorite: (deviceId: string) => boolean;
  addFavorite: (deviceId: string) => void;
  removeFavorite: (deviceId: string) => void;
  toggleFavorite: (deviceId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      isFavorite: (deviceId: string) => {
        return get().favoriteIds.includes(deviceId);
      },

      addFavorite: (deviceId: string) => {
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(deviceId)
            ? state.favoriteIds
            : [...state.favoriteIds, deviceId],
        }));
      },

      removeFavorite: (deviceId: string) => {
        set((state) => ({
          favoriteIds: state.favoriteIds.filter((id) => id !== deviceId),
        }));
      },

      toggleFavorite: (deviceId: string) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(deviceId)) {
          removeFavorite(deviceId);
        } else {
          addFavorite(deviceId);
        }
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
