/**
 * Data Store
 * Central state management for rooms and devices using Zustand
 */

import { create } from 'zustand';
import { getRooms } from '@/api/rooms';
import { getDevices, getDevice } from '@/api/devices';
import type { Room, Device, TrilaterationPoint } from './types';
import { getRoomEtage } from './roomStore';

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

/**
 * Helper functions for backward compatibility
 */
export function getFloorsForRoom(room: Room): string[] {
  const { getRoomFloors } = require('./roomStore');
  return getRoomFloors(room);
}

export function isMultiFloorRoom(room: Room): boolean {
  const floors = getFloorsForRoom(room);
  return floors.length > 1;
}

export function getRoomCoords(room: Room): { startPoint: TrilaterationPoint | undefined; endPoint: TrilaterationPoint | undefined } {
  return {
    startPoint: room.startPoint,
    endPoint: room.endPoint
  };
}
