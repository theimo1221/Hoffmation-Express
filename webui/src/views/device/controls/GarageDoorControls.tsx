import { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import type { Device } from '@/stores';
import { setGarageDoor } from '@/api/devices';
import { executeDeviceAction, REFRESH_DELAY_AC_MS } from '@/lib/deviceActions';

interface GarageDoorControlsProps {
  device: Device;
}

export function GarageDoorControls({ device }: GarageDoorControlsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handle = (open: boolean) =>
    executeDeviceAction(device, (id) => setGarageDoor(id, open), setIsLoading, REFRESH_DELAY_AC_MS);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <DoorOpen className="h-4 w-4" />
        Garagentor
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handle(true)}
            disabled={isLoading}
            className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
          >
            Öffnen
          </button>
          <button
            onClick={() => handle(false)}
            disabled={isLoading}
            className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Schließen
          </button>
        </div>
      </div>
    </section>
  );
}
