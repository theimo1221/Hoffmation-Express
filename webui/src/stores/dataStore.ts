import { create } from 'zustand';
import { getRooms } from '@/api/rooms';
import { getDevices, getDevice } from '@/api/devices';

export interface TrilaterationPoint {
  x: number;
  y: number;
  z: number;
  roomName?: string;
}

export interface RoomInfo {
  roomName: string;
  etage?: number;
}

export enum GroupType {
  WindowGroup = 0,
  Window = 1,
  Presence = 2,
  Light = 3,
  Buttons = 4,
  Speaker = 5,
  Smoke = 6,
  Water = 7,
  Heating = 8,
  Ac = 9,
}

export interface GroupData {
  id: string;
  roomName: string;
  type: GroupType;
  settings?: unknown;
  _deviceCluster?: unknown;
}

export interface Room {
  id?: string;
  roomName?: string;
  customName?: string;
  etage?: number;
  info?: RoomInfo;
  groupdict?: Record<string, GroupData>;
  startPoint?: TrilaterationPoint;
  endPoint?: TrilaterationPoint;
  settings?: RoomSettings;
}

export function getRoomName(room: Room): string {
  return room.customName || room.info?.roomName || room.roomName || 'Unbekannt';
}

export function getRoomEtage(room: Room): number {
  return room.info?.etage ?? room.etage ?? 99;
}

export function hasGroup(room: Room, groupType: GroupType): boolean {
  if (!room.groupdict) return false;
  return Object.keys(room.groupdict).includes(String(groupType));
}

export function getGroup(room: Room, groupType: GroupType): GroupData | undefined {
  if (!room.groupdict) return undefined;
  return room.groupdict[String(groupType)];
}

export interface TemperatureSensor {
  roomTemperature?: number;
  temperature?: number;
  _temperature?: number;
}

export interface HumiditySensor {
  humidity?: number;
}

export interface HandleSensor {
  position?: number;
}

export interface Battery {
  level?: number;
}

export interface BlockAutomationHandler {
  automaticBlockedUntil?: number;
}

export interface ActuatorSettings {
  dawnOn?: boolean;
  duskOn?: boolean;
  nightOn?: boolean;
  dayOn?: boolean;
  includeInAmbientLight?: boolean;
  isStromStoss?: boolean;
  resetToAutomaticOnForceOffAfterForceOn?: boolean;
  stromStossResendTime?: number;
}

export interface DimmerSettings extends ActuatorSettings {
  nightBrightness?: number;
  dawnBrightness?: number;
  duskBrightness?: number;
  dayBrightness?: number;
  turnOnThreshhold?: number;
}

export interface LedSettings extends DimmerSettings {
  defaultColor?: string;
  dayColor?: string;
  dawnColor?: string;
  duskColor?: string;
  nightColor?: string;
  dayColorTemp?: number;
  dawnColorTemp?: number;
  duskColorTemp?: number;
  nightColorTemp?: number;
}

export interface ShutterSettings {
  direction?: number;
  heatReductionPosition?: number;
  heatReductionThreshold?: number;
  heatReductionDirectionThreshold?: number;
  msTilTop?: number;
  msTilBot?: number;
  triggerPositionUpdateByTime?: boolean;
}

export interface HeaterSettings {
  automaticMode?: boolean;
  useOwnTemperatur?: boolean;
  useOwnTemperatureForRoomTemperature?: boolean;
  controlByPid?: boolean;
  controlByTempDiff?: boolean;
  seasonalTurnOffActive?: boolean;
  seasonTurnOffDay?: number;
  seasonTurnOnDay?: number;
  pidForcedMinimum?: number;
  manualDisabled?: boolean;
}

export interface AcSettings {
  minimumHours?: number;
  minimumMinutes?: number;
  maximumHours?: number;
  maximumMinutes?: number;
  heatingAllowed?: boolean;
  useOwnTemperature?: boolean;
  useAutomatic?: boolean;
  noCoolingOnMovement?: boolean;
  manualDisabled?: boolean;
  minOutdoorTempForCooling?: number;
  overrideCoolingTargetTemp?: number;
}

