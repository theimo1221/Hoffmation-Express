import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { Device } from '@/stores';
import { isDeviceOn, getDeviceBrightness } from '@/stores/deviceStore';
import { setDimmer } from '@/api/devices';
import { executeDeviceAction, calculateDuration } from '@/lib/deviceActions';

interface DimmerControlsProps {
  device: Device;
}

export function DimmerControls({ device }: DimmerControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [forceDuration, setForceDuration] = useState(60);
  const [desiredBrightness, setDesiredBrightness] = useState(getDeviceBrightness(device));
  
  const isOn = isDeviceOn(device);
  const brightness = getDeviceBrightness(device);
  
  const handleDimmer = async (state: boolean, bright: number) => {
    const durationMs = calculateDuration(forceDuration);
    await executeDeviceAction(
      device,
      (id) => setDimmer(id, state, bright, durationMs),
      setIsLoading
    );
  };
  
  const handleForceDimmer = async (state: boolean) => {
    const durationMs = calculateDuration(forceDuration);
    await executeDeviceAction(
      device,
      (id) => setDimmer(id, state, desiredBrightness, durationMs),
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Lightbulb className="h-4 w-4" />
        Dimmer
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOn ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {isOn ? `An (${brightness}%)` : 'Aus'}
          </span>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Helligkeit</span>
            <span className="font-medium">{desiredBrightness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={desiredBrightness}
            onChange={(e) => setDesiredBrightness(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Force-Dauer</span>
            <span className="font-medium">{forceDuration === 0 ? 'Kein Timeout' : `${forceDuration} min`}</span>
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
        <button
          onClick={() => handleDimmer(true, desiredBrightness)}
          disabled={isLoading}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
        >
          Anwenden
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleForceDimmer(true)}
            disabled={isLoading}
            className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
          >
            Force An
          </button>
          <button
            onClick={() => handleForceDimmer(false)}
            disabled={isLoading}
            className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Force Aus
          </button>
        </div>
      </div>
    </section>
  );
}
