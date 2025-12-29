import { useState } from 'react';
import { ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import { type Room, type Device, type GroupData, getRoomName, getDeviceRoom, getDeviceName, useDataStore } from '@/stores/dataStore';
import { updateGroupSettings, type HeatGroupSettings } from '@/api/rooms';
import { cn } from '@/lib/utils';
import { DeviceIcon } from '@/components/DeviceIcon';
import { GROUP_TYPE_NAMES, GROUP_CAPABILITIES } from './types';

interface GroupDetailViewProps {
  room: Room;
  groupType: string;
  group: GroupData;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
}

export function GroupDetailView({ room, groupType, group, devices, onBack, onSelectDevice }: GroupDetailViewProps) {
  const roomName = getRoomName(room);
  const { fetchData } = useDataStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Heat group settings state
  const heatSettings = (group.settings as HeatGroupSettings | undefined) ?? {};
  const [localHeatSettings, setLocalHeatSettings] = useState<HeatGroupSettings>({
    automaticMode: heatSettings.automaticMode ?? true,
    automaticFallBackTemperatur: heatSettings.automaticFallBackTemperatur ?? 20,
    manualTemperature: heatSettings.manualTemperature ?? 20,
  });
  
  const groupName = GROUP_TYPE_NAMES[groupType] || `Gruppe ${groupType}`;
  const isHeatGroup = groupType === '8';
  
  // Get devices for this room that match the group type
  const roomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  
  // Filter devices by group type capability
  const relevantCaps = GROUP_CAPABILITIES[groupType] || [];
  const groupDevices = relevantCaps.length > 0 
    ? roomDevices.filter(d => {
        const caps = d.deviceCapabilities ?? [];
        return relevantCaps.some(c => caps.includes(c));
      })
    : roomDevices;

  const handleSaveSettings = async () => {
    if (!group.id) return;
    setIsSaving(true);
    try {
      await updateGroupSettings(group.id, localHeatSettings);
      await fetchData();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save group settings:', error);
      alert('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{groupName}</h1>
          <p className="text-sm text-muted-foreground">{roomName}</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Gruppen-Info
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gruppen-ID</span>
              <span className="font-mono">{group.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ</span>
              <span>{groupName}</span>
            </div>
          </div>
        </section>

        {/* Heat Group Settings */}
        {isHeatGroup && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Heizgruppen-Einstellungen
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Bearbeiten</span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    isEditing ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    isEditing ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className={`space-y-4 ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <span>Automatik-Modus</span>
                  <button
                    onClick={() => setLocalHeatSettings(s => ({ ...s, automaticMode: !s.automaticMode }))}
                    disabled={!isEditing}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-colors",
                      localHeatSettings.automaticMode ? "bg-primary" : "bg-secondary"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      localHeatSettings.automaticMode ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Fallback-Temperatur (Automatik)</span>
                    <span className="font-mono">{localHeatSettings.automaticFallBackTemperatur}°C</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={25}
                    step={0.5}
                    value={localHeatSettings.automaticFallBackTemperatur}
                    onChange={(e) => setLocalHeatSettings(s => ({ ...s, automaticFallBackTemperatur: parseFloat(e.target.value) }))}
                    disabled={!isEditing}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Manuelle Temperatur</span>
                    <span className="font-mono">{localHeatSettings.manualTemperature}°C</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={25}
                    step={0.5}
                    value={localHeatSettings.manualTemperature}
                    onChange={(e) => setLocalHeatSettings(s => ({ ...s, manualTemperature: parseFloat(e.target.value) }))}
                    disabled={!isEditing}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {isEditing && (
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Speichern...' : 'Einstellungen speichern'}
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Geräte ({groupDevices.length})
          </h2>
          <div className="space-y-3">
            {groupDevices.map((device) => {
              const name = getDeviceName(device, roomName);
              return (
                <button
                  key={device.id ?? name}
                  onClick={() => onSelectDevice(device)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <DeviceIcon device={device} size="md" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
            {groupDevices.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Keine Geräte in dieser Gruppe
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