export interface HandleSettings {
  informOnOpen?: boolean;
  informNotHelping?: boolean;
  informIsHelping?: boolean;
}

export interface CameraSettings {
  alertPersonOnTelegram?: boolean;
  movementDetectionOnPersonOnly?: boolean;
  movementDetectionOnDogsToo?: boolean;
  hasAudio?: boolean;
  hasSpeaker?: boolean;
}

export interface MotionSensorSettings {
  seesWindow?: boolean;
  excludeFromNightAlarm?: boolean;
}

export interface SceneSettings {
  defaultTurnOffTimeout?: number;
}

export interface SpeakerSettings {
  maxPlayOnAllVolume?: number;
  defaultDayAnounceVolume?: number;
  defaultNightAnounceVolume?: number;
}

export interface DachsSettings extends ActuatorSettings {
  refreshIntervalTime?: number;
  disableHeatingRod?: boolean;
  disableDachsOwnWW?: boolean;
  disableDachsTemporarily?: boolean;
  batteryLevelTurnOnThreshold?: number;
  batteryLevelBeforeNightTurnOnThreshold?: number;
  batteryLevelAllowStartThreshold?: number;
  batteryLevelPreventStartThreshold?: number;
  batteryLevelPreventStartAtNightThreshold?: number;
  batteryLevelHeatingRodThreshold?: number;
  warmWaterDesiredMinTemp?: number;
  warmWaterDesiredMaxTemp?: number;
  heatStorageMaxStartTemp?: number;
  winterMinimumHeatStorageTemp?: number;
  winterMinimumPreNightHeatStorageTemp?: number;
}

export interface TimePair {
  hours?: number;
  minutes?: number;
}

export interface RoomSettings {
  ambientLightAfterSunset?: boolean;
  lichtSonnenAufgangAus?: boolean;
  rolloHeatReduction?: boolean;
  lampenBeiBewegung?: boolean;
  lightIfNoWindows?: boolean;
  movementResetTimer?: number;
  roomIsAlwaysDark?: boolean;
  sonnenAufgangRollos?: boolean;
  sonnenAufgangRolloDelay?: number;
  sonnenAufgangRolloMinTime?: TimePair;
  sonnenAufgangLampenDelay?: number;
  sonnenUntergangRollos?: boolean;
  sonnenUntergangRolloDelay?: number;
  sonnenUntergangRolloMaxTime?: TimePair;
  sonnenUntergangLampenDelay?: number;
  sonnenUntergangRolloAdditionalOffsetPerCloudiness?: number;
  includeLampsInNormalMovementLightning?: boolean;
  radioUrl?: string;
  // Trilateration coordinates
  trilaterationStartPoint?: { x: number; y: number; z: number };
  trilaterationEndPoint?: { x: number; y: number; z: number };
}

export interface DeviceSettings {
  actuatorSettings?: ActuatorSettings;
  dimmerSettings?: DimmerSettings;
  ledSettings?: LedSettings;
  shutterSettings?: ShutterSettings;
  heaterSettings?: HeaterSettings;
  acSettings?: AcSettings;
  handleSettings?: HandleSettings;
  cameraSettings?: CameraSettings;
  motionSensorSettings?: MotionSensorSettings;
  sceneSettings?: SceneSettings;
  speakerSettings?: SpeakerSettings;
  dachsSettings?: DachsSettings;
  // Trilateration position in room
  trilaterationRoomPosition?: { x: number; y: number; z: number };
}

export interface DeviceInfo {
  fullName?: string;
  fullID?: string;
  allDevicesKey?: string;
  room?: string;
  customName?: string;
  _customName?: string;
}

