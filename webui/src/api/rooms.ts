import { apiGet, apiPost } from './client';
import type { Room, RoomSettings } from '@/stores/dataStore';

export async function getRooms(): Promise<Record<string, Room>> {
  return apiGet<Record<string, Room>>('/rooms');
}

export async function getRoom(roomId: string): Promise<Room> {
  return apiGet<Room>(`/rooms/${roomId}`);
}

export async function updateRoomSettings(roomName: string, settings: Partial<RoomSettings>): Promise<void> {
  await apiPost(`/roomSettings/${encodeURIComponent(roomName)}`, { settings });
}
