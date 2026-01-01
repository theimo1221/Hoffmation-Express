import { create } from 'zustand';
import type { FloorDefinition } from './types';
import { getWebUISettings, updateWebUISettings } from '@/api/settings';

export interface FloorPlanFilters {
  switchable: boolean;      // Lampen, Stecker, Szenen
  security: boolean;        // Rollos, Griffe, Bewegungsmelder, Tür/Fenster
  climate: boolean;         // Temperatursensoren, Heizungen, Klima
  other: boolean;           // Lautsprecher, Rauchmelder, etc.
}

interface SettingsState {
  pollingInterval: number;
  darkMode: 'system' | 'light' | 'dark';
  language: 'en' | 'de';
  apiBaseUrl: string;
  expertMode: boolean;
  excludedLevels: number[];
  floors: FloorDefinition[];
  floorsLoading: boolean;
  floorPlanFilters: FloorPlanFilters;
  floorViewFilters: FloorPlanFilters;
  setPollingInterval: (interval: number) => void;
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setLanguage: (lang: 'en' | 'de') => void;
  setApiBaseUrl: (url: string) => void;
  setExpertMode: (enabled: boolean) => void;
  setExcludedLevels: (levels: number[]) => void;
  toggleFloorPlanFilter: (key: keyof FloorPlanFilters) => void;
  toggleFloorViewFilter: (key: keyof FloorPlanFilters) => void;
  loadFloors: () => Promise<void>;
  saveFloors: (floors: FloorDefinition[]) => Promise<void>;
}

const getInitialDarkMode = (): 'system' | 'light' | 'dark' => {
  const stored = localStorage.getItem('hoffmation-dark-mode');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
};

const getInitialLanguage = (): 'en' | 'de' => {
  const stored = localStorage.getItem('hoffmation-language');
  if (stored === 'de') return 'de';
  if (stored === 'en') return 'en';
  return navigator.language.startsWith('de') ? 'de' : 'en';
};

const getInitialExcludedLevels = (): number[] => {
  const stored = localStorage.getItem('hoffmation-excluded-levels');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

const DEFAULT_FLOOR_PLAN_FILTERS: FloorPlanFilters = {
  switchable: true,
  security: true,
  climate: true,
  other: true,
};

const getInitialFloorPlanFilters = (): FloorPlanFilters => {
  const stored = localStorage.getItem('hoffmation-floorplan-filters');
  if (stored) {
    try {
      return { ...DEFAULT_FLOOR_PLAN_FILTERS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_FLOOR_PLAN_FILTERS;
    }
  }
  return DEFAULT_FLOOR_PLAN_FILTERS;
};

const getInitialFloorViewFilters = (): FloorPlanFilters => {
  const stored = localStorage.getItem('hoffmation-floorview-filters');
  if (stored) {
    try {
      return { ...DEFAULT_FLOOR_PLAN_FILTERS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_FLOOR_PLAN_FILTERS;
    }
  }
  return DEFAULT_FLOOR_PLAN_FILTERS;
};

const DEFAULT_FLOORS: FloorDefinition[] = [
  { id: 'keller', name: 'Keller', level: -1, sortOrder: 0, icon: 'Warehouse', color: '#8B4513' },
  { id: 'draussen', name: 'Draußen', level: 99, sortOrder: 1, icon: 'Trees', color: '#22C55E' },
  { id: 'eg', name: 'EG', level: 0, sortOrder: 2, icon: 'Home', color: '#3B82F6' },
  { id: 'og1', name: '1. OG', level: 1, sortOrder: 3, icon: 'Bed', color: '#F59E0B' },
  { id: 'og2', name: '2. OG', level: 2, sortOrder: 4, icon: 'Users', color: '#8B5CF6' },
  { id: 'dachboden', name: 'Dachboden', level: 3, sortOrder: 5, icon: 'Package', color: '#6B7280' },
];

export const useSettingsStore = create<SettingsState>((set) => ({
  pollingInterval: parseInt(localStorage.getItem('hoffmation-polling-interval') || '30', 10),
  darkMode: getInitialDarkMode(),
  language: getInitialLanguage(),
  apiBaseUrl: localStorage.getItem('hoffmation-api-url') || (typeof window !== 'undefined' ? window.location.origin : ''),
  expertMode: localStorage.getItem('hoffmation-expert-mode') === 'true',
  excludedLevels: getInitialExcludedLevels(),
  floors: DEFAULT_FLOORS,
  floorsLoading: false,
  floorPlanFilters: getInitialFloorPlanFilters(),
  floorViewFilters: getInitialFloorViewFilters(),

  setPollingInterval: (interval) => {
    localStorage.setItem('hoffmation-polling-interval', interval.toString());
    set({ pollingInterval: interval });
  },

  setDarkMode: (mode) => {
    localStorage.setItem('hoffmation-dark-mode', mode);
    set({ darkMode: mode });
  },

  setLanguage: (lang) => {
    localStorage.setItem('hoffmation-language', lang);
    set({ language: lang });
  },

  setApiBaseUrl: (url) => {
    localStorage.setItem('hoffmation-api-url', url);
    set({ apiBaseUrl: url });
  },

  setExpertMode: (enabled) => {
    localStorage.setItem('hoffmation-expert-mode', enabled.toString());
    set({ expertMode: enabled });
  },

  setExcludedLevels: (levels) => {
    localStorage.setItem('hoffmation-excluded-levels', JSON.stringify(levels));
    set({ excludedLevels: levels });
  },

  toggleFloorPlanFilter: (key) => {
    set((state) => {
      const updated = { ...state.floorPlanFilters, [key]: !state.floorPlanFilters[key] };
      localStorage.setItem('hoffmation-floorplan-filters', JSON.stringify(updated));
      return { floorPlanFilters: updated };
    });
  },

  toggleFloorViewFilter: (key) => {
    set((state) => {
      const updated = { ...state.floorViewFilters, [key]: !state.floorViewFilters[key] };
      localStorage.setItem('hoffmation-floorview-filters', JSON.stringify(updated));
      return { floorViewFilters: updated };
    });
  },

  loadFloors: async () => {
    set({ floorsLoading: true });
    try {
      const settings = await getWebUISettings();
      set({ floors: settings.floors || DEFAULT_FLOORS, floorsLoading: false });
    } catch (error) {
      console.error('Failed to load floors, using defaults:', error);
      set({ floors: DEFAULT_FLOORS, floorsLoading: false });
    }
  },

  saveFloors: async (floors: FloorDefinition[]) => {
    try {
      await updateWebUISettings({ floors, version: '1.0' });
      set({ floors });
    } catch (error) {
      console.error('Failed to save floors:', error);
      throw error;
    }
  },
}));