export interface Device {
  id?: string;
  deviceType?: number;
  deviceCapabilities?: number[];
  info?: DeviceInfo;
  _info?: DeviceInfo;
  lightOn?: boolean;
  _lightOn?: boolean;
  actuatorOn?: boolean;
  _actuatorOn?: boolean;
  on?: boolean;
  _on?: boolean;
  temperatureSensor?: TemperatureSensor;
  _roomTemperature?: number;
  // Dimmable/LED
  brightness?: number;
  _brightness?: number;
  _color?: string;
  // Humidity
  humiditySensor?: HumiditySensor;
  _humidity?: number;
  // Handle/Window
  handleSensor?: HandleSensor;
  position?: number;
  // Shutter
  _currentLevel?: number;
  // Heater
  _level?: number;
  desiredTemp?: number;
  _desiredTemperatur?: number;
  // AC
  _mode?: number;
  // Motion
  movementDetected?: boolean;
  _movementDetected?: boolean;
  _detectionsToday?: number;
  detectionsToday?: number;
  _timeSinceLastMotion?: number;
  // Battery
  battery?: Battery;
  batteryLevel?: number;
  // Energy Manager
  excessEnergy?: number;
  selfConsumingWattage?: number;
  // Block Automatic
  blockAutomationHandler?: BlockAutomationHandler;
  // Camera
  currentImageLink?: string;
  h264IosStreamLink?: string;
  mpegStreamLink?: string;
  // Settings
  settings?: DeviceSettings;
  // Last Update
  lastUpdate?: string;
  _lastUpdate?: string;
  // Zigbee
  linkQuality?: number;
  _linkQuality?: number;
  available?: boolean;
  _available?: boolean;
  // Trilateration Position (from settings.trilaterationRoomPosition)
  trilaterationRoomPosition?: { x: number; y: number; z: number };
  _trilaterationRoomPosition?: { x: number; y: number; z: number };
}

export function getDeviceRoom(device: Device): string {
  return device.info?.room || device._info?.room || '';
}

