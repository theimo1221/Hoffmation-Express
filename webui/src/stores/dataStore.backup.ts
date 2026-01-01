/**
 * Data Store
 * Central state management for rooms and devices
 */

import { create } from 'zustand';
import { getRooms } from '@/api/rooms';
import { getDevices, getDevice } from '@/api/devices';

// Import types from centralized types.ts
import type { Room, Device, TrilaterationPoint } from './types';
import { getRoomFloors } from './roomStore';

// Re-export types for backward compatibility
export type { 
  Room, 
  Device, 
  GroupType, 
  GroupData, 
  RoomWebUISettings, 
  FloorDefinition, 
  TrilaterationPoint,
  RoomSettings,
  DeviceSettings,
  ActuatorSettings,
  DimmerSettings,
  LedSettings,
  ShutterSettings,
  HeaterSettings,
  AcSettings,
  HandleSettings,
  CameraSettings,
  MotionSensorSettings,
  SceneSettings,
  SpeakerSettings,
  DachsSettings,
  TemperatureSensor,
  HumiditySensor,
  HandleSensor,
  Battery,
  BlockAutomationHandler,
} from './types';

// Re-export all device functions from deviceStore for backward compatibility
export {
  // Type checkers
  isLampDevice,
  isActuatorDevice,
  isShutterDevice,
  isSceneDevice,
  isAcDevice,
  isHeaterDevice,
  isMotionSensorDevice,
  isHandleSensorDevice,
  isTempSensorDevice,
  isHumiditySensorDevice,
  isSpeakerDevice,
  isCameraDevice,
  isButtonSwitchDevice,
  isToggleableDevice,
  getDeviceToggleAction,
  // State getters
  getDeviceRoom,
  getDeviceName,
  isDeviceOn,
  getDeviceBrightness,
  getDeviceTemperature,
  getDeviceHumidity,
  getDeviceHandlePosition,
  getDeviceShutterLevel,
  getDeviceDesiredTemp,
  getDeviceValveLevel,
  isMotionDetected,
  getDeviceDetectionsToday,
  getDeviceBattery,
  getDeviceColor,
  isAcOn,
  getAcMode,
  getDeviceLinkQuality,
  isDeviceAvailable,
  getAutomaticBlockedUntil,
  // Capability
  DeviceCapability,
  hasCapability,
  // Unreachability
  getDeviceStaleThresholdMinutes,
  isDeviceUnreachable,
  // Expert mode
  isDeviceComplex,
  filterDevicesForExpertMode,
  // Capability names
  getCapabilityName,
  getCapabilityNames,
} from './deviceStore';

// Re-export all room functions from roomStore for backward compatibility
export {
  getRoomName,
  getRoomEtage,
  getRoomNameVariants,
  getRoomDevices,
  getRoomStats,
  hasGroup,
  getGroup,
  getRoomWebUISettings,
  getRoomFloors,
  type RoomStats,
} from './roomStore';

// Additional room helper functions
export function getFloorsForRoom(room: Room): string[] {
  return getRoomFloors(room);
}

export function isMultiFloorRoom(room: Room): boolean {
  const floors = getRoomFloors(room);
  return floors.length > 1;
}

export function getRoomCoords(room: Room): { startPoint: TrilaterationPoint | undefined; endPoint: TrilaterationPoint | undefined } {
  return {
    startPoint: room.startPoint,
    endPoint: room.endPoint
  };
}

/**
 * Floor interface for UI
 */
export interface Floor {
  level: number;
  name: string;
  rooms: Room[];
}

/**
 * Data Store State
 */
interface DataState {
  rooms: Record<string, Room>;
  devices: Record<string, Device>;
  floors: Floor[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fetchData: () => Promise<void>;
  fetchDevice: (deviceId: string) => Promise<void>;
}

/**
 * Derive floors from rooms
 */
function deriveFloors(rooms: Record<string, Room>): Floor[] {
  const floorMap = new Map<number, Room[]>();

  // Import getRoomEtage locally to avoid circular dependency
  const getRoomEtage = (room: Room): number => {
    return room.info?.etage ?? room.etage ?? 99;
  };

  Object.values(rooms).forEach((room) => {
    const level = getRoomEtage(room);

    if (!floorMap.has(level)) {
      floorMap.set(level, []);
    }
    floorMap.get(level)!.push(room);
  });

  const floorNames: Record<number, string> = {
    [-1]: 'Keller',
    [0]: 'Erdgeschoss',
    [1]: '1. OG',
    [2]: '2. OG',
    [3]: 'Dachboden',
    [99]: 'Außen',
  };

  return Array.from(floorMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, rooms]) => ({
      level,
      name: floorNames[level] || `Etage ${level}`,
      rooms,
    }));
}

/**
 * Zustand Store
 */
export const useDataStore = create<DataState>((set) => ({
  rooms: {},
  devices: {},
  floors: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [rooms, rawDevices] = await Promise.all([getRooms(), getDevices()]);
      
      // Add id from dictionary key to each device
      const devices: Record<string, Device> = {};
      for (const [id, device] of Object.entries(rawDevices)) {
        devices[id] = { ...device, id };
      }
      
      const floors = deriveFloors(rooms);
      set({
        rooms,
        devices,
        floors,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  fetchDevice: async (deviceId: string) => {
    try {
      const updatedDevice = await getDevice(deviceId);
      set((state) => ({
        devices: {
          ...state.devices,
          [deviceId]: { ...updatedDevice, id: deviceId },
        },
      }));
    } catch (error) {
      console.error('Failed to fetch device:', error);
    }
  },
}));
