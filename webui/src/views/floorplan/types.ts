import type { Floor, Room, Device } from '@/stores/dataStore';

export interface HouseCrossSectionProps {
  floors: Floor[];
  onSelectFloor: (floor: Floor) => void;
}

export interface FloorPlanProps {
  floor: Floor;
  onBack: () => void;
  onSelectRoom: (roomId: string) => void;
}

export interface RoomCoords {
  roomName: string;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export interface RoomFloorPlanDetailProps {
  room: Room;
  devices: Record<string, Device>;
  allRooms?: Room[];
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
  onNavigateToRoom?: (room: Room) => void;
}

export interface FixedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
}

export interface DraggingState {
  roomName: string;
  corner: 'start' | 'end' | 'move';
  offsetX?: number;
  offsetY?: number;
}
