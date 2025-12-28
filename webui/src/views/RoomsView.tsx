import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore, type Room, type Device, type GroupData, getRoomName, getRoomEtage, getRoomStats, getDeviceRoom, getDeviceName } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { ChevronRight, Thermometer, Lightbulb, AirVent, RefreshCw, ArrowLeft, Blinds, Search } from 'lucide-react';
import { DeviceDetailView } from './DeviceDetailView';
import { DeviceIcon } from '@/components/DeviceIcon';
import { RoomSettingsSection } from '@/components/RoomSettingsSection';

export function RoomsView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const { rooms, devices, floors, fetchData, isLoading } = useDataStore();
  const { excludedLevels } = useSettingsStore();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ room: Room; groupType: string; group: GroupData } | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Get selected room from URL param
  const selectedRoom = roomId ? Object.values(rooms).find(r => (r.id ?? getRoomName(r)) === decodeURIComponent(roomId)) : null;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => setSelectedDevice(null)} />;
  }

  if (selectedGroup && selectedRoom) {
    return (
      <GroupDetailView 
        room={selectedGroup.room}
        groupType={selectedGroup.groupType}
        group={selectedGroup.group}
        devices={devices}
        onBack={() => setSelectedGroup(null)}
        onSelectDevice={setSelectedDevice}
      />
    );
  }

  const roomList = Object.values(rooms).filter(
    (room) => {
      const level = getRoomEtage(room);
      if (excludedLevels.includes(level)) return false;
      if (floorFilter !== null && level !== floorFilter) return false;
      if (search) {
        const roomName = getRoomName(room).toLowerCase();
        return roomName.includes(search.toLowerCase());
      }
      return true;
    }
  );

  // Filter floors to exclude hidden levels
  const visibleFloors = floors.filter(f => !excludedLevels.includes(f.level));

  if (isLoading && Object.keys(rooms).length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <RoomDetail 
        room={selectedRoom} 
        devices={devices} 
        onBack={() => navigate('/rooms')} 
        onSelectDevice={setSelectedDevice}
        onSelectGroup={(room, groupType, group) => setSelectedGroup({ room, groupType, group })}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('tabs.rooms')}</h1>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-secondary py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFloorFilter(null)}
            className={cn(
              'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
              floorFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            Alle
          </button>
          {visibleFloors.map((floor) => (
            <button
              key={floor.level}
              onClick={() => setFloorFilter(floor.level)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
                floorFilter === floor.level
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <div className="space-y-3">
          {roomList.map((room) => (
            <button
              key={room.id ?? getRoomName(room)}
              onClick={() => navigate(`/rooms/${encodeURIComponent(room.id ?? getRoomName(room))}`)}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-soft-lg active:scale-[0.98]"
            >
              <RoomCardContent room={room} devices={devices} />
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RoomDetailProps {
  room: Room;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
  onSelectGroup: (room: Room, groupType: string, group: GroupData) => void;
}

interface RoomCardContentProps {
  room: Room;
  devices: Record<string, import('@/stores/dataStore').Device>;
}

function RoomCardContent({ room, devices }: RoomCardContentProps) {
  const stats = getRoomStats(room, devices);

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-lg font-semibold">
        {getRoomName(room)}
      </span>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {stats.temperature !== undefined && (
          <span className="flex items-center gap-1">
            <Thermometer className="h-4 w-4" />
            {stats.temperature.toFixed(1)}°C
          </span>
        )}
        {stats.lampsTotal > 0 && (
          <span className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            {stats.lampsOn}/{stats.lampsTotal}
          </span>
        )}
        {stats.acTotal > 0 && (
          <span className="flex items-center gap-1">
            <AirVent className="h-4 w-4" />
            {stats.acOn}/{stats.acTotal}
          </span>
        )}
      </div>
    </div>
  );
}

function RoomDetail({ room, devices, onBack, onSelectDevice, onSelectGroup }: RoomDetailProps) {
  const groupTypes = room.groupdict ? Object.keys(room.groupdict) : [];
  const roomName = getRoomName(room);
  
  // Get devices for this room
  const roomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">{roomName}</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        {groupTypes.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
              Gruppen
            </h2>
            <div className="flex flex-wrap gap-2">
              {groupTypes.includes('3') && room.groupdict?.['3'] && (
                <button 
                  onClick={() => onSelectGroup(room, '3', room.groupdict!['3'])}
                  className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                >
                  <Lightbulb className="inline h-4 w-4 mr-2" />
                  Licht
                </button>
              )}
              {groupTypes.includes('8') && room.groupdict?.['8'] && (
                <button 
                  onClick={() => onSelectGroup(room, '8', room.groupdict!['8'])}
                  className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                >
                  <Thermometer className="inline h-4 w-4 mr-2" />
                  Heizung
                </button>
              )}
              {groupTypes.includes('0') && room.groupdict?.['0'] && (
                <button 
                  onClick={() => onSelectGroup(room, '0', room.groupdict!['0'])}
                  className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                >
                  <Blinds className="inline h-4 w-4 mr-2" />
                  Fenster
                </button>
              )}
              {groupTypes.includes('9') && room.groupdict?.['9'] && (
                <button 
                  onClick={() => onSelectGroup(room, '9', room.groupdict!['9'])}
                  className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                >
                  <AirVent className="inline h-4 w-4 mr-2" />
                  Klimaanlage
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Raum-Info
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-soft text-muted-foreground">
            <p>Etage: {room.info?.etage ?? 'Unbekannt'}</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Geräte ({roomDevices.length})
          </h2>
          <div className="space-y-3">
            {roomDevices.map((device) => {
              const name = getDeviceName(device, roomName);
              return (
                <button
                  key={device.id ?? name}
                  onClick={() => onSelectDevice(device)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <DeviceIcon device={device} size="md" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
            {roomDevices.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Keine Geräte gefunden
              </div>
            )}
          </div>
        </section>

        {/* Room Settings */}
        <RoomSettingsSection room={room} onUpdate={() => {}} />
      </div>
    </div>
  );
}

interface GroupDetailViewProps {
  room: Room;
  groupType: string;
  group: GroupData;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
}

function GroupDetailView({ room, groupType, group, devices, onBack, onSelectDevice }: GroupDetailViewProps) {
  const roomName = getRoomName(room);
  
  const groupTypeNames: Record<string, string> = {
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
  
  const groupName = groupTypeNames[groupType] || `Gruppe ${groupType}`;
  
  // Get devices for this room that match the group type
  const roomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  
  // Filter devices by group type capability
  const groupCapabilities: Record<string, number[]> = {
    '0': [11], // Shutter
    '3': [8, 9, 18], // Lamp, Dimmable, LED
    '8': [5], // Heater
    '9': [0], // AC
  };
  
  const relevantCaps = groupCapabilities[groupType] || [];
  const groupDevices = relevantCaps.length > 0 
    ? roomDevices.filter(d => {
        const caps = d.deviceCapabilities ?? [];
        return relevantCaps.some(c => caps.includes(c));
      })
    : roomDevices;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{groupName}</h1>
          <p className="text-sm text-muted-foreground">{roomName}</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Gruppen-Info
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gruppen-ID</span>
              <span className="font-mono">{group.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ</span>
              <span>{groupName}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Geräte ({groupDevices.length})
          </h2>
          <div className="space-y-3">
            {groupDevices.map((device) => {
              const name = getDeviceName(device, roomName);
              return (
                <button
                  key={device.id ?? name}
                  onClick={() => onSelectDevice(device)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <DeviceIcon device={device} size="md" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
            {groupDevices.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Keine Geräte in dieser Gruppe
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
