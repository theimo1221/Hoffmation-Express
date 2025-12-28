import { useState } from 'react';
import { Settings } from 'lucide-react';
import { type Device, type ActuatorSettings, type ShutterSettings } from '@/stores/dataStore';
import { updateDeviceSettings } from '@/api/devices';

interface DeviceSettingsSectionProps {
  device: Device;
  onUpdate: () => void;
}

export function DeviceSettingsSection({ device, onUpdate }: DeviceSettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check device capabilities (from hoffmation-base DeviceCapability enum)
  const capabilities = device.deviceCapabilities ?? [];
  const CAP_ACTUATOR = 1;
  const CAP_LAMP = 8;
  const CAP_DIMMABLE = 9;
  const CAP_SHUTTER = 11;
  const CAP_LED = 18;
  
  const isLampOrActuator = capabilities.includes(CAP_LAMP) || 
                           capabilities.includes(CAP_DIMMABLE) || 
                           capabilities.includes(CAP_LED) || 
                           capabilities.includes(CAP_ACTUATOR);
  const isShutter = capabilities.includes(CAP_SHUTTER);
  
  // Only show settings if device has the capability AND settings exist
  const actuatorSettings = isLampOrActuator ? 
    (device.settings?.actuatorSettings ?? device.settings?.dimmerSettings ?? device.settings?.ledSettings) : 
    undefined;
  const shutterSettings = isShutter ? device.settings?.shutterSettings : undefined;
  
  const [localActuatorSettings, setLocalActuatorSettings] = useState<ActuatorSettings>({
    dayOn: actuatorSettings?.dayOn ?? false,
    dawnOn: actuatorSettings?.dawnOn ?? false,
    duskOn: actuatorSettings?.duskOn ?? false,
    nightOn: actuatorSettings?.nightOn ?? false,
    includeInAmbientLight: actuatorSettings?.includeInAmbientLight ?? false,
  });
  
  const [localShutterSettings, setLocalShutterSettings] = useState<ShutterSettings>({
    direction: shutterSettings?.direction ?? 0,
    heatReductionPosition: shutterSettings?.heatReductionPosition ?? 25,
    heatReductionThreshold: shutterSettings?.heatReductionThreshold ?? 27,
    heatReductionDirectionThreshold: shutterSettings?.heatReductionDirectionThreshold ?? 24,
  });

  const hasActuatorSettings = !!actuatorSettings;
  const hasShutterSettings = !!shutterSettings;

  if (!hasActuatorSettings && !hasShutterSettings) {
    return null;
  }

  const handleSave = async () => {
    if (!device.id) return;
    setIsSaving(true);
    try {
      const settings: Record<string, unknown> = {};
      if (hasActuatorSettings) {
        settings.actuatorSettings = localActuatorSettings;
      }
      if (hasShutterSettings) {
        settings.shutterSettings = localShutterSettings;
      }
      await updateDeviceSettings(device.id, settings);
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    setIsSaving(false);
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Einstellungen
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Bearbeiten</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isEditing}
              onChange={(e) => setIsEditing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </div>
        </label>

        {hasActuatorSettings && (
          <div className={`space-y-3 ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-sm font-medium text-muted-foreground">Lampen-Einstellungen</h3>
            
            <SettingToggle
              label="Tagsüber an"
              checked={localActuatorSettings.dayOn ?? false}
              onChange={(v) => setLocalActuatorSettings(s => ({ ...s, dayOn: v }))}
              disabled={!isEditing}
            />
            <SettingToggle
              label="Morgens an"
              checked={localActuatorSettings.dawnOn ?? false}
              onChange={(v) => setLocalActuatorSettings(s => ({ ...s, dawnOn: v }))}
              disabled={!isEditing}
            />
            <SettingToggle
              label="Abends an"
              checked={localActuatorSettings.duskOn ?? false}
              onChange={(v) => setLocalActuatorSettings(s => ({ ...s, duskOn: v }))}
              disabled={!isEditing}
            />
            <SettingToggle
              label="Nachts an"
              checked={localActuatorSettings.nightOn ?? false}
              onChange={(v) => setLocalActuatorSettings(s => ({ ...s, nightOn: v }))}
              disabled={!isEditing}
            />
            <SettingToggle
              label="In Ambientelicht einbeziehen"
              checked={localActuatorSettings.includeInAmbientLight ?? false}
              onChange={(v) => setLocalActuatorSettings(s => ({ ...s, includeInAmbientLight: v }))}
              disabled={!isEditing}
            />
          </div>
        )}

        {hasShutterSettings && (
          <div className={`space-y-3 ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-sm font-medium text-muted-foreground">Rolladen-Einstellungen</h3>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Fensterrichtung</span>
                <span className="font-medium">{localShutterSettings.direction}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={localShutterSettings.direction}
                onChange={(e) => setLocalShutterSettings(s => ({ ...s, direction: Number(e.target.value) }))}
                disabled={!isEditing}
                className="w-full accent-primary"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Hitzeschutz-Position</span>
                <span className="font-medium">{localShutterSettings.heatReductionPosition}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localShutterSettings.heatReductionPosition}
                onChange={(e) => setLocalShutterSettings(s => ({ ...s, heatReductionPosition: Number(e.target.value) }))}
                disabled={!isEditing}
                className="w-full accent-primary"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Hitzeschutz-Schwelle (Richtung)</span>
                <span className="font-medium">{localShutterSettings.heatReductionDirectionThreshold}°C</span>
              </div>
              <input
                type="range"
                min="20"
                max="35"
                step="1"
                value={localShutterSettings.heatReductionDirectionThreshold}
                onChange={(e) => setLocalShutterSettings(s => ({ ...s, heatReductionDirectionThreshold: Number(e.target.value) }))}
                disabled={!isEditing}
                className="w-full accent-primary"
              />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Hitzeschutz-Schwelle (Global)</span>
                <span className="font-medium">{localShutterSettings.heatReductionThreshold}°C</span>
              </div>
              <input
                type="range"
                min="20"
                max="35"
                step="1"
                value={localShutterSettings.heatReductionThreshold}
                onChange={(e) => setLocalShutterSettings(s => ({ ...s, heatReductionThreshold: Number(e.target.value) }))}
                disabled={!isEditing}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        )}
      </div>
    </section>
  );
}

interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingToggle({ label, checked, onChange, disabled }: SettingToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary disabled:opacity-50"></div>
      </div>
    </label>
  );
}
