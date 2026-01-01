import { useState } from 'react';
import type { Device } from '@/stores/dataStore';
import { DeviceCapability } from '@/stores/deviceStore';

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
 * Get PRIMARY device category based on capabilities
 * Each device belongs to exactly ONE category based on priority
 */
export function getDeviceCategories(device: Device): (keyof FloorPlanFilters)[] {
  const caps = device.deviceCapabilities ?? [];
  
  // Priority order: Security > Switchable > Climate > Other
  
  // Security: Rollos, Griffe, Bewegungsmelder, Tür/Fenster, Magnetkontakt (HIGHEST PRIORITY)
  if (caps.some(c => [
    DeviceCapability.motionSensor as number,
    DeviceCapability.shutter as number,
    DeviceCapability.handleSensor as number,
  ].includes(c))) {
    return ['security'];
  }
  
  // Switchable: Lampen, Stecker, Szenen
  if (caps.some(c => [
    DeviceCapability.actuator as number,
    DeviceCapability.lamp as number,
    DeviceCapability.dimmableLamp as number,
    DeviceCapability.ledLamp as number,
    DeviceCapability.scene as number,
  ].includes(c))) {
    return ['switchable'];
  }
  
  // Climate: Temperatursensoren, Heizungen, Klima, Luftfeuchtigkeit
  if (caps.some(c => [
    DeviceCapability.ac as number,
    DeviceCapability.heater as number,
    DeviceCapability.humiditySensor as number,
    DeviceCapability.temperatureSensor as number,
  ].includes(c))) {
    return ['climate'];
  }
  
  // Other: Lautsprecher, Rauchmelder, Vibration, TV, Kamera
  if (caps.some(c => [
    DeviceCapability.vibrationSensor as number,
    DeviceCapability.speaker as number,
    DeviceCapability.tv as number,
    DeviceCapability.smokeSensor as number,
    DeviceCapability.camera as number,
  ].includes(c))) {
    return ['other'];
  }
  
  // Fallback: Alle nicht-kategorisierten Geräte gehören zu 'other'
  return ['other'];
}

/**
 * Filter devices based on active filters
 */
export function filterDevicesByCategories(devices: Device[], filters: FloorPlanFilters): Device[] {
  return devices.filter(device => {
    const categories = getDeviceCategories(device);
    // Every device has at least one category (fallback to 'other')
    return categories.some(cat => filters[cat]);
  });
}
