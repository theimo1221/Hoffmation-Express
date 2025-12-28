import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      tabs: {
        floorPlan: 'Floor Plan',
        favorites: 'Favorites',
        rooms: 'Rooms',
        devices: 'Devices',
        settings: 'Settings',
      },
      settings: {
        pollingInterval: 'Refresh Interval',
        darkMode: 'Dark Mode',
        language: 'Language',
      },
      home: {
        favorites: 'Favorites',
        noFavorites: 'No favorites yet',
        addFavoritesHint: 'Add devices to favorites from the device detail view',
      },
      floors: {
        basement: 'Basement',
        ground: 'Ground Floor',
        first: '1st Floor',
        second: '2nd Floor',
        third: '3rd Floor',
        attic: 'Attic',
      },
      common: {
        back: 'Back',
        search: 'Search...',
        on: 'On',
        off: 'Off',
        open: 'Open',
        closed: 'Closed',
        allOff: 'All Off',
        settings: 'Settings',
      },
      devices: {
        light: 'Light',
        dimmer: 'Dimmer',
        shutter: 'Shutter',
        heater: 'Heater',
        ac: 'AC',
        sensor: 'Sensor',
        camera: 'Camera',
        scene: 'Scene',
      },
    },
  },
  de: {
    translation: {
      tabs: {
        floorPlan: 'Grundriss',
        favorites: 'Favoriten',
        rooms: 'Räume',
        devices: 'Geräte',
        settings: 'Einstellungen',
      },
      settings: {
        pollingInterval: 'Aktualisierungsintervall',
        darkMode: 'Dunkelmodus',
        language: 'Sprache',
      },
      home: {
        favorites: 'Favoriten',
        noFavorites: 'Noch keine Favoriten',
        addFavoritesHint: 'Füge Geräte über die Gerätedetails zu den Favoriten hinzu',
      },
      floors: {
        basement: 'Keller',
        ground: 'Erdgeschoss',
        first: '1. OG',
        second: '2. OG',
        third: '3. OG',
        attic: 'Dachboden',
      },
      common: {
        back: 'Zurück',
        search: 'Suchen...',
        on: 'An',
        off: 'Aus',
        open: 'Offen',
        closed: 'Geschlossen',
        allOff: 'Alles aus',
        settings: 'Einstellungen',
      },
      devices: {
        light: 'Licht',
        dimmer: 'Dimmer',
        shutter: 'Rolladen',
        heater: 'Heizung',
        ac: 'Klimaanlage',
        sensor: 'Sensor',
        camera: 'Kamera',
        scene: 'Szene',
      },
    },
  },
};

const savedLanguage = localStorage.getItem('hoffmation-language') || navigator.language.split('-')[0];

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === 'de' ? 'de' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
