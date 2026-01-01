import { useState } from 'react';
import type { Device } from '@/stores/dataStore';

export interface FloorPlanFilters {
  lamps: boolean;
  doorSensors: boolean;
  speakers: boolean;
  climate: boolean;
  shutters: boolean;
  temperatures: boolean;
  heaters: boolean;
}

const STORAGE_KEY = 'hoffmation-floorplan-filters';

const DEFAULT_FILTERS: FloorPlanFilters = {
  lamps: true,
  doorSensors: true,
  speakers: true,
  climate: true,
  shutters: true,
  temperatures: true,
  heaters: true,
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
  
  // Lamps (Lamp=8, Dimmer=9, LED=18)
  if (caps.some(c => [8, 9, 18].includes(c))) {
    categories.push('lamps');
  }
  
  // Door/Window Sensors (WindowSensor=2, DoorSensor=3, Lock=4)
  if (caps.some(c => [2, 3, 4].includes(c))) {
    categories.push('doorSensors');
  }
  
  // Speakers (Speaker=14)
  if (caps.includes(14)) {
    categories.push('speakers');
  }
  
  // Climate (AC=0)
  if (caps.includes(0)) {
    categories.push('climate');
  }
  
  // Shutters (Shutter=11)
  if (caps.includes(11)) {
    categories.push('shutters');
  }
  
  // Temperature Sensors (TemperatureSensor=12)
  if (caps.includes(12)) {
    categories.push('temperatures');
  }
  
  // Heaters (Heater=15, Thermostat=16)
  if (caps.some(c => [15, 16].includes(c))) {
    categories.push('heaters');
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
