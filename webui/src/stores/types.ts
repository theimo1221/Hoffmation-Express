/**
 * Shared Types for Hoffmation Express WebUI
 * 
 * This file contains all shared interfaces and types used across stores.
 */

// ============================================================================
// Trilateration & Positioning
// ============================================================================

export interface TrilaterationPoint {
  x: number;
  y: number;
  z: number;
  roomName?: string;
}

// ============================================================================
// Room Types
// ============================================================================

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

export interface RoomWebUISettings {
  crossSectionFloors?: string[];  // Floor IDs
  icon?: string;                  // Lucide Icon Name
  color?: string;                 // Hex Color (#RRGGBB)
}

export interface FloorDefinition {
  id: string;
  name: string;
  level: number;
  sortOrder: number;
  icon?: string;   // Lucide Icon Name
  color?: string;  // Hex Color (#RRGGBB)
}

export interface RoomSettings {
  presenceTimeout?: number;
  presenceTimeoutAfterMotion?: number;
  presenceTimeoutAfterMotionAtNight?: number;
  presenceTimeoutAtNight?: number;
  presenceTimeoutOnManualSwitch?: number;
  presenceTimeoutOnManualSwitchAtNight?: number;
  motionSensorTimeout?: number;
  lightIfNoWindows?: boolean;
  includeLampsInNormalMovementLightning?: boolean;
  radioUrl?: string;
  // Light settings
  ambientLightAfterSunset?: boolean;
  lichtSonnenAufgangAus?: boolean;
  lampenBeiBewegung?: boolean;
  roomIsAlwaysDark?: boolean;
  sonnenAufgangLampenDelay?: number;
  sonnenUntergangLampenDelay?: number;
  // Shutter settings
  rolloHeatReduction?: boolean;
  sonnenAufgangRollos?: boolean;
  sonnenAufgangRolloDelay?: number;
  sonnenAufgangRolloMinTime?: { hours?: number; minutes?: number };
  sonnenUntergangRollos?: boolean;
  sonnenUntergangRolloDelay?: number;
  sonnenUntergangRolloMaxTime?: { hours?: number; minutes?: number };
  sonnenUntergangRolloAdditionalOffsetPerCloudiness?: number;
  // Night time settings
  nightStart?: { hours: number; minutes: number };
  nightEnd?: { hours: number; minutes: number };
  // Motion settings
  movementResetTimer?: number;
  // Trilateration coordinates
  trilaterationStartPoint?: { x: number; y: number; z: number };
  trilaterationEndPoint?: { x: number; y: number; z: number };
  // WebUI custom settings (JSON string)
  customSettingsJson?: string;
}

export interface TimeCallback {
  name?: string;
  type?: number;
  minuteOffset?: number;
  nextToDo?: number;  // Unix timestamp in milliseconds
  lastDone?: number;
  cloudOffset?: number;
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
  sunriseShutterCallback?: TimeCallback;
  sunsetShutterCallback?: TimeCallback;
  sonnenAufgangLichtCallback?: TimeCallback;
}

// ============================================================================
// Device Settings Types
// ============================================================================

export interface ActuatorSettings {
  dayOn?: boolean;
  dawnOn?: boolean;
  duskOn?: boolean;
  nightOn?: boolean;
  includeInAmbientLight?: boolean;
  dontTurnOffOnLeave?: boolean;
  dontTurnOffOnOverwrite?: boolean;
  dontTurnOnAutomatically?: boolean;
  skipInHomebridge?: boolean;
  turnOnThreshhold?: number;
  stromStossResendTime?: number;
}

export interface DimmerSettings extends ActuatorSettings {
  defaultBrightness?: number;
  dayBrightness?: number;
  dawnBrightness?: number;
  duskBrightness?: number;
  nightBrightness?: number;
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
  heatReductionDirectionThreshold?: number;
  heatReductionThreshold?: number;
  automaticShutterCloseTime?: number;
  automaticShutterOpenTime?: number;
  triggerPositionUpdateByTime?: boolean;
  skipInHomebridge?: boolean;
}

export interface HeaterSettings {
  automaticMode?: boolean;
  useOwnTemperatur?: boolean;
  useOwnTemperatureForRoomTemperature?: boolean;
  controlByPid?: boolean;
  controlByTempDiff?: boolean;
  pidForcedMinimum?: number;
  seasonalTurnOffActive?: boolean;
  manualDisabled?: boolean;
  desiredTemperature?: number;
  skipInHomebridge?: boolean;
}

export interface AcSettings {
  minimumHours?: number;
  minimumMinutes?: number;
  maximumHours?: number;
  maximumMinutes?: number;
  manualDisabled?: boolean;
  heatingAllowed?: boolean;
  useOwnTemperature?: boolean;
  useAutomatic?: boolean;
  noCoolingOnMovement?: boolean;
  minOutdoorTempForCooling?: number;
  overrideHeatingTargetTemp?: number;
  overrideCoolingTargetTemp?: number;
  desiredTemperature?: number;
  skipInHomebridge?: boolean;
}

export interface HandleSettings {
  informOnOpen?: boolean;
  informNotHelping?: boolean;
  informIsHelping?: boolean;
  skipInHomebridge?: boolean;
}

export interface CameraSettings {
  alertPersonOnTelegram?: boolean;
  movementDetectionOnPersonOnly?: boolean;
  movementDetectionOnDogsToo?: boolean;
  hasMicrophone?: boolean;
  hasSpeaker?: boolean;
  skipInHomebridge?: boolean;
}

export interface MotionSensorSettings {
  seesWindow?: boolean;
  excludeFromNightAlarm?: boolean;
  skipInHomebridge?: boolean;
}

export interface SceneSettings {
  defaultTurnOffTimeout?: number;
  skipInHomebridge?: boolean;
}

export interface SpeakerSettings {
  maxPlayOnAllVolume?: number;
  defaultDayAnounceVolume?: number;
  defaultNightAnounceVolume?: number;
  skipInHomebridge?: boolean;
}

export interface DachsSettings {
  refreshIntervalTime?: number;
  disableHeatingRod?: boolean;
  disableDachsOwnWW?: boolean;
  disableDachsTemporarily?: boolean;
  batteryLevelTurnOnThreshold?: number;
  batteryLevelAllowStartThreshold?: number;
  batteryLevelPreventStartThreshold?: number;
  warmWaterDesiredMinTemp?: number;
  warmWaterDesiredMaxTemp?: number;
  heatStorageMaxStartTemp?: number;
  winterMinimumPreNightHeatStorageTemp?: number;
  skipInHomebridge?: boolean;
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

// ============================================================================
// Device Sensor Types
// ============================================================================

export interface TemperatureSensor {
  roomTemperature?: number;
  temperature?: number;
  outdoorTemperatureCorrectionCoefficient?: number;
  _temperature?: number;
  lastSeen?: number;
}

export interface HumiditySensor {
  humidity?: number;
  _humidity?: number;
}

export interface HandleSensor {
  position?: number;
  minutesOpen?: number;
  _lastPersist?: number;
  _helpingRoomTemp?: boolean;
}

export interface Battery {
  level?: number;
  _level?: number;
  _lastPersist?: number;
  _lastLevel?: number;
  _lastChangeReportMs?: number;
}

export interface BlockAutomationHandler {
  blockUntil?: number;
  automaticBlockedUntil?: number;
  reason?: string;
}

// ============================================================================
// Device Type
// ============================================================================

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
  // Load Metering
  loadPower?: number;
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
  // Commands
  lastCommands?: unknown[];
}
