import { useState } from 'react';
import { Activity, Battery, Settings } from 'lucide-react';
import type { Device } from '@/stores';
import type { EnergySettings } from '@/stores/types';
import { getDeviceBattery } from '@/stores/deviceStore';
import { updateDeviceSettings } from '@/api/devices';
import { useDataStore } from '@/stores';

interface EnergyManagerControlsProps {
  device: Device;
}

const PRIORITY_IGNORE = -1;

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

interface EnergySettingsSectionProps {
  device: Device;
}

export function EnergySettingsSection({ device }: EnergySettingsSectionProps) {
  const es = device.settings?.energySettings;
  const { fetchDevice } = useDataStore();

  const [isSaving, setIsSaving] = useState(false);
  const [decoupled, setDecoupled] = useState<boolean>((es?.priority ?? 0) === PRIORITY_IGNORE);
  const [priority, setPriority] = useState<number>(
    es && es.priority > 0 ? es.priority : 5,
  );
  const [rampUp, setRampUp] = useState<boolean>(es?.rampUpOnSpareEnergy ?? true);
  const [reactionTime, setReactionTime] = useState<number>(Math.round((es?.powerReactionTime ?? 60000) / 1000));
  const [runAnyways, setRunAnyways] = useState<boolean>(es?.runAnyways ?? false);

  if (!es) return null;

  const effectivePriority = decoupled ? PRIORITY_IGNORE : priority;

  const handleSave = async () => {
    if (!device.id) return;
    setIsSaving(true);
    try {
      const update: Partial<EnergySettings> = {
        priority: effectivePriority,
        rampUpOnSpareEnergy: rampUp,
        powerReactionTime: reactionTime * 1000,
        runAnyways,
      };
      await updateDeviceSettings(device.id, { energySettings: update });
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to save energy settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Energieeinstellungen
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        {/* Decoupled toggle */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Entkoppelt</span>
          <button
            onClick={() => setDecoupled((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${decoupled ? 'bg-primary' : 'bg-secondary'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${decoupled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Priority slider — only when not decoupled */}
        {!decoupled && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Priorität</span>
              <span className="font-medium">{priority}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 (niedrig)</span>
              <span>100 (max)</span>
            </div>
          </div>
        )}

        {/* rampUpOnSpareEnergy */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Bei Überschuss hochfahren</span>
          <button
            onClick={() => setRampUp(!rampUp)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rampUp ? 'bg-primary' : 'bg-secondary'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rampUp ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* runAnyways */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Immer an</span>
          <button
            onClick={() => setRunAnyways(!runAnyways)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${runAnyways ? 'bg-primary' : 'bg-secondary'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${runAnyways ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* powerReactionTime */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Reaktionszeit</span>
            <span className="font-medium">{reactionTime}s</span>
          </div>
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={reactionTime}
            onChange={(e) => setReactionTime(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Speichern…' : 'Speichern'}
        </button>
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
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              batteryLevel > 50 ? 'bg-green-500/20 text-green-600' : batteryLevel > 20 ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600'
            }`}
          >
            {batteryLevel.toFixed(0)}%
          </span>
        </div>
      </div>
    </section>
  );
}
