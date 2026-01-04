/**
 * Room Store
 * Centralized room state and helper functions
 */

import type { Room, Device, GroupType, GroupData, RoomWebUISettings } from './types';
import { 
  getDeviceRoom, 
  isLampDevice, 
  isAcDevice, 
  isShutterDevice, 
  isHandleSensorDevice, 
  isMotionSensorDevice, 
  isDeviceOn,
  getDeviceShutterLevel,
  getHandleState,
  isMotionCurrentlyDetected,
  getAcMode
} from './deviceStore';

/**
 * Room Helper Functions
 */

export function getRoomName(room: Room): string {
  return room.customName ?? room.info?.roomName ?? room.roomName ?? 'Unbekannter Raum';
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
    if (isLampDevice(device)) {
      lampsTotal++;
      if (isDeviceOn(device)) lampsOn++;
    }
    
    // Count AC
    if (isAcDevice(device)) {
      acTotal++;
      if (isDeviceOn(device)) acOn++;
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
 * Get floor statistics by aggregating all rooms on that floor
 */
export interface FloorStats {
  lampsOn: number;
  acCooling: number;
  acHeating: number;
  shuttersOpen: number;
  windowsOpen: number;
  motionActive: number;
}

export function getFloorStats(rooms: Room[], devices: Record<string, Device>): FloorStats {
  let lampsOn = 0;
  let acCooling = 0;
  let acHeating = 0;
  let shuttersOpen = 0;
  let windowsOpen = 0;
  let motionActive = 0;
  
  for (const room of rooms) {
    const roomName = room.customName ?? room.info?.roomName ?? room.roomName ?? '';
    const roomDevices = getRoomDevices(roomName, devices);
    
    for (const device of roomDevices) {
      // Count lamps that are on
      if (isLampDevice(device) && isDeviceOn(device)) {
        lampsOn++;
      }
      
      // Count AC by mode (cooling vs heating)
      if (isAcDevice(device) && isDeviceOn(device)) {
        const mode = getAcMode(device);
        const currentMonth = new Date().getMonth();
        const isSummerSeason = currentMonth >= 4 && currentMonth <= 9;
        const isCooling = mode === 1 || (mode === 0 && isSummerSeason);
        const isHeating = mode === 4 || (mode === 0 && !isSummerSeason);
        
        if (isCooling) acCooling++;
        else if (isHeating) acHeating++;
      }
      
      // Count shutters that are open (not closed)
      // Note: 0% = closed, 100% = open - anything > 0 is open
      if (isShutterDevice(device)) {
        const level = getDeviceShutterLevel(device);
        if (level > 0) shuttersOpen++;
      }
      
      // Count windows that are open or tilted
      if (isHandleSensorDevice(device)) {
        const state = getHandleState(device);
        if (state === 'open' || state === 'tilted') windowsOpen++;
      }
      
      // Count motion sensors with active detection
      if (isMotionSensorDevice(device)) {
        if (isMotionCurrentlyDetected(device)) motionActive++;
      }
    }
  }
  
  return {
    lampsOn,
    acCooling,
    acHeating,
    shuttersOpen,
    windowsOpen,
    motionActive,
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
 * Map etage number to floor ID
 */
function etageToFloorId(etage: number): string {
  const mapping: Record<number, string> = {
    [-1]: 'keller',
    [0]: 'eg',
    [1]: 'og1',
    [2]: 'og2',
    [3]: 'dachboden',
    [99]: 'draussen',
  };
  return mapping[etage] ?? `level-${etage}`;
}

/**
 * Get floors for a room based on customSettingsJson or fallback to etage
 */
export function getRoomFloors(room: Room): string[] {
  const webui = getRoomWebUISettings(room);
  if (webui?.crossSectionFloors && webui.crossSectionFloors.length > 0) {
    return webui.crossSectionFloors;
  }
  // Fallback to etage - convert to floor ID
  const etage = getRoomEtage(room);
  return [etageToFloorId(etage)];
}
