import { useState } from 'react';
import { Settings } from 'lucide-react';
import { type Room, type RoomSettings, getRoomName } from '@/stores/dataStore';
import { updateRoomSettings } from '@/api/rooms';

interface RoomSettingsSectionProps {
  room: Room;
  onUpdate: () => void;
}

export function RoomSettingsSection({ room, onUpdate }: RoomSettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const settings = room.settings;
  
  const [localSettings, setLocalSettings] = useState<RoomSettings>({
    // Light settings
    ambientLightAfterSunset: settings?.ambientLightAfterSunset ?? false,
    lichtSonnenAufgangAus: settings?.lichtSonnenAufgangAus ?? false,
    lightIfNoWindows: settings?.lightIfNoWindows ?? false,
    lampenBeiBewegung: settings?.lampenBeiBewegung ?? true,
    roomIsAlwaysDark: settings?.roomIsAlwaysDark ?? false,
    includeLampsInNormalMovementLightning: settings?.includeLampsInNormalMovementLightning ?? true,
    sonnenAufgangLampenDelay: settings?.sonnenAufgangLampenDelay ?? 0,
    sonnenUntergangLampenDelay: settings?.sonnenUntergangLampenDelay ?? 0,
    // Shutter settings
    rolloHeatReduction: settings?.rolloHeatReduction ?? true,
    sonnenAufgangRollos: settings?.sonnenAufgangRollos ?? true,
    sonnenAufgangRolloDelay: settings?.sonnenAufgangRolloDelay ?? 0,
    sonnenAufgangRolloMinTime: settings?.sonnenAufgangRolloMinTime ?? { hours: 6, minutes: 0 },
    sonnenUntergangRollos: settings?.sonnenUntergangRollos ?? true,
    sonnenUntergangRolloDelay: settings?.sonnenUntergangRolloDelay ?? 0,
    sonnenUntergangRolloMaxTime: settings?.sonnenUntergangRolloMaxTime ?? { hours: 22, minutes: 0 },
    sonnenUntergangRolloAdditionalOffsetPerCloudiness: settings?.sonnenUntergangRolloAdditionalOffsetPerCloudiness ?? 0,
    // Other
    movementResetTimer: settings?.movementResetTimer ?? 300,
    radioUrl: settings?.radioUrl ?? '',
  });

  const handleSave = async () => {
    const roomName = getRoomName(room);
    if (!roomName) return;
    
    setIsSaving(true);
    try {
      await updateRoomSettings(roomName, localSettings);
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      console.error('Failed to save room settings:', e);
    }
    setIsSaving(false);
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Settings className="h-4 w-4" />
        Raum-Einstellungen
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <SettingToggle
          label="Bearbeiten"
          checked={isEditing}
          onChange={setIsEditing}
          bold
        />

        {/* Light Settings */}
        <SettingsGroup title="Licht-Einstellungen" disabled={!isEditing}>
          <SettingToggle label="Ambientelicht nach Sonnenuntergang" 
            checked={localSettings.ambientLightAfterSunset ?? false}
            onChange={(v) => setLocalSettings(s => ({ ...s, ambientLightAfterSunset: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Licht bei Sonnenaufgang aus" 
            checked={localSettings.lichtSonnenAufgangAus ?? false}
            onChange={(v) => setLocalSettings(s => ({ ...s, lichtSonnenAufgangAus: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Licht wenn keine Fenster" 
            checked={localSettings.lightIfNoWindows ?? false}
            onChange={(v) => setLocalSettings(s => ({ ...s, lightIfNoWindows: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Lampen bei Bewegung" 
            checked={localSettings.lampenBeiBewegung ?? true}
            onChange={(v) => setLocalSettings(s => ({ ...s, lampenBeiBewegung: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Raum ist immer dunkel" 
            checked={localSettings.roomIsAlwaysDark ?? false}
            onChange={(v) => setLocalSettings(s => ({ ...s, roomIsAlwaysDark: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Lampen bei normaler Bewegungsbeleuchtung" 
            checked={localSettings.includeLampsInNormalMovementLightning ?? true}
            onChange={(v) => setLocalSettings(s => ({ ...s, includeLampsInNormalMovementLightning: v }))} 
            disabled={!isEditing} />
          <SettingSlider label="Lampen-Verzögerung Sonnenaufgang" 
            value={localSettings.sonnenAufgangLampenDelay ?? 0} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenAufgangLampenDelay: v }))} 
            disabled={!isEditing} />
          <SettingSlider label="Lampen-Verzögerung Sonnenuntergang" 
            value={localSettings.sonnenUntergangLampenDelay ?? 0} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenUntergangLampenDelay: v }))} 
            disabled={!isEditing} />
        </SettingsGroup>

        {/* Shutter Settings */}
        <SettingsGroup title="Rolladen-Einstellungen" disabled={!isEditing}>
          <SettingToggle label="Rollo-Hitzeschutz" 
            checked={localSettings.rolloHeatReduction ?? true}
            onChange={(v) => setLocalSettings(s => ({ ...s, rolloHeatReduction: v }))} 
            disabled={!isEditing} />
          <SettingToggle label="Rollos bei Sonnenaufgang öffnen" 
            checked={localSettings.sonnenAufgangRollos ?? true}
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenAufgangRollos: v }))} 
            disabled={!isEditing} />
          <SettingSlider label="Rollo-Verzögerung Sonnenaufgang" 
            value={localSettings.sonnenAufgangRolloDelay ?? 0} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenAufgangRolloDelay: v }))} 
            disabled={!isEditing} />
          <SettingTimePicker label="Früheste Rollo-Zeit" 
            hours={localSettings.sonnenAufgangRolloMinTime?.hours ?? 6} 
            minutes={localSettings.sonnenAufgangRolloMinTime?.minutes ?? 0}
            onChange={(h, m) => setLocalSettings(s => ({ ...s, sonnenAufgangRolloMinTime: { hours: h, minutes: m } }))} 
            disabled={!isEditing} />
          <SettingToggle label="Rollos bei Sonnenuntergang schließen" 
            checked={localSettings.sonnenUntergangRollos ?? true}
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenUntergangRollos: v }))} 
            disabled={!isEditing} />
          <SettingSlider label="Rollo-Verzögerung Sonnenuntergang" 
            value={localSettings.sonnenUntergangRolloDelay ?? 0} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenUntergangRolloDelay: v }))} 
            disabled={!isEditing} />
          <SettingTimePicker label="Späteste Rollo-Zeit" 
            hours={localSettings.sonnenUntergangRolloMaxTime?.hours ?? 22} 
            minutes={localSettings.sonnenUntergangRolloMaxTime?.minutes ?? 0}
            onChange={(h, m) => setLocalSettings(s => ({ ...s, sonnenUntergangRolloMaxTime: { hours: h, minutes: m } }))} 
            disabled={!isEditing} />
          <SettingSlider label="Bewölkungs-Verzögerung" 
            value={localSettings.sonnenUntergangRolloAdditionalOffsetPerCloudiness ?? 0} 
            min={0} max={0.5} step={0.025} unit=" min/%"
            onChange={(v) => setLocalSettings(s => ({ ...s, sonnenUntergangRolloAdditionalOffsetPerCloudiness: v }))} 
            disabled={!isEditing} />
        </SettingsGroup>

        {/* Other Settings */}
        <SettingsGroup title="Sonstige Einstellungen" disabled={!isEditing}>
          <SettingSlider label="Bewegungs-Reset-Timer" 
            value={localSettings.movementResetTimer ?? 300} min={60} max={3600} step={30} unit=" s"
            onChange={(v) => setLocalSettings(s => ({ ...s, movementResetTimer: v }))} 
            disabled={!isEditing} />
        </SettingsGroup>

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

// Helper Components

interface SettingsGroupProps {
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function SettingsGroup({ title, disabled, children }: SettingsGroupProps) {
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  bold?: boolean;
}

function SettingToggle({ label, checked, onChange, disabled, bold }: SettingToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className={`text-sm ${bold ? 'font-medium' : ''}`}>{label}</span>
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

interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SettingSlider({ label, value, min, max, step = 1, unit = '', onChange, disabled }: SettingSliderProps) {
  const displayValue = step < 1 ? value.toFixed(3) : value;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>{label}</span>
        <span className="font-medium">{displayValue}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-primary"
      />
    </div>
  );
}

interface SettingTimePickerProps {
  label: string;
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
}

function SettingTimePicker({ label, hours, minutes, onChange, disabled }: SettingTimePickerProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <select
          value={hours}
          onChange={(e) => onChange(Number(e.target.value), minutes)}
          disabled={disabled}
          className="rounded-lg bg-secondary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
        <span>:</span>
        <select
          value={minutes}
          onChange={(e) => onChange(hours, Number(e.target.value))}
          disabled={disabled}
          className="rounded-lg bg-secondary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
