import { Thermometer, Lightbulb, AirVent } from 'lucide-react';
import { type Room, type Device, getRoomName, getRoomStats } from '@/stores/dataStore';

interface RoomCardContentProps {
  room: Room;
  devices: Record<string, Device>;
}

export function RoomCardContent({ room, devices }: RoomCardContentProps) {
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
