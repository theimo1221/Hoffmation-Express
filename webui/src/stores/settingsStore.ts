import { create } from 'zustand';

interface SettingsState {
  pollingInterval: number;
  darkMode: 'system' | 'light' | 'dark';
  language: 'en' | 'de';
  apiBaseUrl: string;
  expertMode: boolean;
  excludedLevels: number[];
  setPollingInterval: (interval: number) => void;
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setLanguage: (lang: 'en' | 'de') => void;
  setApiBaseUrl: (url: string) => void;
  setExpertMode: (enabled: boolean) => void;
  setExcludedLevels: (levels: number[]) => void;
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

export const useSettingsStore = create<SettingsState>((set) => ({
  pollingInterval: parseInt(localStorage.getItem('hoffmation-polling-interval') || '30', 10),
  darkMode: getInitialDarkMode(),
  language: getInitialLanguage(),
  apiBaseUrl: localStorage.getItem('hoffmation-api-url') || '/api',
  expertMode: localStorage.getItem('hoffmation-expert-mode') === 'true',
  excludedLevels: getInitialExcludedLevels(),

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
}));
