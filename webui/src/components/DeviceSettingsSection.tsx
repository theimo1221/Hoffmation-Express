import { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  type Device,
  type ActuatorSettings,
  type DimmerSettings,
  type LedSettings,
  type ShutterSettings,
  type HeaterSettings,
  type AcSettings,
  type HandleSettings,
  type CameraSettings,
  type MotionSensorSettings,
  type SceneSettings,
  type SpeakerSettings,
  type DachsSettings,
} from '@/stores/dataStore';
import { updateDeviceSettings } from '@/api/devices';

interface DeviceSettingsSectionProps {
  device: Device;
  onUpdate: () => void;
}

// Capability constants from hoffmation-base
const CAP_AC = 0;
const CAP_ACTUATOR = 1;
const CAP_HEATER = 5;
const CAP_LAMP = 8;
const CAP_DIMMABLE = 9;
const CAP_MOTION_SENSOR = 10;
const CAP_SHUTTER = 11;
const CAP_SPEAKER = 14;
const CAP_HANDLE = 15;
const CAP_LED = 18;
const CAP_SCENE = 103;
const CAP_CAMERA = 105;

export function DeviceSettingsSection({ device, onUpdate }: DeviceSettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const capabilities = device.deviceCapabilities ?? [];
  
  // Capability checks
  const isActuator = capabilities.includes(CAP_ACTUATOR);
  const isLamp = capabilities.includes(CAP_LAMP);
  const isDimmable = capabilities.includes(CAP_DIMMABLE);
  const isLed = capabilities.includes(CAP_LED);
  const isLampOrActuator = isLamp || isDimmable || isLed || isActuator;
  const isShutter = capabilities.includes(CAP_SHUTTER);
  const isHeater = capabilities.includes(CAP_HEATER);
  const isAc = capabilities.includes(CAP_AC);
  const isHandle = capabilities.includes(CAP_HANDLE);
  const isCamera = capabilities.includes(CAP_CAMERA);
  const isMotionSensor = capabilities.includes(CAP_MOTION_SENSOR);
  const isScene = capabilities.includes(CAP_SCENE);
  const isSpeaker = capabilities.includes(CAP_SPEAKER);
  
  // Get settings from device
  // Settings can be: device.settings.X (nested) OR device.settings directly (flat) OR device.X
  const deviceAny = device as Record<string, unknown>;
  const settingsAny = device.settings as Record<string, unknown> | undefined;
  
  // For LED/Dimmer/Actuator: settings are often flat in device.settings
  const flatSettings = settingsAny as (LedSettings & DimmerSettings & ActuatorSettings) | undefined;
  
  // Check if settings has LED-specific properties (flat structure)
  const hasLedProps = flatSettings && ('dayColor' in flatSettings || 'nightColor' in flatSettings);
  const hasDimmerProps = flatSettings && ('dayBrightness' in flatSettings || 'nightBrightness' in flatSettings);
  const hasActuatorProps = flatSettings && ('dayOn' in flatSettings || 'nightOn' in flatSettings);
  
  // Get settings - prefer flat structure if LED/Dimmer props exist
  const ledSettings = hasLedProps ? flatSettings : (device.settings?.ledSettings ?? deviceAny.ledSettings as LedSettings | undefined);
  const dimmerSettings = hasDimmerProps ? flatSettings : (device.settings?.dimmerSettings ?? deviceAny.dimmerSettings as DimmerSettings | undefined);
  const actuatorSettings = hasActuatorProps ? flatSettings : (device.settings?.actuatorSettings ?? deviceAny.actuatorSettings as ActuatorSettings | undefined);
  
  // Check for other flat settings
  const hasShutterProps = flatSettings && ('direction' in flatSettings || 'heatReductionPosition' in flatSettings);
  const hasHeaterProps = flatSettings && ('controlByPid' in flatSettings || 'pidForcedMinimum' in flatSettings);
  const hasAcProps = flatSettings && ('heatingAllowed' in flatSettings || 'minOutdoorTempForCooling' in flatSettings);
  const hasHandleProps = flatSettings && ('informOnOpen' in flatSettings || 'informIsHelping' in flatSettings);
  const hasCameraProps = flatSettings && ('alertPersonOnTelegram' in flatSettings || 'movementDetectionOnPersonOnly' in flatSettings);
  const hasMotionSensorProps = flatSettings && ('seesWindow' in flatSettings || 'excludeFromNightAlarm' in flatSettings);
  const hasSceneProps = flatSettings && 'defaultTurnOffTimeout' in flatSettings;
  const hasSpeakerProps = flatSettings && ('maxPlayOnAllVolume' in flatSettings || 'defaultDayAnounceVolume' in flatSettings);
  const hasDachsProps = flatSettings && ('disableHeatingRod' in flatSettings || 'batteryLevelTurnOnThreshold' in flatSettings);
  
  const shutterSettings = hasShutterProps ? flatSettings as unknown as ShutterSettings : (device.settings?.shutterSettings ?? deviceAny.shutterSettings as ShutterSettings | undefined);
  const heaterSettings = hasHeaterProps ? flatSettings as unknown as HeaterSettings : (device.settings?.heaterSettings ?? deviceAny.heaterSettings as HeaterSettings | undefined);
  const acSettings = hasAcProps ? flatSettings as unknown as AcSettings : (device.settings?.acSettings ?? deviceAny.acSettings as AcSettings | undefined);
  const handleSettings = hasHandleProps ? flatSettings as unknown as HandleSettings : (device.settings?.handleSettings ?? deviceAny.handleSettings as HandleSettings | undefined);
  const cameraSettings = hasCameraProps ? flatSettings as unknown as CameraSettings : (device.settings?.cameraSettings ?? deviceAny.cameraSettings as CameraSettings | undefined);
  const motionSensorSettings = hasMotionSensorProps ? flatSettings as unknown as MotionSensorSettings : (device.settings?.motionSensorSettings ?? deviceAny.motionSensorSettings as MotionSensorSettings | undefined);
  const sceneSettings = hasSceneProps ? flatSettings as unknown as SceneSettings : (device.settings?.sceneSettings ?? deviceAny.sceneSettings as SceneSettings | undefined);
  const speakerSettings = hasSpeakerProps ? flatSettings as unknown as SpeakerSettings : (device.settings?.speakerSettings ?? deviceAny.speakerSettings as SpeakerSettings | undefined);
  const dachsSettings = hasDachsProps ? flatSettings as unknown as DachsSettings : (device.settings?.dachsSettings ?? deviceAny.dachsSettings as DachsSettings | undefined);
  
  // Local state for all settings - only use backend values, no fallback defaults
  const [localActuator, setLocalActuator] = useState<ActuatorSettings | undefined>(
    actuatorSettings ?? dimmerSettings ?? ledSettings
  );
  
  const [localDimmer, setLocalDimmer] = useState<DimmerSettings | undefined>(
    dimmerSettings ?? ledSettings
  );
  
  const [localLed, setLocalLed] = useState<LedSettings | undefined>(
    ledSettings
  );
  
  const [localShutter, setLocalShutter] = useState<ShutterSettings | undefined>(
    shutterSettings
  );
  
  const [localHeater, setLocalHeater] = useState<HeaterSettings | undefined>(
    heaterSettings
  );
  
  const [localAc, setLocalAc] = useState<AcSettings | undefined>(
    acSettings
  );
  
  const [localHandle, setLocalHandle] = useState<HandleSettings | undefined>(
    handleSettings
  );
  
  const [localCamera, setLocalCamera] = useState<CameraSettings | undefined>(
    cameraSettings
  );
  
  const [localMotionSensor, setLocalMotionSensor] = useState<MotionSensorSettings | undefined>(
    motionSensorSettings
  );
  
  const [localScene, setLocalScene] = useState<SceneSettings | undefined>(
    sceneSettings
  );
  
  const [localSpeaker, setLocalSpeaker] = useState<SpeakerSettings | undefined>(
    speakerSettings
  );
  
  const [localDachs, setLocalDachs] = useState<DachsSettings | undefined>(
    dachsSettings
  );
  
  // Determine which settings to show based on capability AND backend data
  // Only show settings if they exist from backend (no fallback defaults)
  const showActuator = isLampOrActuator && !hasDachsProps && localActuator;
  const showDimmer = (isDimmable || isLed) && localDimmer;
  const showLed = isLed && localLed;
  const showShutter = isShutter && localShutter;
  const showHeater = isHeater && localHeater;
  const showAc = isAc && localAc;
  const showHandle = isHandle && localHandle;
  const showCamera = isCamera && localCamera;
  const showMotionSensor = isMotionSensor && localMotionSensor;
  const showScene = isScene && localScene;
  const showSpeaker = isSpeaker && localSpeaker;
  const showDachs = hasDachsProps && localDachs;

  const hasAnySettings = showActuator || showDimmer || showLed || showShutter || 
    showHeater || showAc || showHandle || showCamera || showMotionSensor || showScene || showSpeaker || showDachs;

  if (!hasAnySettings) {
    return null;
  }

  const handleSave = async () => {
    if (!device.id) return;
    setIsSaving(true);
    try {
      const settings: Record<string, unknown> = {};
      
      if (showLed) {
        settings.ledSettings = localLed;
      } else if (showDimmer) {
        settings.dimmerSettings = localDimmer;
      } else if (showActuator) {
        settings.actuatorSettings = localActuator;
      }
      if (showShutter) settings.shutterSettings = localShutter;
      if (showHeater) settings.heaterSettings = localHeater;
      if (showAc) settings.acSettings = localAc;
      if (showHandle) settings.handleSettings = localHandle;
      if (showCamera) settings.cameraSettings = localCamera;
      if (showMotionSensor) settings.motionSensorSettings = localMotionSensor;
      if (showScene) settings.sceneSettings = localScene;
      if (showSpeaker) settings.speakerSettings = localSpeaker;
      if (showDachs) settings.dachsSettings = localDachs;
      
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
        <SettingToggle
          label="Bearbeiten"
          checked={isEditing}
          onChange={setIsEditing}
          bold
        />

        {/* Actuator/Lamp Settings */}
        {showActuator && (
          <SettingsGroup title="Lampen-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Tagsüber an" checked={localActuator.dayOn ?? false}
              onChange={(v) => { setLocalActuator(s => ({ ...s, dayOn: v })); setLocalDimmer(s => ({ ...s, dayOn: v })); setLocalLed(s => ({ ...s, dayOn: v })); }} disabled={!isEditing} />
            <SettingToggle label="Morgens an" checked={localActuator.dawnOn ?? false}
              onChange={(v) => { setLocalActuator(s => ({ ...s, dawnOn: v })); setLocalDimmer(s => ({ ...s, dawnOn: v })); setLocalLed(s => ({ ...s, dawnOn: v })); }} disabled={!isEditing} />
            <SettingToggle label="Abends an" checked={localActuator.duskOn ?? false}
              onChange={(v) => { setLocalActuator(s => ({ ...s, duskOn: v })); setLocalDimmer(s => ({ ...s, duskOn: v })); setLocalLed(s => ({ ...s, duskOn: v })); }} disabled={!isEditing} />
            <SettingToggle label="Nachts an" checked={localActuator.nightOn ?? false}
              onChange={(v) => { setLocalActuator(s => ({ ...s, nightOn: v })); setLocalDimmer(s => ({ ...s, nightOn: v })); setLocalLed(s => ({ ...s, nightOn: v })); }} disabled={!isEditing} />
            <SettingToggle label="In Ambientelicht einbeziehen" checked={localActuator.includeInAmbientLight ?? false}
              onChange={(v) => { setLocalActuator(s => ({ ...s, includeInAmbientLight: v })); setLocalDimmer(s => ({ ...s, includeInAmbientLight: v })); setLocalLed(s => ({ ...s, includeInAmbientLight: v })); }} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Dimmer Brightness Settings */}
        {showDimmer && (
          <SettingsGroup title="Helligkeit" disabled={!isEditing}>
            <SettingSlider label="Helligkeit tagsüber" value={localDimmer.dayBrightness ?? 100} min={0} max={100} unit="%"
              onChange={(v) => { setLocalDimmer(s => ({ ...s, dayBrightness: v })); setLocalLed(s => ({ ...s, dayBrightness: v })); }} disabled={!isEditing} />
            <SettingSlider label="Helligkeit morgens" value={localDimmer.dawnBrightness ?? 75} min={0} max={100} unit="%"
              onChange={(v) => { setLocalDimmer(s => ({ ...s, dawnBrightness: v })); setLocalLed(s => ({ ...s, dawnBrightness: v })); }} disabled={!isEditing} />
            <SettingSlider label="Helligkeit abends" value={localDimmer.duskBrightness ?? 75} min={0} max={100} unit="%"
              onChange={(v) => { setLocalDimmer(s => ({ ...s, duskBrightness: v })); setLocalLed(s => ({ ...s, duskBrightness: v })); }} disabled={!isEditing} />
            <SettingSlider label="Helligkeit nachts" value={localDimmer.nightBrightness ?? 50} min={0} max={100} unit="%"
              onChange={(v) => { setLocalDimmer(s => ({ ...s, nightBrightness: v })); setLocalLed(s => ({ ...s, nightBrightness: v })); }} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* LED Color Settings */}
        {showLed && (
          <SettingsGroup title="Farben" disabled={!isEditing}>
            <SettingColor label="Farbe tagsüber" value={localLed.dayColor ?? '#FFFFFF'}
              onChange={(v) => setLocalLed(s => ({ ...s, dayColor: v }))} disabled={!isEditing} />
            <SettingColor label="Farbe morgens" value={localLed.dawnColor ?? '#FBBC32'}
              onChange={(v) => setLocalLed(s => ({ ...s, dawnColor: v }))} disabled={!isEditing} />
            <SettingColor label="Farbe abends" value={localLed.duskColor ?? '#FBBC32'}
              onChange={(v) => setLocalLed(s => ({ ...s, duskColor: v }))} disabled={!isEditing} />
            <SettingColor label="Farbe nachts" value={localLed.nightColor ?? '#FF6B35'}
              onChange={(v) => setLocalLed(s => ({ ...s, nightColor: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Shutter Settings */}
        {showShutter && (
          <SettingsGroup title="Rolladen-Einstellungen" disabled={!isEditing}>
            <SettingSlider label="Fensterrichtung" value={localShutter.direction ?? 180} min={0} max={360} step={5} unit="°"
              onChange={(v) => setLocalShutter(s => ({ ...s, direction: v }))} disabled={!isEditing} />
            <SettingSlider label="Hitzeschutz-Position" value={localShutter.heatReductionPosition ?? 40} min={0} max={100} step={5} unit="%"
              onChange={(v) => setLocalShutter(s => ({ ...s, heatReductionPosition: v }))} disabled={!isEditing} />
            <SettingSlider label="Hitzeschutz-Schwelle (Richtung)" value={localShutter.heatReductionDirectionThreshold ?? 24} min={20} max={35} unit="°C"
              onChange={(v) => setLocalShutter(s => ({ ...s, heatReductionDirectionThreshold: v }))} disabled={!isEditing} />
            <SettingSlider label="Hitzeschutz-Schwelle (Global)" value={localShutter.heatReductionThreshold ?? 27} min={20} max={35} unit="°C"
              onChange={(v) => setLocalShutter(s => ({ ...s, heatReductionThreshold: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Heater Settings */}
        {showHeater && (
          <SettingsGroup title="Heizungs-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Manuell deaktiviert" checked={localHeater.manualDisabled ?? false}
              onChange={(v) => setLocalHeater(s => ({ ...s, manualDisabled: v }))} disabled={!isEditing} />
            <SettingToggle label="Automatik-Modus" checked={localHeater.automaticMode ?? true}
              onChange={(v) => setLocalHeater(s => ({ ...s, automaticMode: v }))} disabled={!isEditing} />
            <SettingToggle label="Eigene Temperatur verwenden" checked={localHeater.useOwnTemperatur ?? true}
              onChange={(v) => setLocalHeater(s => ({ ...s, useOwnTemperatur: v }))} disabled={!isEditing} />
            <SettingToggle label="Eigene Temp. für Raumtemperatur" checked={localHeater.useOwnTemperatureForRoomTemperature ?? false}
              onChange={(v) => setLocalHeater(s => ({ ...s, useOwnTemperatureForRoomTemperature: v }))} disabled={!isEditing} />
            <SettingToggle label="PID-Steuerung" checked={localHeater.controlByPid ?? false}
              onChange={(v) => setLocalHeater(s => ({ ...s, controlByPid: v }))} disabled={!isEditing} />
            <SettingToggle label="Steuerung per Temp.-Differenz" checked={localHeater.controlByTempDiff ?? false}
              onChange={(v) => setLocalHeater(s => ({ ...s, controlByTempDiff: v }))} disabled={!isEditing} />
            <SettingSlider label="PID Mindest-Ventilstellung" value={localHeater.pidForcedMinimum ?? 1} min={0} max={100} unit="%"
              onChange={(v) => setLocalHeater(s => ({ ...s, pidForcedMinimum: v }))} disabled={!isEditing} />
            <SettingToggle label="Saisonale Abschaltung" checked={localHeater.seasonalTurnOffActive ?? true}
              onChange={(v) => setLocalHeater(s => ({ ...s, seasonalTurnOffActive: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* AC Settings */}
        {showAc && (
          <SettingsGroup title="Klimaanlagen-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Manuell deaktiviert" checked={localAc.manualDisabled ?? false}
              onChange={(v) => setLocalAc(s => ({ ...s, manualDisabled: v }))} disabled={!isEditing} />
            <SettingToggle label="Heizen erlaubt" checked={localAc.heatingAllowed ?? true}
              onChange={(v) => setLocalAc(s => ({ ...s, heatingAllowed: v }))} disabled={!isEditing} />
            <SettingToggle label="Eigene Temperatur verwenden" checked={localAc.useOwnTemperature ?? false}
              onChange={(v) => setLocalAc(s => ({ ...s, useOwnTemperature: v }))} disabled={!isEditing} />
            <SettingToggle label="Automatik-Modus" checked={localAc.useAutomatic ?? false}
              onChange={(v) => setLocalAc(s => ({ ...s, useAutomatic: v }))} disabled={!isEditing} />
            <SettingToggle label="Kein Kühlen bei Bewegung" checked={localAc.noCoolingOnMovement ?? false}
              onChange={(v) => setLocalAc(s => ({ ...s, noCoolingOnMovement: v }))} disabled={!isEditing} />
            <SettingTimePicker label="Früheste Einschaltzeit" hours={localAc.minimumHours ?? 0} minutes={localAc.minimumMinutes ?? 0}
              onChange={(h, m) => setLocalAc(s => ({ ...s, minimumHours: h, minimumMinutes: m }))} disabled={!isEditing} />
            <SettingTimePicker label="Späteste Einschaltzeit" hours={localAc.maximumHours ?? 23} minutes={localAc.maximumMinutes ?? 59}
              onChange={(h, m) => setLocalAc(s => ({ ...s, maximumHours: h, maximumMinutes: m }))} disabled={!isEditing} />
            <SettingSlider label="Min. Außentemp. für Kühlung" value={localAc.minOutdoorTempForCooling ?? 20} min={16} max={25} step={0.5} unit="°C"
              onChange={(v) => setLocalAc(s => ({ ...s, minOutdoorTempForCooling: v }))} disabled={!isEditing} />
            <SettingSlider label="Kühlziel überschreiben (-1 = aus)" value={localAc.overrideCoolingTargetTemp ?? -1} min={-1} max={22} step={0.5} unit="°C"
              onChange={(v) => setLocalAc(s => ({ ...s, overrideCoolingTargetTemp: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Handle Settings */}
        {showHandle && (
          <SettingsGroup title="Fenstergriff-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Bei Öffnung informieren" checked={localHandle.informOnOpen ?? false}
              onChange={(v) => setLocalHandle(s => ({ ...s, informOnOpen: v }))} disabled={!isEditing} />
            <SettingToggle label="Informieren wenn nicht hilfreich" checked={localHandle.informNotHelping ?? false}
              onChange={(v) => setLocalHandle(s => ({ ...s, informNotHelping: v }))} disabled={!isEditing} />
            <SettingToggle label="Informieren wenn hilfreich" checked={localHandle.informIsHelping ?? false}
              onChange={(v) => setLocalHandle(s => ({ ...s, informIsHelping: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Camera Settings */}
        {showCamera && (
          <SettingsGroup title="Kamera-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Person per Telegram melden" checked={localCamera.alertPersonOnTelegram ?? false}
              onChange={(v) => setLocalCamera(s => ({ ...s, alertPersonOnTelegram: v }))} disabled={!isEditing} />
            <SettingToggle label="Nur Personen erkennen" checked={localCamera.movementDetectionOnPersonOnly ?? false}
              onChange={(v) => setLocalCamera(s => ({ ...s, movementDetectionOnPersonOnly: v }))} disabled={!isEditing} />
            <SettingToggle label="Auch Hunde erkennen" checked={localCamera.movementDetectionOnDogsToo ?? false}
              onChange={(v) => setLocalCamera(s => ({ ...s, movementDetectionOnDogsToo: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Motion Sensor Settings */}
        {showMotionSensor && (
          <SettingsGroup title="Bewegungsmelder-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Sieht Fenster" checked={localMotionSensor.seesWindow ?? true}
              onChange={(v) => setLocalMotionSensor(s => ({ ...s, seesWindow: v }))} disabled={!isEditing} />
            <SettingToggle label="Von Nachtalarm ausschließen" checked={localMotionSensor.excludeFromNightAlarm ?? false}
              onChange={(v) => setLocalMotionSensor(s => ({ ...s, excludeFromNightAlarm: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Scene Settings */}
        {showScene && (
          <SettingsGroup title="Szenen-Einstellungen" disabled={!isEditing}>
            <SettingSlider label="Standard-Ausschalt-Timeout" value={localScene.defaultTurnOffTimeout ?? 0} min={0} max={3600} step={60} unit="s"
              onChange={(v) => setLocalScene(s => ({ ...s, defaultTurnOffTimeout: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Speaker Settings */}
        {showSpeaker && (
          <SettingsGroup title="Lautsprecher-Einstellungen" disabled={!isEditing}>
            <SettingSlider label="Max. Lautstärke (Alle abspielen)" value={localSpeaker.maxPlayOnAllVolume ?? 80} min={0} max={100} unit="%"
              onChange={(v) => setLocalSpeaker(s => ({ ...s, maxPlayOnAllVolume: v }))} disabled={!isEditing} />
            <SettingSlider label="Standard-Lautstärke tagsüber" value={localSpeaker.defaultDayAnounceVolume ?? 80} min={0} max={100} unit="%"
              onChange={(v) => setLocalSpeaker(s => ({ ...s, defaultDayAnounceVolume: v }))} disabled={!isEditing} />
            <SettingSlider label="Standard-Lautstärke nachts" value={localSpeaker.defaultNightAnounceVolume ?? 40} min={0} max={100} unit="%"
              onChange={(v) => setLocalSpeaker(s => ({ ...s, defaultNightAnounceVolume: v }))} disabled={!isEditing} />
          </SettingsGroup>
        )}

        {/* Dachs Settings */}
        {showDachs && (
          <SettingsGroup title="Dachs-Einstellungen" disabled={!isEditing}>
            <SettingToggle label="Heizstab deaktivieren" checked={localDachs.disableHeatingRod ?? false}
              onChange={(v) => setLocalDachs(s => ({ ...s, disableHeatingRod: v }))} disabled={!isEditing} />
            <SettingToggle label="Dachs-eigene WW-Bereitung deaktivieren" checked={localDachs.disableDachsOwnWW ?? false}
              onChange={(v) => setLocalDachs(s => ({ ...s, disableDachsOwnWW: v }))} disabled={!isEditing} />
            <SettingToggle label="Dachs temporär deaktivieren" checked={localDachs.disableDachsTemporarily ?? false}
              onChange={(v) => setLocalDachs(s => ({ ...s, disableDachsTemporarily: v }))} disabled={!isEditing} />
            <SettingSlider label="Batterie-Einschaltschwelle" value={localDachs.batteryLevelTurnOnThreshold ?? 25} min={10} max={50} unit="%"
              onChange={(v) => setLocalDachs(s => ({ ...s, batteryLevelTurnOnThreshold: v }))} disabled={!isEditing} />
            <SettingSlider label="Batterie-Startschwelle erlaubt" value={localDachs.batteryLevelAllowStartThreshold ?? 50} min={10} max={50} unit="%"
              onChange={(v) => setLocalDachs(s => ({ ...s, batteryLevelAllowStartThreshold: v }))} disabled={!isEditing} />
            <SettingSlider label="Batterie-Startschwelle verhindert" value={localDachs.batteryLevelPreventStartThreshold ?? 90} min={40} max={90} unit="%"
              onChange={(v) => setLocalDachs(s => ({ ...s, batteryLevelPreventStartThreshold: v }))} disabled={!isEditing} />
            <SettingSlider label="Warmwasser Min-Temperatur" value={localDachs.warmWaterDesiredMinTemp ?? 55} min={40} max={65} step={0.5} unit="°C"
              onChange={(v) => setLocalDachs(s => ({ ...s, warmWaterDesiredMinTemp: v }))} disabled={!isEditing} />
            <SettingSlider label="Warmwasser Max-Temperatur" value={localDachs.warmWaterDesiredMaxTemp ?? 67} min={45} max={80} step={0.5} unit="°C"
              onChange={(v) => setLocalDachs(s => ({ ...s, warmWaterDesiredMaxTemp: v }))} disabled={!isEditing} />
            <SettingSlider label="Pufferspeicher Max-Starttemperatur" value={localDachs.heatStorageMaxStartTemp ?? 70} min={55} max={80} step={0.5} unit="°C"
              onChange={(v) => setLocalDachs(s => ({ ...s, heatStorageMaxStartTemp: v }))} disabled={!isEditing} />
          </SettingsGroup>
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
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>{label}</span>
        <span className="font-medium">{value}{unit}</span>
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

interface SettingColorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SettingColor({ label, value, onChange, disabled }: SettingColorProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent"
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
