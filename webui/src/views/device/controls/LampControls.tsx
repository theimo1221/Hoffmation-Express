import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { Device } from '@/stores';
import { isDeviceOn } from '@/stores/deviceStore';
import { setLamp } from '@/api/devices';
import { executeDeviceAction, calculateDuration } from '@/lib/deviceActions';

interface LampControlsProps {
  device: Device;
}

export function LampControls({ device }: LampControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [forceDuration, setForceDuration] = useState(60);
  
  const isOn = isDeviceOn(device);
  
  const handleToggle = async () => {
    await executeDeviceAction(
      device,
      (id) => setLamp(id, !isOn),
      setIsLoading
    );
  };
  
  const handleForce = async (state: boolean) => {
    const durationMs = calculateDuration(forceDuration);
    await executeDeviceAction(
      device,
      (id) => setLamp(id, state, durationMs),
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        Licht
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOn ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {isOn ? 'An' : 'Aus'}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Force-Dauer</span>
            <span className="font-medium">
              {forceDuration === 0 ? 'Kein Timeout' : `${forceDuration} min`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="240"
            step="5"
            value={forceDuration}
            onChange={(e) => setForceDuration(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleForce(true)}
            disabled={isLoading}
            className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
          >
            Force An
          </button>
          <button
            onClick={() => handleForce(false)}
            disabled={isLoading}
            className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Force Aus
          </button>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`w-full rounded-xl py-3 font-medium transition-all active:scale-95 disabled:opacity-50 ${
            isOn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary hover:bg-accent'
          }`}
        >
          {isOn ? 'Ausschalten' : 'Einschalten'}
        </button>
      </div>
    </section>
  );
}
