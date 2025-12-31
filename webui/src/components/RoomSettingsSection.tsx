import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { type Room, type RoomSettings, getRoomName, getRoomWebUISettings, type RoomWebUISettings } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateRoomSettings } from '@/api/rooms';
import { IconPicker } from './IconPicker';
import { ColorPicker } from './ColorPicker';

interface RoomSettingsSectionProps {
  room: Room;
  onUpdate: () => void;
}

export function RoomSettingsSection({ room, onUpdate }: RoomSettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { floors: floorDefinitions, loadFloors } = useSettingsStore();
  
  const settings = room.settings;
  
  // WebUI settings state
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    loadFloors();
  }, [loadFloors]);
  
  // Update WebUI settings when room changes
  useEffect(() => {
    const webuiSettings = getRoomWebUISettings(room);
    console.log('RoomSettingsSection: Loading WebUI settings for room', getRoomName(room));
    console.log('  customSettingsJson:', room.settings?.customSettingsJson);
    console.log('  parsed webuiSettings:', webuiSettings);
    setSelectedFloors(webuiSettings?.crossSectionFloors ?? []);
    setSelectedIcon(webuiSettings?.icon);
    setSelectedColor(webuiSettings?.color);
  }, [room]);
  
  // Store only the original values from backend (no defaults)
  const [originalSettings] = useState<RoomSettings>(settings ?? {});
  
  // Track only changed fields
  const [changedFields, setChangedFields] = useState<Partial<RoomSettings>>({});
  
  // Get display value: changed value > original value > default
  const getDisplayValue = <K extends keyof RoomSettings>(
    key: K,
    defaultValue: RoomSettings[K]
  ): RoomSettings[K] => {
    if (key in changedFields) return changedFields[key];
    if (key in originalSettings) return originalSettings[key];
    return defaultValue;
  };
  
  // Update a field and track it as changed
  const updateField = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
    setChangedFields(prev => ({ ...prev, [key]: value }));
  };
  
  // Get current display values (defaults match hoffmation-base)
  const localSettings = {
    ambientLightAfterSunset: getDisplayValue('ambientLightAfterSunset', false),
    lichtSonnenAufgangAus: getDisplayValue('lichtSonnenAufgangAus', true),
    lightIfNoWindows: getDisplayValue('lightIfNoWindows', false),
    lampenBeiBewegung: getDisplayValue('lampenBeiBewegung', true),
    roomIsAlwaysDark: getDisplayValue('roomIsAlwaysDark', false),
    includeLampsInNormalMovementLightning: getDisplayValue('includeLampsInNormalMovementLightning', false),
    sonnenAufgangLampenDelay: getDisplayValue('sonnenAufgangLampenDelay', 15),
    sonnenUntergangLampenDelay: getDisplayValue('sonnenUntergangLampenDelay', 15),
    rolloHeatReduction: getDisplayValue('rolloHeatReduction', true),
    sonnenAufgangRollos: getDisplayValue('sonnenAufgangRollos', true),
    sonnenAufgangRolloDelay: getDisplayValue('sonnenAufgangRolloDelay', 35),
    sonnenAufgangRolloMinTime: getDisplayValue('sonnenAufgangRolloMinTime', { hours: 7, minutes: 30 }),
    sonnenUntergangRollos: getDisplayValue('sonnenUntergangRollos', true),
    sonnenUntergangRolloDelay: getDisplayValue('sonnenUntergangRolloDelay', 15),
    sonnenUntergangRolloMaxTime: getDisplayValue('sonnenUntergangRolloMaxTime', { hours: 21, minutes: 30 }),
    sonnenUntergangRolloAdditionalOffsetPerCloudiness: getDisplayValue('sonnenUntergangRolloAdditionalOffsetPerCloudiness', 0.25),
    movementResetTimer: getDisplayValue('movementResetTimer', 240),
    radioUrl: getDisplayValue('radioUrl', ''),
    trilaterationStartPoint: getDisplayValue('trilaterationStartPoint', room.startPoint),
    trilaterationEndPoint: getDisplayValue('trilaterationEndPoint', room.endPoint),
  };

  const handleSave = async () => {
    const roomName = getRoomName(room);
    if (!roomName) return;
    
    // Build WebUI settings if any are set
    const hasWebuiChanges = selectedFloors.length > 0 || selectedIcon || selectedColor;
    let updatedSettings = { ...changedFields };
    
    if (hasWebuiChanges) {
      const webuiData: RoomWebUISettings = {};
      if (selectedFloors.length > 0) webuiData.crossSectionFloors = selectedFloors;
      if (selectedIcon) webuiData.icon = selectedIcon;
      if (selectedColor) webuiData.color = selectedColor;
      
      updatedSettings.customSettingsJson = JSON.stringify({ webui: webuiData });
    }
    
    // Only send if there are changes
    if (Object.keys(updatedSettings).length === 0) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await updateRoomSettings(roomName, updatedSettings);
      setIsEditing(false);
      setChangedFields({});
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
            onChange={(v) => updateField('ambientLightAfterSunset', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Licht bei Sonnenaufgang aus" 
            checked={localSettings.lichtSonnenAufgangAus ?? true}
            onChange={(v) => updateField('lichtSonnenAufgangAus', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Licht wenn keine Fenster" 
            checked={localSettings.lightIfNoWindows ?? false}
            onChange={(v) => updateField('lightIfNoWindows', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Lampen bei Bewegung" 
            checked={localSettings.lampenBeiBewegung ?? true}
            onChange={(v) => updateField('lampenBeiBewegung', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Raum ist immer dunkel" 
            checked={localSettings.roomIsAlwaysDark ?? false}
            onChange={(v) => updateField('roomIsAlwaysDark', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Lampen bei normaler Bewegungsbeleuchtung" 
            checked={localSettings.includeLampsInNormalMovementLightning ?? false}
            onChange={(v) => updateField('includeLampsInNormalMovementLightning', v)} 
            disabled={!isEditing} />
          <SettingSlider label="Lampen-Verzögerung Sonnenaufgang" 
            value={localSettings.sonnenAufgangLampenDelay ?? 15} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => updateField('sonnenAufgangLampenDelay', v)} 
            disabled={!isEditing} />
          <SettingSlider label="Lampen-Verzögerung Sonnenuntergang" 
            value={localSettings.sonnenUntergangLampenDelay ?? 15} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => updateField('sonnenUntergangLampenDelay', v)} 
            disabled={!isEditing} />
        </SettingsGroup>

        {/* Shutter Settings */}
        <SettingsGroup title="Rolladen-Einstellungen" disabled={!isEditing}>
          <SettingToggle label="Rollo-Hitzeschutz" 
            checked={localSettings.rolloHeatReduction ?? true}
            onChange={(v) => updateField('rolloHeatReduction', v)} 
            disabled={!isEditing} />
          <SettingToggle label="Rollos bei Sonnenaufgang öffnen" 
            checked={localSettings.sonnenAufgangRollos ?? true}
            onChange={(v) => updateField('sonnenAufgangRollos', v)} 
            disabled={!isEditing} />
          <SettingSlider label="Rollo-Verzögerung Sonnenaufgang" 
            value={localSettings.sonnenAufgangRolloDelay ?? 35} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => updateField('sonnenAufgangRolloDelay', v)} 
            disabled={!isEditing} />
          <SettingTimePicker label="Früheste Rollo-Zeit" 
            hours={localSettings.sonnenAufgangRolloMinTime?.hours ?? 7} 
            minutes={localSettings.sonnenAufgangRolloMinTime?.minutes ?? 30}
            onChange={(h, m) => updateField('sonnenAufgangRolloMinTime', { hours: h, minutes: m })} 
            disabled={!isEditing} />
          <SettingToggle label="Rollos bei Sonnenuntergang schließen" 
            checked={localSettings.sonnenUntergangRollos ?? true}
            onChange={(v) => updateField('sonnenUntergangRollos', v)} 
            disabled={!isEditing} />
          <SettingSlider label="Rollo-Verzögerung Sonnenuntergang" 
            value={localSettings.sonnenUntergangRolloDelay ?? 15} min={-120} max={120} step={5} unit=" min"
            onChange={(v) => updateField('sonnenUntergangRolloDelay', v)} 
            disabled={!isEditing} />
          <SettingTimePicker label="Späteste Rollo-Zeit" 
            hours={localSettings.sonnenUntergangRolloMaxTime?.hours ?? 21} 
            minutes={localSettings.sonnenUntergangRolloMaxTime?.minutes ?? 30}
            onChange={(h, m) => updateField('sonnenUntergangRolloMaxTime', { hours: h, minutes: m })} 
            disabled={!isEditing} />
          <SettingSlider label="Bewölkungs-Verzögerung" 
            value={localSettings.sonnenUntergangRolloAdditionalOffsetPerCloudiness ?? 0.25} 
            min={0} max={0.5} step={0.025} unit=" min/%"
            onChange={(v) => updateField('sonnenUntergangRolloAdditionalOffsetPerCloudiness', v)} 
            disabled={!isEditing} />
        </SettingsGroup>

        {/* WebUI Settings */}
        <SettingsGroup title="WebUI-Einstellungen" disabled={!isEditing}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Etagen (Multi-Floor)</label>
              <select
                value=""
                onChange={(e) => {
                  const floorId = e.target.value;
                  if (floorId && !selectedFloors.includes(floorId)) {
                    setSelectedFloors([...selectedFloors, floorId]);
                  }
                }}
                disabled={!isEditing}
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Etage hinzufügen...</option>
                {floorDefinitions
                  .filter(floor => !selectedFloors.includes(floor.id))
                  .map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
              </select>
              
              {/* Selected floors as badges */}
              {selectedFloors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedFloors.map((floorId) => {
                    const floor = floorDefinitions.find(f => f.id === floorId);
                    if (!floor) return null;
                    return (
                      <span
                        key={floorId}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      >
                        {floor.name}
                        <button
                          type="button"
                          onClick={() => setSelectedFloors(selectedFloors.filter(id => id !== floorId))}
                          disabled={!isEditing}
                          className="ml-1 hover:bg-primary/20 rounded-full p-0.5 disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              
              {selectedFloors.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Keine Auswahl = Automatisch aus Raum-Etage</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <IconPicker 
                value={selectedIcon} 
                onChange={setSelectedIcon}
                color={selectedColor}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Farbe</label>
              <ColorPicker 
                value={selectedColor} 
                onChange={setSelectedColor}
              />
            </div>
          </div>
        </SettingsGroup>

        {/* Other Settings */}
        <SettingsGroup title="Sonstige Einstellungen" disabled={!isEditing}>
          <SettingSlider label="Bewegungs-Reset-Timer" 
            value={localSettings.movementResetTimer ?? 240} min={60} max={3600} step={30} unit=" s"
            onChange={(v) => updateField('movementResetTimer', v)} 
            disabled={!isEditing} />
        </SettingsGroup>

        {/* Trilateration Settings */}
        <SettingsGroup title="Raum-Koordinaten (Trilateration)" disabled={!isEditing}>
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Startpunkt</h4>
              <div className="grid grid-cols-3 gap-2">
                <SettingNumberInput 
                  label="X" 
                  value={localSettings.trilaterationStartPoint?.x ?? 0}
                  onChange={(v) => updateField('trilaterationStartPoint', { 
                    ...(localSettings.trilaterationStartPoint ?? { x: 0, y: 0, z: 0 }), 
                    x: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
                <SettingNumberInput 
                  label="Y" 
                  value={localSettings.trilaterationStartPoint?.y ?? 0}
                  onChange={(v) => updateField('trilaterationStartPoint', { 
                    ...(localSettings.trilaterationStartPoint ?? { x: 0, y: 0, z: 0 }), 
                    y: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
                <SettingNumberInput 
                  label="Z" 
                  value={localSettings.trilaterationStartPoint?.z ?? 0}
                  onChange={(v) => updateField('trilaterationStartPoint', { 
                    ...(localSettings.trilaterationStartPoint ?? { x: 0, y: 0, z: 0 }), 
                    z: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Endpunkt</h4>
              <div className="grid grid-cols-3 gap-2">
                <SettingNumberInput 
                  label="X" 
                  value={localSettings.trilaterationEndPoint?.x ?? 0}
                  onChange={(v) => updateField('trilaterationEndPoint', { 
                    ...(localSettings.trilaterationEndPoint ?? { x: 0, y: 0, z: 0 }), 
                    x: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
                <SettingNumberInput 
                  label="Y" 
                  value={localSettings.trilaterationEndPoint?.y ?? 0}
                  onChange={(v) => updateField('trilaterationEndPoint', { 
                    ...(localSettings.trilaterationEndPoint ?? { x: 0, y: 0, z: 0 }), 
                    y: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
                <SettingNumberInput 
                  label="Z" 
                  value={localSettings.trilaterationEndPoint?.z ?? 0}
                  onChange={(v) => updateField('trilaterationEndPoint', { 
                    ...(localSettings.trilaterationEndPoint ?? { x: 0, y: 0, z: 0 }), 
                    z: v 
                  })}
                  disabled={!isEditing}
                  step={0.1}
                />
              </div>
            </div>
          </div>
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

interface SettingNumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

function SettingNumberInput({ label, value, onChange, disabled, step = 0.1, min, max }: SettingNumberInputProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className="w-full rounded-lg bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
    </div>
  );
}
