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
}

export function getDeviceRoom(device: Device): string {
  return device.info?.room || device._info?.room || '';
}

export function getDeviceName(device: Device, stripRoomPrefix?: string): string {
  const info = device.info ?? device._info;
  let name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  
  // Optionally strip room/floor prefix from name for cleaner display in room context
  if (stripRoomPrefix && name.toLowerCase().startsWith(stripRoomPrefix.toLowerCase())) {
    name = name.substring(stripRoomPrefix.length).trim();
    // Remove leading dash or colon if present
    if (name.startsWith('-') || name.startsWith(':')) {
      name = name.substring(1).trim();
    }
  }
  
  return name;
}

export function isDeviceOn(device: Device): boolean {
  return device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
}

export function getDeviceTemperature(device: Device): number | undefined {
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  // -99 means no data
  return temp === -99 ? undefined : temp;
}

export function hasCapability(device: Device, capability: number): boolean {
  return device.deviceCapabilities?.includes(capability) ?? false;
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
