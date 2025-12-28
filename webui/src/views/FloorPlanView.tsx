import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore, type Floor, type Room, getRoomName } from '@/stores/dataStore';
import { HouseCrossSection, FloorPlan, RoomFloorPlanDetail } from './floorplan';

export function FloorPlanView() {
  useTranslation();
  const navigate = useNavigate();
  const { floors, devices, fetchData, isLoading } = useDataStore();
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading && floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!selectedFloor) {
    return <HouseCrossSection floors={floors} onSelectFloor={setSelectedFloor} />;
  }

  if (selectedRoom) {
    return (
      <RoomFloorPlanDetail
        room={selectedRoom}
        devices={devices}
        onBack={() => setSelectedRoom(null)}
        onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
      />
    );
  }

  return (
    <FloorPlan
      floor={selectedFloor}
      onBack={() => setSelectedFloor(null)}
      onSelectRoom={(roomId) => {
        const room = selectedFloor.rooms.find(r => (r.id ?? getRoomName(r)) === roomId);
        if (room) setSelectedRoom(room);
      }}
    />
  );
}