export function getDeviceName(device: Device, stripRoomPrefix?: string): string {
  const info = device.info ?? device._info;
  let name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  
  // Optionally strip room/floor prefix from name for cleaner display in room context
  if (stripRoomPrefix) {
    // Normalize both strings for comparison (handle umlauts: ü/ue, ö/oe, ä/ae)
    const roomVariants = getRoomNameVariants(stripRoomPrefix);
    
    // Try to find and remove room name anywhere in the device name
    // Common patterns: "1. OG Buero Rollo", "EG Bad Licht", "Buero Steckdose", "Sonos Büro"
    for (const roomVariant of roomVariants) {
      const patterns = [
        // Room name anywhere in string with space after (e.g., "Sonos Büro" -> "Sonos")
        new RegExp(`\\s+${escapeRegex(roomVariant)}\\s*$`, 'i'),
        // Floor + room pattern at start (e.g., "1. OG Buero Rollo" -> "Rollo")
        new RegExp(`^.*?${escapeRegex(roomVariant)}\\s+`, 'i'),
        // Room name at start (e.g., "Buero Steckdose" -> "Steckdose")
        new RegExp(`^${escapeRegex(roomVariant)}\\s*[-:]?\\s*`, 'i'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          name = name.replace(pattern, '').trim();
          break;
        }
      }
      
      // If name changed, stop trying variants
      if (name !== (info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt')) {
        break;
      }
    }
    
    // Capitalize first letter if needed
    if (name.length > 0 && name[0] === name[0].toLowerCase()) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  
  return name || 'Gerät';
}

function getRoomNameVariants(roomName: string): string[] {
  const variants = new Set<string>();
  const lower = roomName.toLowerCase();
  
  // Add original
  variants.add(lower);
  
  // Add umlaut variants (both directions)
  const umlautMap: Record<string, string> = {
    'ü': 'ue', 'ue': 'ü',
    'ö': 'oe', 'oe': 'ö',
    'ä': 'ae', 'ae': 'ä',
    'ß': 'ss', 'ss': 'ß',
  };
  
  let variant = lower;
  for (const [from, to] of Object.entries(umlautMap)) {
    if (variant.includes(from)) {
      variant = variant.replace(new RegExp(from, 'g'), to);
      variants.add(variant);
    }
  }
  
  // Also try the reverse direction
  variant = lower;
  for (const [to, from] of Object.entries(umlautMap)) {
    if (variant.includes(from)) {
      variant = variant.replace(new RegExp(escapeRegex(from), 'g'), to);
      variants.add(variant);
    }
  }
  
  return Array.from(variants);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if device is on (actuator state) - matches Swift Device.actuatorOn logic
 * Order: actuatorOn → _actuatorOn → lightOn → _lightOn → on → false
 */
export function isDeviceOn(device: Device): boolean {
  return device.actuatorOn ?? device._actuatorOn ?? device.lightOn ?? device._lightOn ?? device.on ?? false;
}

/**
 * Get device brightness (0-100) - matches Swift Device.brightness logic
 */
export function getDeviceBrightness(device: Device): number {
  return device.brightness ?? device._brightness ?? 0;
}

/**
 * Get shutter level (0-100) - matches Swift Device.currentLevel logic
 * Returns -1 if not available
 */
export function getDeviceShutterLevel(device: Device): number {
  return device._currentLevel ?? -1;
}

/**
 * Get heater valve level (0-100) - matches Swift Device.valveLevel logic
 * Returns -1 if not available
 */
export function getDeviceValveLevel(device: Device): number {
  const level = device._level;
  if (level === undefined) return -1;
  return level * 100;
}

/**
 * Get desired temperature - matches Swift Device.desiredTemp logic
 */
export function getDeviceDesiredTemp(device: Device): number | undefined {
  const temp = device.desiredTemp ?? device._desiredTemperatur;
  return temp === -99 ? undefined : temp;
}

/**
 * Get humidity - matches Swift Device.humidity logic
 */
export function getDeviceHumidity(device: Device): number | undefined {
  const humidity = device.humiditySensor?.humidity ?? device._humidity;
  return humidity === -1 ? undefined : humidity;
}

/**
 * Get handle/window position - matches Swift Device.position logic
 * 0 = closed, 1 = tilted, 2 = open
 */
export function getDeviceHandlePosition(device: Device): number {
  return device.position ?? device.handleSensor?.position ?? -1;
}

/**
 * Check if motion detected - matches Swift Device.movementDetected logic
 */
export function isMotionDetected(device: Device): boolean {
  return device.movementDetected ?? device._movementDetected ?? false;
}

/**
 * Get motion detections today - matches Swift Device.detectionsToday logic
 */
export function getDeviceDetectionsToday(device: Device): number {
  return device._detectionsToday ?? device.detectionsToday ?? -1;
}

/**
 * Get link quality (0-255) - matches Swift Device.linkQuality logic
 */
export function getDeviceLinkQuality(device: Device): number | undefined {
  return device.linkQuality ?? device._linkQuality;
}

/**
 * Check if device is available - matches Swift Device.available logic
 */
export function isDeviceAvailable(device: Device): boolean | undefined {
  return device.available ?? device._available;
}

/**
 * Get battery level - matches Swift Device.battery logic
 */
export function getDeviceBattery(device: Device): number | undefined {
  const level = device.battery?.level ?? device.batteryLevel;
  return level === -99 ? undefined : level;
}

/**
 * Get automatic blocked until timestamp - matches Swift Device.automaticBlocked logic
 */
export function getAutomaticBlockedUntil(device: Device): Date | undefined {
  const ms = device.blockAutomationHandler?.automaticBlockedUntil;
  if (!ms || ms === 0) return undefined;
  return new Date(ms);
}

export function getDeviceTemperature(device: Device): number | undefined {
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  // -99 means no data
  return temp === -99 ? undefined : temp;
}

export function hasCapability(device: Device, capability: number): boolean {
  return device.deviceCapabilities?.includes(capability) ?? false;
}

/**
 * Device Type Checker Functions
 * Centralized capability checks to avoid duplication across views
 */

export function isLampDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.lamp) || 
         hasCapability(device, DeviceCapability.dimmableLamp) || 
         hasCapability(device, DeviceCapability.ledLamp);
}

export function isActuatorDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.actuator);
}

