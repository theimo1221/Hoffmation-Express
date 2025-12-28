import { useState, useEffect } from 'react';
import { type Device, getDeviceRoom, useDataStore, getCapabilityNames } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { 
  Star, ArrowLeft, Lightbulb, Blinds, Thermometer, Zap, 
  Power, Snowflake, Flame, Activity, Speaker, Play, 
  Square, Clock, Droplets, Eye, DoorOpen, Camera, Battery
} from 'lucide-react';
import { 
  setLamp, setShutter, setDimmer, setLed, setActuator, setAc,
  startScene, endScene, speakOnDevice, blockAutomatic, liftAutomaticBlock,
  getTemperatureHistory, type TemperatureHistoryEntry
} from '@/api/devices';
import { DeviceSettingsSection } from '@/components/DeviceSettingsSection';

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
  const [forceDuration, setForceDuration] = useState(60); // minutes
  const [tempHistory, setTempHistory] = useState<TemperatureHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Get live device from store (updates when store changes)
  const device = initialDevice.id ? (devices[initialDevice.id] ?? initialDevice) : initialDevice;

  const info = device.info ?? device._info;
  const name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = getDeviceRoom(device);
  const capabilities = device.deviceCapabilities ?? [];
  
  // Capability constants (from hoffmation-base DeviceCapability enum)
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
  // automaticBlockedUntil can be a Date object or timestamp, and may be in different paths
  const getBlockedUntil = (): number => {
    const handler = device.blockAutomationHandler ?? (device as Record<string, unknown>)._blockAutomationHandler as typeof device.blockAutomationHandler;
    const value = handler?.automaticBlockedUntil ?? (handler as Record<string, unknown>)?._automaticBlockedUntil;
    if (!value) return 0;
    // Handle Date object or timestamp
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    if (typeof value === 'number') return value;
    return 0;
  };
  const automaticBlockedUntil = getBlockedUntil();
  const cameraImageLink = device.currentImageLink;

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

  const handleToggleLamp = async () => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setLamp(device.id, !isOn);
      // Wait for backend to process, then refresh single device
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
      // Wait for backend to process, then refresh single device
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
      // Use current color and full brightness for force on, 0 for force off
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

  const handleAc = async (power: boolean, mode?: number, temp?: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setAc(device.id, power, mode, temp);
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

  // Local state for controls
  const [desiredBrightness, setDesiredBrightness] = useState(brightness);
  const [desiredColor, setDesiredColor] = useState(device._color ?? '#FFFFFF');
  const [desiredShutterPos, setDesiredShutterPos] = useState(Math.round(currentLevel >= 0 ? currentLevel : 0));
  const [speakMessage, setSpeakMessage] = useState('');
  const [sceneTimeout, setSceneTimeout] = useState(0);
  const [blockHours, setBlockHours] = useState(1);
  const [blockUntilDate, setBlockUntilDate] = useState('');


  // Handle position names
  const handlePositionNames: Record<number, string> = {
    0: 'Geschlossen', 1: 'Gekippt', 2: 'Offen', [-1]: 'Unbekannt'
  };

  // Format time since last motion
  const formatTimeSinceMotion = (seconds: number): string => {
    if (seconds === -1) return '--';
    if (seconds === 0) return 'Aktiv';
    if (seconds >= 1800) return '>30 min';
    return `${(seconds / 60).toFixed(1)} min`;
  };

  // Format blocked until date
  const formatBlockedUntil = (timestamp: number): string => {
    if (!timestamp || timestamp <= 0) return 'Nicht blockiert';
    if (timestamp <= Date.now()) return 'Abgelaufen';
    return new Date(timestamp).toLocaleString('de-DE');
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">{room}</p>
          </div>
        </div>
        <button
          onClick={toggleFavorite}
          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-soft transition-all active:scale-95 ${
            isFavorite ? 'bg-yellow-500 text-white' : 'bg-card hover:bg-accent'
          }`}
        >
          <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <div className="space-y-6">
          {/* Lamp Controls */}
          {hasLamp && (
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

                {/* Force Duration Slider */}
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

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleForceLamp(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force An
                  </button>
                  <button
                    onClick={() => handleForceLamp(false)}
                    disabled={isLoading}
                    className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force Aus
                  </button>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={handleToggleLamp}
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
          )}

          {/* Shutter Controls */}
          {hasShutter && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Blinds className="h-4 w-4" />
                Rolladen
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSetShutter(0)}
                    disabled={isLoading}
                    className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
                  >
                    Zu
                  </button>
                  <button
                    onClick={() => handleSetShutter(50)}
                    disabled={isLoading}
                    className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handleSetShutter(100)}
                    disabled={isLoading}
                    className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
                  >
                    Auf
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Temperature Display */}
          {hasTemp && temp !== undefined && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperatur
              </h2>
              <div className="rounded-2xl bg-card p-6 shadow-soft space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-6">
                    <div>
                      <span className="text-4xl font-bold">
                        {temp === -99 ? '—' : `${temp.toFixed(1)}°C`}
                      </span>
                      {temp === -99 && (
                        <p className="text-sm text-muted-foreground mt-1">Kein Messwert</p>
                      )}
                    </div>
                    {humidity >= 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Droplets className="h-5 w-5" />
                        <span className="text-2xl font-semibold">{humidity.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!showHistory && device.id) {
                      try {
                        const now = new Date();
                        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        const history = await getTemperatureHistory(device.id, dayAgo, now);
                        setTempHistory(history);
                      } catch (e) {
                        console.error('Failed to load temperature history:', e instanceof Error ? e.message : e);
                      }
                    }
                    setShowHistory(!showHistory);
                  }}
                  className="w-full rounded-xl bg-secondary py-2 text-sm font-medium transition-all hover:bg-accent"
                >
                  {showHistory ? 'Verlauf ausblenden' : 'Verlauf anzeigen (24h)'}
                </button>
                {showHistory && tempHistory.length > 0 && (
                  <div className="space-y-2">
                    <div className="h-32 relative">
                      <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                        {(() => {
                          // Filter out -99 values (no data)
                          const validHistory = tempHistory.filter(h => h.temperature !== -99);
                          if (validHistory.length === 0) return null;
                          const temps = validHistory.map(h => h.temperature);
                          const minT = Math.min(...temps) - 1;
                          const maxT = Math.max(...temps) + 1;
                          const range = maxT - minT || 1;
                          const points = validHistory.map((h, i) => {
                            const x = (i / (validHistory.length - 1)) * 100;
                            const y = 50 - ((h.temperature - minT) / range) * 50;
                            return `${x},${y}`;
                          }).join(' ');
                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                className="text-primary"
                                points={points}
                              />
                              <text x="2" y="8" className="text-[4px] fill-muted-foreground">{maxT.toFixed(1)}°</text>
                              <text x="2" y="48" className="text-[4px] fill-muted-foreground">{minT.toFixed(1)}°</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>vor 24h</span>
                      <span>jetzt</span>
                    </div>
                  </div>
                )}
                {showHistory && tempHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">Keine Verlaufsdaten verfügbar</p>
                )}
              </div>
            </section>
          )}

          {/* Dimmable Lamp Controls */}
          {hasDimmable && (
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
                    onClick={() => handleForceLamp(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force An
                  </button>
                  <button
                    onClick={() => handleForceLamp(false)}
                    disabled={isLoading}
                    className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force Aus
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* LED RGB Controls */}
          {hasLed && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                LED
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
                    <span className="text-muted-foreground">Farbe</span>
                  </div>
                  <input
                    type="color"
                    value={desiredColor}
                    onChange={(e) => setDesiredColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer"
                  />
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
                  onClick={() => handleLed(true, desiredBrightness, desiredColor)}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  Anwenden
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleForceLed(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force An
                  </button>
                  <button
                    onClick={() => handleForceLed(false)}
                    disabled={isLoading}
                    className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force Aus
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Actuator Controls */}
          {hasActuator && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Power className="h-4 w-4" />
                Aktor
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleActuator(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force An
                  </button>
                  <button
                    onClick={() => handleActuator(false)}
                    disabled={isLoading}
                    className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Force Aus
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* AC Controls */}
          {hasAc && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Snowflake className="h-4 w-4" />
                Klimaanlage
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isOn ? 'bg-blue-500/20 text-blue-600' : 'bg-gray-500/20 text-gray-600'
                  }`}>
                    {isOn ? 'An' : 'Aus'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modus</span>
                  <select
                    value={acMode}
                    onChange={(e) => handleAc(true, Number(e.target.value))}
                    disabled={isLoading}
                    className="rounded-lg bg-secondary px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value={0}>Auto</option>
                    <option value={1}>Kühlen</option>
                    <option value={2}>Entfeuchten</option>
                    <option value={3}>Lüften</option>
                    <option value={4}>Heizen</option>
                  </select>
                </div>
                {desiredTemp !== -99 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Zieltemperatur</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAc(true, undefined, Math.max(16, desiredTemp - 0.5))}
                        disabled={isLoading}
                        className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="font-medium w-14 text-center">{desiredTemp.toFixed(1)}°C</span>
                      <button
                        onClick={() => handleAc(true, undefined, Math.min(30, desiredTemp + 0.5))}
                        disabled={isLoading}
                        className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
                {roomTemp !== -99 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Raumtemperatur</span>
                    <span className="font-medium">{roomTemp.toFixed(1)}°C</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAc(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-blue-500/20 text-blue-600 py-3 font-medium transition-all hover:bg-blue-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Einschalten
                  </button>
                  <button
                    onClick={() => handleAc(false)}
                    disabled={isLoading}
                    className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Ausschalten
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Heater Controls */}
          {hasHeater && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Heizung
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
                {valveLevel >= 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ventilstellung</span>
                    <span className="font-medium">{valveLevel.toFixed(0)}%</span>
                  </div>
                )}
                {roomTemp !== -99 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Raumtemperatur</span>
                    <span className="font-medium">{roomTemp.toFixed(1)}°C</span>
                  </div>
                )}
                {desiredTemp !== -99 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Zieltemperatur</span>
                    <span className="font-medium">{desiredTemp.toFixed(1)}°C</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shutter with Slider */}
          {hasShutter && currentLevel >= 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Blinds className="h-4 w-4" />
                Position
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aktuelle Position</span>
                  <span className="font-medium">{currentLevel.toFixed(0)}%</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Gewünschte Position</span>
                    <span className="font-medium">{desiredShutterPos}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={desiredShutterPos}
                    onChange={(e) => setDesiredShutterPos(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <button
                  onClick={() => handleSetShutter(desiredShutterPos)}
                  disabled={isLoading}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  Anwenden
                </button>
              </div>
            </section>
          )}

          {/* Motion Sensor */}
          {hasMotion && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Bewegungsmelder
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bewegung erkannt</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    movementDetected ? 'bg-orange-500/20 text-orange-600' : 'bg-gray-500/20 text-gray-600'
                  }`}>
                    {movementDetected ? 'Ja' : 'Nein'}
                  </span>
                </div>
                {detectionsToday >= 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Erkennungen heute</span>
                    <span className="font-medium">{detectionsToday}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seit letzter Bewegung</span>
                  <span className="font-medium">{formatTimeSinceMotion(timeSinceLastMotion)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Handle Sensor */}
          {hasHandle && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <DoorOpen className="h-4 w-4" />
                Griffsensor
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    position === 0 ? 'bg-green-500/20 text-green-600' : 
                    position === 1 ? 'bg-yellow-500/20 text-yellow-600' : 
                    position === 2 ? 'bg-red-500/20 text-red-600' : 'bg-gray-500/20 text-gray-600'
                  }`}>
                    {handlePositionNames[position] ?? 'Unbekannt'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Humidity Sensor */}
          {hasHumidity && humidity >= 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Luftfeuchtigkeit
              </h2>
              <div className="rounded-2xl bg-card p-6 shadow-soft text-center">
                <span className="text-4xl font-bold">{humidity.toFixed(1)}%</span>
              </div>
            </section>
          )}

          {/* Speaker */}
          {hasSpeaker && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Speaker className="h-4 w-4" />
                Lautsprecher
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                <textarea
                  value={speakMessage}
                  onChange={(e) => setSpeakMessage(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  className="w-full rounded-xl bg-secondary p-3 text-sm resize-none h-20"
                />
                <button
                  onClick={() => {
                    handleSpeak(speakMessage);
                    setSpeakMessage('');
                  }}
                  disabled={isLoading || !speakMessage.trim()}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  Abspielen
                </button>
              </div>
            </section>
          )}

          {/* Scene */}
          {hasScene && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" />
                Szene
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isOn ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
                  }`}>
                    {isOn ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                {!isOn && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Auto-Aus Timeout</span>
                      <span className="font-medium">{sceneTimeout === 0 ? 'Standard' : `${sceneTimeout} min`}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="240"
                      step="5"
                      value={sceneTimeout}
                      onChange={(e) => setSceneTimeout(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                {isOn ? (
                  <button
                    onClick={() => handleScene(false)}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
                  >
                    <Square className="inline h-4 w-4 mr-2" />
                    Szene beenden
                  </button>
                ) : (
                  <button
                    onClick={() => handleScene(true, sceneTimeout > 0 ? sceneTimeout : undefined)}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                  >
                    <Play className="inline h-4 w-4 mr-2" />
                    Szene starten
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Camera */}
          {hasCamera && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Kamera
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                {cameraImageLink && (
                  <img 
                    src={cameraImageLink} 
                    alt="Kamerabild" 
                    className="w-full rounded-xl"
                  />
                )}
                {device.h264IosStreamLink && (
                  <a
                    href={device.h264IosStreamLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4" />
                    Live-Stream öffnen
                  </a>
                )}
                {device.mpegStreamLink && !device.h264IosStreamLink && (
                  <a
                    href={device.mpegStreamLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90"
                  >
                    <Play className="h-4 w-4" />
                    MPEG-Stream öffnen
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Block Automatic */}
          {hasBlockAutomatic && (
            <section>
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Automatik blockieren
              </h2>
              <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Blockiert bis</span>
                  <span className="font-medium">{formatBlockedUntil(automaticBlockedUntil)}</span>
                </div>
                
                {automaticBlockedUntil > Date.now() && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleLiftBlock}
                      disabled={isLoading}
                      className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
                    >
                      Aufheben
                    </button>
                    <button
                      onClick={() => handleBlockAutomatic(blockHours)}
                      disabled={isLoading}
                      className="rounded-xl bg-orange-500/20 text-orange-600 py-3 font-medium transition-all hover:bg-orange-500/30 active:scale-95 disabled:opacity-50"
                    >
                      +{blockHours}h verlängern
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Blockieren für</span>
                    <span className="font-medium">{blockHours} Stunden</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="48"
                    step="1"
                    value={blockHours}
                    onChange={(e) => setBlockHours(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1h</span>
                    <span>24h</span>
                    <span>48h</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Oder blockieren bis</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={blockUntilDate}
                    onChange={(e) => setBlockUntilDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {automaticBlockedUntil <= Date.now() && (
                  <button
                    onClick={() => handleBlockAutomatic(blockHours)}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-orange-500/20 text-orange-600 py-3 font-medium transition-all hover:bg-orange-500/30 active:scale-95 disabled:opacity-50"
                  >
                    Für {blockHours} Stunden blockieren
                  </button>
                )}

                {blockUntilDate && (
                  <button
                    onClick={() => {
                      const targetDate = new Date(blockUntilDate);
                      const now = new Date();
                      const diffSeconds = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
                      if (diffSeconds > 0 && device.id) {
                        setIsLoading(true);
                        blockAutomatic(device.id, diffSeconds)
                          .then(() => delay(300))
                          .then(() => { if (device.id) fetchDevice(device.id); })
                          .catch(e => console.error('Failed to block until date:', e instanceof Error ? e.message : e))
                          .finally(() => setIsLoading(false));
                      }
                    }}
                    disabled={isLoading || !blockUntilDate}
                    className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                  >
                    Bis {blockUntilDate ? new Date(blockUntilDate).toLocaleString('de-DE') : '...'} blockieren
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Energy Manager */}
          {hasEnergyManager && (
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
          )}

          {/* Battery */}
          {hasBattery && batteryLevel !== -99 && (
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
          )}

          {/* Device Settings */}
          <DeviceSettingsSection device={device} onUpdate={() => device.id && fetchDevice(device.id)} />

          {/* Device Info */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Info
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono">{device.id ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ</span>
                <span>{device.deviceType ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capabilities</span>
                <span className="text-right text-xs max-w-[200px]" title={getCapabilityNames(capabilities)}>
                  {capabilities.length > 0 ? `${capabilities.join(', ')} – ${getCapabilityNames(capabilities)}` : 'N/A'}
                </span>
              </div>
              {expertMode && (() => {
                // Check for position data - either device.position (Espresense) or settings.trilaterationRoomPosition
                const pos = (device as Record<string, unknown>).position as { x?: number; y?: number; z?: number; roomName?: string } | undefined;
                const trilaterationPos = (device.settings as Record<string, unknown> | undefined)?.trilaterationRoomPosition as { x?: number; y?: number; z?: number } | undefined;
                const displayPos = pos ?? trilaterationPos;
                if (!displayPos) return null;
                return (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position (X/Y/Z)</span>
                    <span className="font-mono text-xs">
                      {displayPos.x?.toFixed(2) ?? '?'} / {displayPos.y?.toFixed(2) ?? '?'} / {displayPos.z?.toFixed(2) ?? '?'}
                      {pos?.roomName && <span className="text-muted-foreground ml-1">({pos.roomName})</span>}
                    </span>
                  </div>
                );
              })()}
              {expertMode && (
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full mt-2 rounded-xl bg-secondary py-2 text-sm font-medium transition-all hover:bg-accent"
                >
                  {showRawJson ? 'Raw JSON ausblenden' : 'Raw JSON anzeigen'}
                </button>
              )}
              {showRawJson && (
                <div className="mt-2">
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(device, null, 2))}
                      className="text-xs text-primary hover:underline"
                    >
                      Kopieren
                    </button>
                  </div>
                  <pre className="bg-secondary rounded-xl p-3 text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                    {JSON.stringify(device, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
