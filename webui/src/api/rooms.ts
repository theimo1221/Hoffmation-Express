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
}

export interface HeatGroupSettings {
  automaticMode?: boolean;
  automaticFallBackTemperatur?: number;
  manualTemperature?: number;
}

export async function updateGroupSettings(groupId: string, settings: Partial<HeatGroupSettings>): Promise<void> {
  await apiPostNoResponse(`/groupSettings/${encodeURIComponent(groupId)}`, { settings });
}