export function isShutterDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.shutter);
}

export function isSceneDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.scene);
}

export function isAcDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.ac);
}

export function isHeaterDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.heater);
}

export function isMotionSensorDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.motionSensor);
}

export function isHandleSensorDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.handleSensor);
}

export function isTempSensorDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.temperatureSensor);
}

export function isHumiditySensorDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.humiditySensor);
}

export function isSpeakerDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.speaker);
}

export function isCameraDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.camera);
}

export function isButtonSwitchDevice(device: Device): boolean {
  return hasCapability(device, DeviceCapability.buttonSwitch);
}

/**
 * Additional Device State Getter Functions
 */

export function getDeviceColor(device: Device): string | undefined {
  return device._color;
}

export function isAcOn(device: Device): boolean {
  return (device as any).acOn ?? (device as any)._acOn ?? device.on ?? device._on ?? false;
}

export function getAcMode(device: Device): number {
  return (device as any)._mode ?? (device as any)._acMode ?? 0;
}

export function getRoomDevices(roomName: string, devices: Record<string, Device>): Device[] {
  return Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
}

/**
 * Get device-specific threshold in minutes for determining if device is stale/unreachable
 * Based on device type and capabilities - matches logic from DeviceInfo.tsx
 * For devices with multiple capabilities, uses the MOST LENIENT threshold
 */
export function getDeviceStaleThresholdMinutes(device: Device): number {
  const capabilities = device.deviceCapabilities ?? [];
  const linkQuality = device.linkQuality ?? device._linkQuality;
  const isZigbee = linkQuality !== undefined;
  const batteryLevel = device.battery?.level ?? device.batteryLevel;
  const isBatteryDevice = capabilities.includes(DeviceCapability.batteryDriven) || batteryLevel !== undefined;
  
  const hasTemp = capabilities.includes(DeviceCapability.temperatureSensor);
  const hasHumidity = capabilities.includes(DeviceCapability.humiditySensor);
  const hasHeater = capabilities.includes(DeviceCapability.heater);
  const hasMotion = capabilities.includes(DeviceCapability.motionSensor);
  const hasHandle = capabilities.includes(DeviceCapability.handleSensor);
  const hasButtonSwitch = capabilities.includes(DeviceCapability.buttonSwitch);
  const hasLamp = capabilities.includes(DeviceCapability.lamp);
  const hasDimmable = capabilities.includes(DeviceCapability.dimmableLamp);
  const hasLed = capabilities.includes(DeviceCapability.ledLamp);
  const hasActuator = capabilities.includes(DeviceCapability.actuator);
  const hasShutter = capabilities.includes(DeviceCapability.shutter);
  
  // Collect all applicable thresholds for this device
  const thresholds: number[] = [];
  
  // Battery-powered event sensors (motion, handle, button switches) - very lenient
  if (hasMotion || hasHandle || hasButtonSwitch) {
    thresholds.push(48 * 60); // 48 hours - not all rooms/buttons used daily
  }
  
  // Lights and actuators
  if (hasLamp || hasDimmable || hasLed || hasActuator || hasShutter) {
    thresholds.push(60); // 1 hour
  }
  
  // Heaters
  if (hasHeater) {
    thresholds.push(30); // 30 minutes
  }
  
  // Temperature/humidity sensors - only strict if NOT battery-powered event sensor
  if ((hasTemp || hasHumidity) && !hasMotion && !hasHandle && !hasButtonSwitch) {
    thresholds.push(15); // 15 minutes
  }
  
  // Zigbee mains-powered - only strict if no other capabilities
  if (isZigbee && !isBatteryDevice && thresholds.length === 0) {
    thresholds.push(10); // 10 minutes
  }
  
  // Use the MOST LENIENT threshold (maximum) for multi-capability devices
  // Example: Handle sensor (24h) + Temp sensor (15min) → 24h
  if (thresholds.length > 0) {
    return Math.max(...thresholds);
  }
  
  return 60; // Default 1 hour
}

