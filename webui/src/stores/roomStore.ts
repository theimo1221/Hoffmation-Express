/**
 * Room Store
 * Centralized room state and helper functions
 */

import type { Room, Device, GroupType, GroupData, RoomWebUISettings } from './types';
import { getDeviceRoom } from './deviceStore';

/**
 * Room Helper Functions
 */

export function getRoomName(room: Room): string {
  return room.customName ?? room.roomName ?? 'Unbekannter Raum';
}

export function getRoomEtage(room: Room): number {
  return room.info?.etage ?? room.etage ?? 99;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getRoomNameVariants(roomName: string): string[] {
  const variants = [roomName];
  
  const umlautMap: Record<string, string> = {
    'ä': 'ae', 'ö': 'oe', 'ü': 'ue',
    'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
  };
  
  let hasUmlaut = false;
  let withoutUmlaut = roomName;
  for (const [umlaut, replacement] of Object.entries(umlautMap)) {
    if (roomName.includes(umlaut)) {
      hasUmlaut = true;
      withoutUmlaut = withoutUmlaut.replace(new RegExp(umlaut, 'g'), replacement);
    }
  }
  
  if (hasUmlaut) {
    variants.push(withoutUmlaut);
  }
  
  return variants;
}

/**
 * Get devices for a specific room
 */
export function getRoomDevices(roomName: string, devices: Record<string, Device>): Device[] {
  return Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
}

/**
 * Get room statistics
 */
export interface RoomStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  lampsOn: number;
  lampsTotal: number;
  acOn: number;
  acTotal: number;
  temperature?: number;
}

export function getRoomStats(roomName: string, devices: Record<string, Device>): RoomStats {
  const roomDevices = getRoomDevices(roomName, devices);
  
  let onlineDevices = 0;
  let offlineDevices = 0;
  let lampsOn = 0;
  let lampsTotal = 0;
  let acOn = 0;
  let acTotal = 0;
  let temperatures: number[] = [];
  
  for (const device of roomDevices) {
    // Check availability
    const available = device.available ?? device._available;
    if (available === false) {
      offlineDevices++;
    } else {
      onlineDevices++;
    }
    
    // Count lamps
    const isLamp = (device.deviceCapabilities ?? []).some(cap => [8, 9, 18].includes(cap));
    if (isLamp) {
      lampsTotal++;
      const isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
      if (isOn) lampsOn++;
    }
    
    // Count AC
    const isAc = (device.deviceCapabilities ?? []).includes(0);
    if (isAc) {
      acTotal++;
      const isOn = device.on ?? device._on ?? false;
      if (isOn) acOn++;
    }
    
    // Collect temperatures
    const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
    if (temp !== undefined && temp !== -99) {
      temperatures.push(temp);
    }
  }
  
  const avgTemp = temperatures.length > 0
    ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length
    : undefined;
  
  return {
    totalDevices: roomDevices.length,
    onlineDevices,
    offlineDevices,
    lampsOn,
    lampsTotal,
    acOn,
    acTotal,
    temperature: avgTemp,
  };
}

/**
 * Group Helper Functions
 */

export function hasGroup(room: Room, groupType: GroupType): boolean {
  if (!room.groupdict) return false;
  return Object.keys(room.groupdict).includes(String(groupType));
}

export function getGroup(room: Room, groupType: GroupType): GroupData | undefined {
  if (!room.groupdict) return undefined;
  return room.groupdict[String(groupType)];
}

/**
 * Parse customSettingsJson from room settings
 */
export function getRoomWebUISettings(room: Room): RoomWebUISettings | null {
  try {
    // Try _settingsContainer first (backend structure)
    const json = (room.settings as any)?._settingsContainer?.customSettingsJson 
                 ?? room.settings?.customSettingsJson;
    if (typeof json === 'string' && json.length > 0) {
      const parsed = JSON.parse(json);
      return parsed.webui || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get floors for a room based on customSettingsJson or fallback to etage
 */
export function getRoomFloors(room: Room): string[] {
  const webui = getRoomWebUISettings(room);
  if (webui?.crossSectionFloors && webui.crossSectionFloors.length > 0) {
    return webui.crossSectionFloors;
  }
  // Fallback to etage
  const etage = getRoomEtage(room);
  return [String(etage)];
}
