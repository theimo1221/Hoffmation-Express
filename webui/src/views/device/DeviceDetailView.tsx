import { useState, useEffect } from 'react';
import { type Device, getDeviceRoom, useDataStore } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { 
  setLamp, setShutter, setDimmer, setLed, setActuator, setAc,
  startScene, endScene, speakOnDevice, blockAutomatic, liftAutomaticBlock,
  getTemperatureHistory, type TemperatureHistoryEntry
} from '@/api/devices';
import { DeviceSettingsSection } from '@/components/DeviceSettingsSection';
import { DeviceHeader } from './DeviceHeader';
import { DeviceInfo } from './DeviceInfo';
import {
  LampControls,
  DimmerControls,
  LedControls,
  ShutterQuickControls,
  ShutterPositionControls,
  ActuatorControls,
  TemperatureControls,
  AcControls,
  HeaterControls,
  HumiditySensorControls,
  MotionSensorControls,
  HandleSensorControls,
  SpeakerControls,
  SceneControls,
  CameraControls,
  BlockAutomaticControls,
  EnergyManagerControls,
  BatteryControls,
} from './controls';

function getFavoriteIds(): string[] {
  const stored = localStorage.getItem('hoffmation-favorites');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveFavoriteIds(ids: string[]): void {
  localStorage.setItem('hoffmation-favorites', JSON.stringify(ids));
}

interface DeviceDetailViewProps {
  device: Device;
  onBack: () => void;
}

export function DeviceDetailView({ device: initialDevice, onBack }: DeviceDetailViewProps) {
  const { devices, fetchDevice } = useDataStore();
  const { expertMode } = useSettingsStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceDuration, setForceDuration] = useState(60);
  const [tempHistory, setTempHistory] = useState<TemperatureHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Get live device from store
  const device = initialDevice.id ? (devices[initialDevice.id] ?? initialDevice) : initialDevice;

  const info = device.info ?? device._info;
  const name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = getDeviceRoom(device);
  const capabilities = device.deviceCapabilities ?? [];
  
  // Capability constants
  const CAP_AC = 0;
  const CAP_ACTUATOR = 1;
  const CAP_ENERGY_MANAGER = 3;
  const CAP_HEATER = 5;
  const CAP_HUMIDITY_SENSOR = 6;
  const CAP_LAMP = 8;
  const CAP_DIMMABLE = 9;
  const CAP_MOTION_SENSOR = 10;
  const CAP_SHUTTER = 11;
  const CAP_TEMP_SENSOR = 12;
  const CAP_SPEAKER = 14;
  const CAP_HANDLE_SENSOR = 15;
  const CAP_BATTERY = 16;
  const CAP_LED = 18;
  const CAP_SCENE = 103;
  const CAP_BLOCK_AUTOMATIC = 104;
  const CAP_CAMERA = 105;

  const hasLamp = capabilities.includes(CAP_LAMP) && !capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED);
  const hasDimmable = capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED);
  const hasLed = capabilities.includes(CAP_LED);
  const hasShutter = capabilities.includes(CAP_SHUTTER);
  const hasTemp = capabilities.includes(CAP_TEMP_SENSOR);
  const hasAc = capabilities.includes(CAP_AC);
  const hasHeater = capabilities.includes(CAP_HEATER);
  const hasActuator = capabilities.includes(CAP_ACTUATOR) && !capabilities.includes(CAP_LAMP);
  const hasMotion = capabilities.includes(CAP_MOTION_SENSOR);
  const hasHandle = capabilities.includes(CAP_HANDLE_SENSOR);
  const hasHumidity = capabilities.includes(CAP_HUMIDITY_SENSOR);
  const hasSpeaker = capabilities.includes(CAP_SPEAKER);
  const hasScene = capabilities.includes(CAP_SCENE);
  const hasCamera = capabilities.includes(CAP_CAMERA);
  const hasBlockAutomatic = capabilities.includes(CAP_BLOCK_AUTOMATIC);
  const hasEnergyManager = capabilities.includes(CAP_ENERGY_MANAGER);
  const hasBattery = capabilities.includes(CAP_BATTERY);
  
  // Device state values
  const isOn = device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  const brightness = device.brightness ?? device._brightness ?? 0;
  const humidity = device.humiditySensor?.humidity ?? device._humidity ?? -1;
  const position = device.position ?? device.handleSensor?.position ?? -1;
  const currentLevel = device._currentLevel ?? -1;
  const desiredTemp = device.desiredTemp ?? device._desiredTemperatur ?? -99;
  const roomTemp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature ?? -99;
  const valveLevel = (device._level ?? -0.01) * 100;
  const acMode = device._mode ?? 0;
  const movementDetected = device.movementDetected ?? device._movementDetected ?? false;
  const detectionsToday = device._detectionsToday ?? device.detectionsToday ?? -1;
  const timeSinceLastMotion = device._timeSinceLastMotion ?? -1;
  const batteryLevel = device.battery?.level ?? device.batteryLevel ?? -99;
  const excessEnergy = device.excessEnergy ?? -99;
  const selfConsumingWattage = device.selfConsumingWattage ?? -99;
  
  const getBlockedUntil = (): number => {
    const handler = device.blockAutomationHandler ?? (device as Record<string, unknown>)._blockAutomationHandler as typeof device.blockAutomationHandler;
    const value = handler?.automaticBlockedUntil ?? (handler as Record<string, unknown>)?._automaticBlockedUntil;
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    if (typeof value === 'number') return value;
    return 0;
  };
  const automaticBlockedUntil = getBlockedUntil();
  const cameraImageLink = device.currentImageLink;

  // Local state for controls
  const [desiredBrightness, setDesiredBrightness] = useState(brightness);
  const [desiredColor, setDesiredColor] = useState(device._color ?? '#FFFFFF');
  const [desiredShutterPos, setDesiredShutterPos] = useState(Math.round(currentLevel >= 0 ? currentLevel : 0));
  const [speakMessage, setSpeakMessage] = useState('');
  const [sceneTimeout, setSceneTimeout] = useState(0);
  const [blockHours, setBlockHours] = useState(1);
  const [blockUntilDate, setBlockUntilDate] = useState('');

  useEffect(() => {
    if (device.id) {
      const favorites = getFavoriteIds();
      setIsFavorite(favorites.includes(device.id));
    }
  }, [device.id]);

  const toggleFavorite = () => {
    if (!device.id) return;
    const favorites = getFavoriteIds();
    if (isFavorite) {
      const newFavorites = favorites.filter((id) => id !== device.id);
      saveFavoriteIds(newFavorites);
      setIsFavorite(false);
    } else {
      favorites.push(device.id);
      saveFavoriteIds(favorites);
      setIsFavorite(true);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Handler functions
  const handleToggleLamp = async () => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setLamp(device.id, !isOn);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to toggle lamp:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleSetShutter = async (level: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setShutter(device.id, level);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to set shutter:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleForceLamp = async (state: boolean) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      const durationMs = forceDuration === 0 ? -1 : forceDuration * 60 * 1000;
      await setLamp(device.id, state, durationMs);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to force lamp:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleDimmer = async (state: boolean, bright: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      const durationMs = forceDuration === 0 ? -1 : forceDuration * 60 * 1000;
      await setDimmer(device.id, state, bright, durationMs);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to set dimmer:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleLed = async (state: boolean, bright: number, color: string) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      const durationMs = forceDuration === 0 ? -1 : forceDuration * 60 * 1000;
      await setLed(device.id, state, bright, color, durationMs);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to set LED:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleForceLed = async (state: boolean) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      const durationMs = forceDuration === 0 ? -1 : forceDuration * 60 * 1000;
      await setLed(device.id, state, state ? 100 : 0, desiredColor, durationMs);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to force LED:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleActuator = async (state: boolean) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      const durationMs = forceDuration === 0 ? -1 : forceDuration * 60 * 1000;
      await setActuator(device.id, state, durationMs);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to set actuator:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleAc = async (power: boolean, mode?: number, tempVal?: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setAc(device.id, power, mode, tempVal);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to control AC:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleScene = async (start: boolean, timeout?: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      if (start) {
        await startScene(device.id, timeout);
      } else {
        await endScene(device.id);
      }
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to control scene:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleSpeak = async (message: string) => {
    if (!device.id || !message.trim()) return;
    setIsLoading(true);
    try {
      await speakOnDevice(device.id, message);
    } catch (e) {
      console.error('Failed to speak:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleBlockAutomatic = async (hours: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await blockAutomatic(device.id, hours * 3600);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to block automatic:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleLiftBlock = async () => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await liftAutomaticBlock(device.id);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to lift block:', e instanceof Error ? e.message : e);
    }
    setIsLoading(false);
  };

  const handleBlockUntilDate = async (dateStr: string) => {
    if (!device.id) return;
    const targetDate = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
    if (diffSeconds > 0) {
      setIsLoading(true);
      try {
        await blockAutomatic(device.id, diffSeconds);
        await delay(300);
        await fetchDevice(device.id);
      } catch (e) {
        console.error('Failed to block until date:', e instanceof Error ? e.message : e);
      }
      setIsLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!device.id) return;
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const history = await getTemperatureHistory(device.id, dayAgo, now);
      setTempHistory(history);
    } catch (e) {
      console.error('Failed to load temperature history:', e instanceof Error ? e.message : e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <DeviceHeader
        name={name}
        room={room}
        isFavorite={isFavorite}
        onBack={onBack}
        onToggleFavorite={toggleFavorite}
      />

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column: Device Controls */}
            <div className="lg:col-span-2 space-y-6">
              {hasLamp && (
                <LampControls
                  isOn={isOn}
                  isLoading={isLoading}
                  forceDuration={forceDuration}
                  setForceDuration={setForceDuration}
                  onToggle={handleToggleLamp}
                  onForce={handleForceLamp}
                />
              )}

              {hasShutter && (
                <ShutterQuickControls
                  isLoading={isLoading}
                  onSetShutter={handleSetShutter}
                />
              )}

              {hasTemp && temp !== undefined && (
                <TemperatureControls
                  temperature={temp}
                  humidity={humidity}
                  showHistory={showHistory}
                  setShowHistory={setShowHistory}
                  tempHistory={tempHistory}
                  onLoadHistory={handleLoadHistory}
                />
              )}

              {hasDimmable && (
                <DimmerControls
                  isOn={isOn}
                  isLoading={isLoading}
                  brightness={brightness}
                  desiredBrightness={desiredBrightness}
                  setDesiredBrightness={setDesiredBrightness}
                  forceDuration={forceDuration}
                  setForceDuration={setForceDuration}
                  onDimmer={handleDimmer}
                  onForce={handleForceLamp}
                />
              )}

              {hasLed && (
                <LedControls
                  isOn={isOn}
                  isLoading={isLoading}
                  brightness={brightness}
                  desiredBrightness={desiredBrightness}
                  setDesiredBrightness={setDesiredBrightness}
                  desiredColor={desiredColor}
                  setDesiredColor={setDesiredColor}
                  forceDuration={forceDuration}
                  setForceDuration={setForceDuration}
                  onLed={handleLed}
                  onForceLed={handleForceLed}
                />
              )}

              {hasActuator && (
                <ActuatorControls
                  isOn={isOn}
                  isLoading={isLoading}
                  forceDuration={forceDuration}
                  setForceDuration={setForceDuration}
                  onActuator={handleActuator}
                />
              )}

              {hasAc && (
                <AcControls
                  isOn={isOn}
                  isLoading={isLoading}
                  acMode={acMode}
                  desiredTemp={desiredTemp}
                  roomTemp={roomTemp}
                  onAc={handleAc}
                />
              )}

              {hasHeater && (
                <HeaterControls
                  valveLevel={valveLevel}
                  roomTemp={roomTemp}
                  desiredTemp={desiredTemp}
                />
              )}

              {hasShutter && currentLevel >= 0 && (
                <ShutterPositionControls
                  isLoading={isLoading}
                  currentLevel={currentLevel}
                  desiredPosition={desiredShutterPos}
                  setDesiredPosition={setDesiredShutterPos}
                  onSetShutter={handleSetShutter}
                />
              )}

              {hasMotion && (
                <MotionSensorControls
                  movementDetected={movementDetected}
                  detectionsToday={detectionsToday}
                  timeSinceLastMotion={timeSinceLastMotion}
                />
              )}

              {hasHandle && (
                <HandleSensorControls position={position} />
              )}

              {hasHumidity && humidity >= 0 && (
                <HumiditySensorControls humidity={humidity} />
              )}

              {hasSpeaker && (
                <SpeakerControls
                  isLoading={isLoading}
                  speakMessage={speakMessage}
                  setSpeakMessage={setSpeakMessage}
                  onSpeak={handleSpeak}
                />
              )}

              {hasScene && (
                <SceneControls
                  isOn={isOn}
                  isLoading={isLoading}
                  sceneTimeout={sceneTimeout}
                  setSceneTimeout={setSceneTimeout}
                  onScene={handleScene}
                />
              )}

              {hasCamera && (
                <CameraControls
                  cameraImageLink={cameraImageLink}
                  h264StreamLink={device.h264IosStreamLink}
                  mpegStreamLink={device.mpegStreamLink}
                />
              )}

              {hasBlockAutomatic && (
                <BlockAutomaticControls
                  isLoading={isLoading}
                  automaticBlockedUntil={automaticBlockedUntil}
                  blockHours={blockHours}
                  setBlockHours={setBlockHours}
                  blockUntilDate={blockUntilDate}
                  setBlockUntilDate={setBlockUntilDate}
                  onBlockAutomatic={handleBlockAutomatic}
                  onLiftBlock={handleLiftBlock}
                  onBlockUntilDate={handleBlockUntilDate}
                />
              )}

              {hasEnergyManager && (
                <EnergyManagerControls
                  batteryLevel={batteryLevel}
                  excessEnergy={excessEnergy}
                  selfConsumingWattage={selfConsumingWattage}
                />
              )}

              {hasBattery && batteryLevel !== -99 && (
                <BatteryControls batteryLevel={batteryLevel} />
              )}
            </div>

            {/* Right column: Device Settings */}
            <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start space-y-6">
              <DeviceSettingsSection device={device} onUpdate={() => device.id && fetchDevice(device.id)} />

              <DeviceInfo
                device={device}
                expertMode={expertMode}
                showRawJson={showRawJson}
                setShowRawJson={setShowRawJson}
                capabilities={capabilities}
                hasTemp={hasTemp}
                hasHumidity={hasHumidity}
                hasHeater={hasHeater}
                hasMotion={hasMotion}
                hasHandle={hasHandle}
                hasLamp={hasLamp}
                hasDimmable={hasDimmable}
                hasLed={hasLed}
                hasActuator={hasActuator}
                hasShutter={hasShutter}
                hasBattery={hasBattery}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