/**
 * Check if device is unreachable/offline
 * Uses lastUpdate with device-specific thresholds as primary indicator
 * The 'available' flag from Zigbee2MQTT is often unreliable/buggy, so we don't rely on it alone
 */
export function isDeviceUnreachable(device: Device): boolean {
  // Check lastUpdate with device-specific threshold (primary check)
  const lastUpdateRaw = device.lastUpdate ?? device._lastUpdate;
  if (!lastUpdateRaw) {
    // No lastUpdate info - fall back to available flag if present
    const available = device.available ?? device._available;
    return available === false;
  }
  
  const lastUpdateDate = new Date(lastUpdateRaw);
  if (isNaN(lastUpdateDate.getTime()) || lastUpdateDate.getTime() <= 0) {
    // Invalid date - fall back to available flag if present
    const available = device.available ?? device._available;
    return available === false;
  }
  
  const diffMs = Date.now() - lastUpdateDate.getTime();
  const diffMins = diffMs / 60000;
  const thresholdMins = getDeviceStaleThresholdMinutes(device);
  
  // Device is unreachable if lastUpdate exceeds threshold
  // Note: We ignore the 'available' flag as it's often buggy in Zigbee2MQTT
  return diffMins >= thresholdMins;
}

export const DeviceCapability = {
  ac: 0,
  actuator: 1,
  buttonSwitch: 2,
  energyManager: 3,
  excessEnergyConsumer: 4,
  heater: 5,
  humiditySensor: 6,
  illuminationSensor: 7,
  lamp: 8,
  dimmableLamp: 9,
  motionSensor: 10,
  shutter: 11,
  temperatureSensor: 12,
  vibrationSensor: 13,
  speaker: 14,
  handleSensor: 15,
  batteryDriven: 16,
  tv: 17,
  ledLamp: 18,
  smokeSensor: 19,
  loadMetering: 20,
  garageDoorOpener: 21,
  magnetSensor: 22,
  bluetoothDetector: 101,
  trackableDevice: 102,
  scene: 103,
  blockAutomatic: 104,
  camera: 105,
  doorbell: 106,
};

export const CAPABILITY_NAMES: Record<number, string> = {
  0: 'Klimaanlage',
  1: 'Aktor',
  2: 'Taster',
  3: 'Energie-Manager',
  4: 'Überschuss-Verbraucher',
  5: 'Heizung',
  6: 'Feuchtigkeitssensor',
  7: 'Helligkeitssensor',
  8: 'Lampe',
  9: 'Dimmbare Lampe',
  10: 'Bewegungsmelder',
  11: 'Rollladen',
  12: 'Temperatursensor',
  13: 'Vibrationssensor',
  14: 'Lautsprecher',
  15: 'Griffsensor',
  16: 'Batterie',
  17: 'TV',
  18: 'LED',
  19: 'Rauchmelder',
  20: 'Lastmessung',
  21: 'Garagentor',
  22: 'Magnetsensor',
  101: 'Bluetooth-Detektor',
  102: 'Trackbares Gerät',
  103: 'Szene',
  104: 'Automatik-Sperre',
  105: 'Kamera',
  106: 'Türklingel',
};

export function getCapabilityName(capability: number): string {
  return CAPABILITY_NAMES[capability] ?? `Unbekannt (${capability})`;
}

export function getCapabilityNames(capabilities: number[]): string {
  return capabilities.map(c => getCapabilityName(c)).join(', ');
}

// Complex capabilities that should only be shown in expert mode
// Based on SwiftUI isCapabilityComplex
const COMPLEX_CAPABILITIES = new Set([
  DeviceCapability.vibrationSensor,      // 13
  DeviceCapability.speaker,              // 14
  DeviceCapability.tv,                   // 17
  DeviceCapability.smokeSensor,          // 19
  DeviceCapability.loadMetering,         // 20
  DeviceCapability.buttonSwitch,         // 2
  DeviceCapability.energyManager,        // 3
  DeviceCapability.excessEnergyConsumer, // 4
  DeviceCapability.bluetoothDetector,    // 101
  DeviceCapability.trackableDevice,      // 102
  DeviceCapability.camera,               // 105
]);

