import { Thermometer, Lightbulb, Wind, Blinds, LockOpen, PersonStanding } from 'lucide-react';
import { type Room, type Device, getRoomName, getRoomStats } from '@/stores';

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
        {stats.lampsOn > 0 && (
          <span className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            {stats.lampsOn}
          </span>
        )}
        {stats.acCooling > 0 && (
          <span className="flex items-center gap-1">
            <Wind className="h-4 w-4 text-blue-500" />
            {stats.acCooling}
          </span>
        )}
        {stats.acHeating > 0 && (
          <span className="flex items-center gap-1">
            <Wind className="h-4 w-4 text-red-500" />
            {stats.acHeating}
          </span>
        )}
        {stats.shuttersOpen > 0 && (
          <span className="flex items-center gap-1">
            <Blinds className="h-4 w-4 text-orange-500" />
            {stats.shuttersOpen}
          </span>
        )}
        {stats.windowsOpen > 0 && (
          <span className="flex items-center gap-1">
            <LockOpen className="h-4 w-4 text-orange-500" />
            {stats.windowsOpen}
          </span>
        )}
        {stats.motionActive > 0 && (
          <span className="flex items-center gap-1">
            <PersonStanding className="h-4 w-4 text-orange-500" />
            {stats.motionActive}
          </span>
        )}
      </div>
    </div>
  );
}
