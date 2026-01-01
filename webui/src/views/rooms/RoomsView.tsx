import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore, type Room, type GroupData, getRoomName, getFloorsForRoom } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeviceDetailView } from '../device';
import { RoomDetail } from './RoomDetail';
import { RoomCardContent } from './RoomCardContent';
import { GroupDetailView } from './GroupDetailView';

export function RoomsView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId, deviceId } = useParams<{ roomId?: string; deviceId?: string }>();
  const { rooms, devices, fetchData, isLoading } = useDataStore();
  const { excludedLevels, floors: floorDefinitions, loadFloors } = useSettingsStore();
  const [selectedGroup, setSelectedGroup] = useState<{ room: Room; groupType: string; group: GroupData } | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Get selected room and device from URL params
  const selectedRoom = roomId ? Object.values(rooms).find(r => (r.id ?? getRoomName(r)) === decodeURIComponent(roomId)) : null;
  const selectedDevice = deviceId ? devices[deviceId] : null;

  useEffect(() => {
    fetchData();
    loadFloors();
  }, [fetchData, loadFloors]);

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => navigate(-1)} />;
  }

  if (selectedGroup && selectedRoom) {
    return (
      <GroupDetailView 
        room={selectedGroup.room}
        groupType={selectedGroup.groupType}
        group={selectedGroup.group}
        devices={devices}
        onBack={() => setSelectedGroup(null)}
        onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
      />
    );
  }

  // Build floors with room counts
  const floors = useMemo(() => {
    return floorDefinitions.map(def => {
      const floorRooms = Object.values(rooms).filter(room => {
        const roomFloorIds = getFloorsForRoom(room);
        return roomFloorIds.includes(def.id);
      });
      return { ...def, rooms: floorRooms };
    });
  }, [rooms, floorDefinitions]);

  const roomList = Object.values(rooms).filter(
    (room) => {
      const roomFloorIds = getFloorsForRoom(room);
      const levels = roomFloorIds.map(floorId => {
        const def = floorDefinitions.find(f => f.id === floorId);
        return def?.level ?? 99;
      });
      
      // Check if any of the room's floors are excluded
      if (levels.every(level => excludedLevels.includes(level))) return false;
      
      // Check floor filter
      if (floorFilter !== null && !levels.includes(floorFilter)) return false;
      
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
        onBack={() => navigate(-1)} 
        onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
        onSelectGroup={(room, groupType, group) => setSelectedGroup({ room, groupType, group })}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('tabs.rooms')}
        onRefresh={fetchData}
        isLoading={isLoading}
      >
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
      </PageHeader>

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
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
