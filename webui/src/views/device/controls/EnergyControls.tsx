import { Activity, Battery } from 'lucide-react';
import type { Device } from '@/stores/dataStore';
import { getDeviceBattery } from '@/stores/deviceStore';

interface EnergyManagerControlsProps {
  device: Device;
}

export function EnergyManagerControls({ device }: EnergyManagerControlsProps) {
  const batteryLevel = getDeviceBattery(device) ?? -99;
  const excessEnergy = device.excessEnergy ?? -99;
  const selfConsumingWattage = device.selfConsumingWattage ?? -99;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Energie Manager
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
        {batteryLevel !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Batteriestand</span>
            <span className="font-medium">{batteryLevel.toFixed(0)}%</span>
          </div>
        )}
        {excessEnergy !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Überschussenergie</span>
            <span className="font-medium">{excessEnergy.toFixed(0)}W</span>
          </div>
        )}
        {selfConsumingWattage !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Eigenverbrauch</span>
            <span className="font-medium">{selfConsumingWattage.toFixed(0)}W</span>
          </div>
        )}
      </div>
    </section>
  );
}

interface BatteryControlsProps {
  device: Device;
}

export function BatteryControls({ device }: BatteryControlsProps) {
  const batteryLevel = getDeviceBattery(device) ?? -99;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Battery className="h-4 w-4" />
        Batterie
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Ladestand</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            batteryLevel > 50 ? 'bg-green-500/20 text-green-600' : 
            batteryLevel > 20 ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600'
          }`}>
            {batteryLevel.toFixed(0)}%
          </span>
        </div>
      </div>
    </section>
  );
}
