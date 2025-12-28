import { apiGet } from './client';
import type { Room } from '@/stores/dataStore';

export async function getRooms(): Promise<Record<string, Room>> {
  return apiGet<Record<string, Room>>('/rooms');
}

export async function getRoom(roomId: string): Promise<Room> {
  return apiGet<Room>(`/rooms/${roomId}`);
}
