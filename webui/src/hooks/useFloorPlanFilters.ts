import { useState } from 'react';
import type { Device } from '@/stores/dataStore';

export interface FloorPlanFilters {
  switchable: boolean;      // Lampen, Stecker, Szenen
  security: boolean;        // Rollos, Griffe, Bewegungsmelder, Tür/Fenster
  climate: boolean;         // Temperatursensoren, Heizungen, Klima
  other: boolean;           // Lautsprecher, Rauchmelder, etc.
}

const STORAGE_KEY = 'hoffmation-floorplan-filters';

const DEFAULT_FILTERS: FloorPlanFilters = {
  switchable: true,
  security: true,
  climate: true,
  other: true,
};

function loadFilters(): FloorPlanFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_FILTERS;
}

function saveFilters(filters: FloorPlanFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

export function useFloorPlanFilters() {
  const [filters, setFilters] = useState<FloorPlanFilters>(loadFilters);

  const toggleFilter = (key: keyof FloorPlanFilters) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      saveFilters(updated);
      return updated;
    });
  };

  return { filters, toggleFilter };
}

/**
 * Get device categories based on capabilities
 */
export function getDeviceCategories(device: Device): (keyof FloorPlanFilters)[] {
  const caps = device.deviceCapabilities ?? [];
  const categories: (keyof FloorPlanFilters)[] = [];
  
  // Switchable: Lampen, Stecker, Szenen
  // Lamp=8, Dimmer=9, LED=18, Actuator=1, Scene=103
  if (caps.some(c => [1, 8, 9, 18, 103].includes(c))) {
    categories.push('switchable');
  }
  
  // Security: Rollos, Griffe, Bewegungsmelder, Tür/Fenster, Magnetkontakt
  // Shutter=11, HandleSensor=15, MotionSensor=10, MagnetSensor=22, GarageDoorOpener=21
  if (caps.some(c => [10, 11, 15, 21, 22].includes(c))) {
    categories.push('security');
  }
  
  // Climate: Temperatursensoren, Heizungen, Klima, Luftfeuchtigkeit
  // AC=0, Heater=5, TemperatureSensor=12, HumiditySensor=6
  if (caps.some(c => [0, 5, 6, 12].includes(c))) {
    categories.push('climate');
  }
  
  // Other: Lautsprecher, Rauchmelder, Vibration, TV, Kamera, Türklingel
  // Speaker=14, SmokeSensor=19, VibrationSensor=13, TV=17, Camera=105, Doorbell=106
  if (caps.some(c => [13, 14, 17, 19, 105, 106].includes(c))) {
    categories.push('other');
  }
  
  return categories;
}

/**
 * Filter devices based on active filters
 */
export function filterDevicesByCategories(devices: Device[], filters: FloorPlanFilters): Device[] {
  return devices.filter(device => {
    const categories = getDeviceCategories(device);
    // Show device if any of its categories is active
    return categories.length === 0 || categories.some(cat => filters[cat]);
  });
}
