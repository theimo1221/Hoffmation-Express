import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore, getRoomName } from '@/stores/dataStore';
import { HouseCrossSection, FloorPlan, RoomFloorPlanDetail } from './floorplan';

export function FloorPlanView() {
  useTranslation();
  const navigate = useNavigate();
  const { floorLevel, roomId } = useParams<{ floorLevel?: string; roomId?: string }>();
  const { floors, devices, fetchData, isLoading } = useDataStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find selected floor and room from URL params
  const selectedFloor = floorLevel 
    ? floors.find(f => f.level === parseInt(floorLevel, 10)) 
    : null;
  
  const selectedRoom = selectedFloor && roomId
    ? selectedFloor.rooms.find(r => (r.id ?? getRoomName(r)) === decodeURIComponent(roomId))
    : null;

  if (isLoading && floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!selectedFloor) {
    return (
      <HouseCrossSection 
        floors={floors} 
        onSelectFloor={(floor) => navigate(`/floor/${floor.level}`)} 
      />
    );
  }

  if (selectedRoom) {
    return (
      <RoomFloorPlanDetail
        room={selectedRoom}
        devices={devices}
        allRooms={selectedFloor.rooms}
        onBack={() => navigate(`/floor/${floorLevel}`)}
        onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
        onNavigateToRoom={(room) => navigate(`/floor/${floorLevel}/${encodeURIComponent(room.id ?? getRoomName(room))}`)}
      />
    );
  }

  return (
    <FloorPlan
      floor={selectedFloor}
      onBack={() => navigate('/')}
      onSelectRoom={(roomIdParam) => navigate(`/floor/${floorLevel}/${encodeURIComponent(roomIdParam)}`)}
    />
  );
}
