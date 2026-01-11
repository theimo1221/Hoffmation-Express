import { Eye, DoorOpen } from 'lucide-react';
import type { Device } from '@/stores';
import { isMotionDetected, getDeviceDetectionsToday, getDeviceHandlePosition } from '@/stores/deviceStore';

interface MotionSensorControlsProps {
  device: Device;
}

function formatTimeSinceMotion(seconds: number, movementDetected: boolean): string {
  if (seconds === -1 || seconds === 0) {
    // If movement is currently detected, show "Aktiv"
    // Otherwise, no data available
    return movementDetected ? 'Aktiv' : '--';
  }
  
  // Format time since last motion
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  
  // More than 24 hours
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function MotionSensorControls({ device }: MotionSensorControlsProps) {
  const movementDetected = isMotionDetected(device);
  const detectionsToday = getDeviceDetectionsToday(device);
  
  // Calculate time since last motion from timestamp
  const motionTimestamp = device._motionDetectedTimestamp ?? 0;
  const timeSinceLastMotion = motionTimestamp === 0 ? 0 : Math.floor((Date.now() - motionTimestamp) / 1000);
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Bewegungsmelder
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Bewegung erkannt</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            movementDetected ? 'bg-orange-500/20 text-orange-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {movementDetected ? 'Ja' : 'Nein'}
          </span>
        </div>
        {detectionsToday >= 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Erkennungen heute</span>
            <span className="font-medium">{detectionsToday}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Seit letzter Bewegung</span>
          <span className="font-medium">{formatTimeSinceMotion(timeSinceLastMotion, movementDetected)}</span>
        </div>
      </div>
    </section>
  );
}

interface HandleSensorControlsProps {
  device: Device;
}

const handlePositionNames: Record<number, string> = {
  0: 'Geschlossen', 1: 'Gekippt', 2: 'Offen', [-1]: 'Unbekannt'
};

export function HandleSensorControls({ device }: HandleSensorControlsProps) {
  const position = getDeviceHandlePosition(device);
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <DoorOpen className="h-4 w-4" />
        Griffsensor
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Position</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            position === 0 ? 'bg-green-500/20 text-green-600' : 
            position === 1 ? 'bg-yellow-500/20 text-yellow-600' : 
            position === 2 ? 'bg-red-500/20 text-red-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {handlePositionNames[position] ?? 'Unbekannt'}
          </span>
        </div>
      </div>
    </section>
  );
}