export function isDeviceComplex(device: Device): boolean {
  const capabilities = device.deviceCapabilities ?? [];
  // Device is complex if ALL its capabilities are complex
  // (i.e., it has no simple capabilities that would make it useful for non-experts)
  if (capabilities.length === 0) return true;
  
  // Check if device has at least one non-complex capability
  const hasSimpleCapability = capabilities.some(cap => !COMPLEX_CAPABILITIES.has(cap));
  return !hasSimpleCapability;
}

export function filterDevicesForExpertMode(devices: Device[], expertMode: boolean): Device[] {
  if (expertMode) return devices;
  return devices.filter(d => !isDeviceComplex(d));
}

export interface RoomStats {
  temperature?: number;
  lampsOn: number;
  lampsTotal: number;
  acOn: number;
  acTotal: number;
}

export function getRoomStats(room: Room, devices: Record<string, Device>): RoomStats {
  const roomName = getRoomName(room);
  const roomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );

  let temperature: number | undefined;
  let lampsOn = 0;
  let lampsTotal = 0;
  let acOn = 0;
  let acTotal = 0;

  for (const device of roomDevices) {
    // Temperature
    const temp = getDeviceTemperature(device);
    if (temp !== undefined && temperature === undefined) {
      temperature = temp;
    }

    // Lamps
    if (hasCapability(device, DeviceCapability.lamp) || hasCapability(device, DeviceCapability.dimmableLamp)) {
      lampsTotal++;
      if (isDeviceOn(device)) {
        lampsOn++;
      }
    }

    // AC
    if (hasCapability(device, DeviceCapability.ac)) {
      acTotal++;
      if (isDeviceOn(device)) {
        acOn++;
      }
    }
  }

  return { temperature, lampsOn, lampsTotal, acOn, acTotal };
}

export interface Floor {
  level: number;
  name: string;
  rooms: Room[];
}

interface DataState {
  rooms: Record<string, Room>;
  devices: Record<string, Device>;
  floors: Floor[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fetchData: () => Promise<void>;
  fetchDevice: (deviceId: string) => Promise<void>;
}

function deriveFloors(rooms: Record<string, Room>): Floor[] {
  const floorMap = new Map<number, Room[]>();

  Object.values(rooms).forEach((room) => {
    const level = getRoomEtage(room);

    if (!floorMap.has(level)) {
      floorMap.set(level, []);
    }
    floorMap.get(level)!.push(room);
  });

  const floorNames: Record<number, string> = {
    [-1]: 'Keller',
    [0]: 'Erdgeschoss',
    [1]: '1. OG',
    [2]: '2. OG',
    [3]: 'Dachboden',
    [99]: 'Außen',
  };

  return Array.from(floorMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, rooms]) => ({
      level,
      name: floorNames[level] || `Etage ${level}`,
      rooms,
    }));
}

export const useDataStore = create<DataState>((set) => ({
  rooms: {},
  devices: {},
  floors: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [rooms, rawDevices] = await Promise.all([getRooms(), getDevices()]);
      
      // Add id from dictionary key to each device
      const devices: Record<string, Device> = {};
      for (const [id, device] of Object.entries(rawDevices)) {
        devices[id] = { ...device, id };
      }
      
      const floors = deriveFloors(rooms);
      set({
        rooms,
        devices,
        floors,
        isLoading: false,
        lastUpdated: new Date(),
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  fetchDevice: async (deviceId: string) => {
    try {
      const updatedDevice = await getDevice(deviceId);
      set((state) => ({
        devices: {
          ...state.devices,
          [deviceId]: { ...updatedDevice, id: deviceId },
        },
      }));
    } catch (error) {
      console.error('Failed to fetch device:', error);
    }
  },
}));
