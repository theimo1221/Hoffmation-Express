import { apiGet, apiPostNoResponse } from './client';
import type { Room, RoomSettings } from '@/stores';

export async function getRooms(): Promise<Record<string, Room>> {
  return apiGet<Record<string, Room>>('/rooms');
}

export async function getRoom(roomId: string): Promise<Room> {
  return apiGet<Room>(`/rooms/${roomId}`);
}

export async function updateRoomSettings(roomName: string, settings: Partial<RoomSettings>): Promise<void> {
  await apiPostNoResponse(`/roomSettings/${encodeURIComponent(roomName)}`, { settings });
  
  // Invalidate cache only for this specific room
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        // Delete only this room's endpoint from cache
        await cache.delete(`/rooms/${encodeURIComponent(roomName)}`);
      }
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }
}

export interface HeatGroupSettings {
  automaticMode?: boolean;
  automaticFallBackTemperatur?: number;
  manualTemperature?: number;
}

export async function updateGroupSettings(groupId: string, settings: Partial<HeatGroupSettings>): Promise<void> {
  await apiPostNoResponse(`/groupSettings/${encodeURIComponent(groupId)}`, { settings });
  
  // Invalidate cache for rooms to ensure fresh data on next load
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        // Delete rooms endpoints from cache (groups are part of rooms)
        await cache.delete('/rooms');
      }
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }
}
