import { useState } from 'react';
import { Blinds } from 'lucide-react';
import type { Device } from '@/stores';
import { getDeviceShutterLevel } from '@/stores/deviceStore';
import { setShutter } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';

interface ShutterQuickControlsProps {
  device: Device;
  onUpdate: () => Promise<void>;
}

export function ShutterQuickControls({ device, onUpdate }: ShutterQuickControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSetShutter = async (level: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setShutter(device.id, level);
      await new Promise(resolve => setTimeout(resolve, 300));
      await onUpdate();
    } catch (e) {
      console.error('Failed to set shutter:', e);
    }
    setIsLoading(false);
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Blinds className="h-4 w-4" />
        Rolladen
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSetShutter(0)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            Zu
          </button>
          <button
            onClick={() => handleSetShutter(50)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            50%
          </button>
          <button
            onClick={() => handleSetShutter(100)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            Auf
          </button>
        </div>
      </div>
    </section>
  );
}

interface ShutterPositionControlsProps {
  device: Device;
  onUpdate: () => Promise<void>;
}

export function ShutterPositionControls({ device, onUpdate }: ShutterPositionControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const currentLevel = getDeviceShutterLevel(device);
  const [desiredPosition, setDesiredPosition] = useState(Math.round(currentLevel >= 0 ? currentLevel : 0));
  
  const handleSetShutter = async (level: number) => {
    await executeDeviceAction(
      device,
      (id) => setShutter(id, level),
      onUpdate,
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Blinds className="h-4 w-4" />
        Position
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Aktuelle Position</span>
          <span className="font-medium">{currentLevel.toFixed(0)}%</span>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Gewünschte Position</span>
            <span className="font-medium">{desiredPosition}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={desiredPosition}
            onChange={(e) => setDesiredPosition(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <button
          onClick={() => handleSetShutter(desiredPosition)}
          disabled={isLoading}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
        >
          Anwenden
        </button>
      </div>
    </section>
  );
}
