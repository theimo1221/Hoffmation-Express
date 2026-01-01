import type { Room, Device, GroupData } from '@/stores';

export interface RoomDetailProps {
  room: Room;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
  onSelectGroup: (room: Room, groupType: string, group: GroupData) => void;
}

export interface RoomCardContentProps {
  room: Room;
  devices: Record<string, Device>;
}

export interface GroupDetailViewProps {
  room: Room;
  groupType: string;
  group: GroupData;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
}

export interface DeviceStatusBadgesProps {
  device: Device;
}

export const GROUP_TYPE_NAMES: Record<string, string> = {
  '0': 'Fenster',
  '1': 'Fenster',
  '2': 'Präsenz',
  '3': 'Licht',
  '4': 'Schalter',
  '5': 'Lautsprecher',
  '6': 'Rauchmelder',
  '7': 'Wasser',
  '8': 'Heizung',
  '9': 'Klimaanlage',
};

export const GROUP_CAPABILITIES: Record<string, number[]> = {
  '0': [11], // Shutter
  '3': [8, 9, 18], // Lamp, Dimmable, LED
  '8': [5], // Heater
  '9': [0], // AC
};
