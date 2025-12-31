import { Eye, DoorOpen } from 'lucide-react';
import type { Device } from '@/stores/dataStore';
import { isMotionDetected, getDeviceDetectionsToday } from '@/stores/deviceStore';

interface MotionSensorControlsProps {
  device: Device;
}

function formatTimeSinceMotion(seconds: number): string {
  if (seconds === -1) return '--';
  if (seconds === 0) return 'Aktiv';
  if (seconds >= 1800) return '>30 min';
  return `${(seconds / 60).toFixed(1)} min`;
}

export function MotionSensorControls({ device }: MotionSensorControlsProps) {
  const movementDetected = isMotionDetected(device);
  const detectionsToday = getDeviceDetectionsToday(device);
  const timeSinceLastMotion = device._timeSinceLastMotion ?? -1;
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
          <span className="font-medium">{formatTimeSinceMotion(timeSinceLastMotion)}</span>
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
  const position = device.position ?? device.handleSensor?.position ?? -1;
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
