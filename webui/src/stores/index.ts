/**
 * Central Store Exports
 * 
 * This file provides a single import point for all store-related functionality.
 * Import from '@/stores' instead of individual store files.
 */

// ============================================================================
// Types
// ============================================================================
export type {
  // Core types
  Device,
  Room,
  TrilaterationPoint,
  
  // Room types
  RoomInfo,
  GroupType,
  GroupData,
  RoomWebUISettings,
  FloorDefinition,
  RoomSettings,
  
  // Device types
  DeviceInfo,
  DeviceSettings,
  
  // Settings types
  ActuatorSettings,
  DimmerSettings,
  LedSettings,
  ShutterSettings,
  HeaterSettings,
  AcSettings,
  HandleSettings,
  CameraSettings,
  MotionSensorSettings,
  SceneSettings,
  SpeakerSettings,
  DachsSettings,
  
  // Sensor types
  TemperatureSensor,
  HumiditySensor,
  HandleSensor,
  Battery,
  BlockAutomationHandler,
} from './types';

// ============================================================================
// Device Store
// ============================================================================
export {
  // Type checkers
  isLampDevice,
  isActuatorDevice,
  isShutterDevice,
  isSceneDevice,
  isAcDevice,
  isHeaterDevice,
  isMotionSensorDevice,
  isHandleSensorDevice,
  isTempSensorDevice,
  isHumiditySensorDevice,
  isSpeakerDevice,
  isCameraDevice,
  isButtonSwitchDevice,
  isToggleableDevice,
  getDeviceToggleAction,
  
  // State getters
  getDeviceRoom,
  getDeviceName,
  isDeviceOn,
  getDeviceBrightness,
  getDeviceTemperature,
  getDeviceHumidity,
  getDeviceHandlePosition,
  getDeviceShutterLevel,
  getDeviceDesiredTemp,
  getDeviceValveLevel,
  isMotionDetected,
  getDeviceDetectionsToday,
  getDeviceBattery,
  getDeviceColor,
  isAcOn,
  getAcMode,
  getDeviceLinkQuality,
  isDeviceAvailable,
  getAutomaticBlockedUntil,
  
  // Capability
  DeviceCapability,
  hasCapability,
  
  // Unreachability
  getDeviceStaleThresholdMinutes,
  isDeviceUnreachable,
  
  // Expert mode
  isDeviceComplex,
  filterDevicesForExpertMode,
  
  // Capability names
  getCapabilityName,
  getCapabilityNames,
} from './deviceStore';

// ============================================================================
// Room Store
// ============================================================================
export {
  getRoomName,
  getRoomEtage,
  getRoomNameVariants,
  getRoomDevices,
  getRoomStats,
  hasGroup,
  getGroup,
  getRoomWebUISettings,
  getRoomFloors,
  type RoomStats,
} from './roomStore';

// ============================================================================
// Data Store (Zustand)
// ============================================================================
export {
  useDataStore,
  type Floor,
  getFloorsForRoom,
  isMultiFloorRoom,
  getRoomCoords,
} from './dataStore';
