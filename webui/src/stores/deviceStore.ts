/**
 * Device Store
 * Utility functions for device operations
 */

import type { Device } from './types';

export type { Device } from './types';

/**
 * Device Type Checker Functions
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

/**
 * Check if device supports toggle action (tap to toggle on/off)
 */
export function isToggleableDevice(device: Device): boolean {
  return isLampDevice(device) || 
         isActuatorDevice(device) || 
         isShutterDevice(device) || 
         isAcDevice(device) || 
         isSceneDevice(device);
}

/**
 * Get the appropriate toggle action for a device
 * Returns the API function and parameters needed to toggle the device
 */
export function getDeviceToggleAction(device: Device): { type: 'lamp' | 'actuator' | 'shutter' | 'ac' | 'scene' | null } {
  if (isLampDevice(device)) return { type: 'lamp' };
  if (isActuatorDevice(device)) return { type: 'actuator' };
  if (isShutterDevice(device)) return { type: 'shutter' };
  if (isAcDevice(device)) return { type: 'ac' };
  if (isSceneDevice(device)) return { type: 'scene' };
  return { type: null };
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
 * Device State Getter Functions
 */

export function getDeviceRoom(device: Device): string {
  return device.info?.room || device._info?.room || '';
}

export function getDeviceName(device: Device, stripRoomPrefix?: string): string {
  const info = device.info ?? device._info;
  let name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = stripRoomPrefix ?? getDeviceRoom(device);
  
  if (room && name.toLowerCase().includes(room.toLowerCase())) {
    const roomLower = room.toLowerCase();
    const nameLower = name.toLowerCase();
    
    const patterns = [
      new RegExp(`^${roomLower}[_\\s-]+`, 'i'),
      new RegExp(`[_\\s-]+${roomLower}$`, 'i'),
      new RegExp(`^${roomLower}$`, 'i'),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(nameLower)) {
        name = name.replace(pattern, '').trim();
        break;
      }
    }
    
    name = name.replace(/^[_\s-]+|[_\s-]+$/g, '');
  }
  
  return name || 'Unbekannt';
}

export function isDeviceOn(device: Device): boolean {
  return device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
}

export function getDeviceBrightness(device: Device): number {
  return device.brightness ?? device._brightness ?? -1;
}

export function getDeviceTemperature(device: Device): number | undefined {
  // Get device's own temperature, not room average
  const temp = (device as any).temperatureSensor?._temperature ?? 
               (device as any).temperatureSensor?.temperature ?? 
               (device as any)._temperature;
  return temp === -99 ? undefined : temp;
}

export function getRoomTemperature(device: Device): number | undefined {
  // Get room average temperature
  const temp = (device as any).temperatureSensor?.roomTemperature ?? 
               (device as any)._roomTemperature;
  return temp === -99 ? undefined : temp;
}

export function getDeviceHumidity(device: Device): number | undefined {
  const humidity = device.humiditySensor?.humidity ?? device._humidity;
  return humidity === -1 ? undefined : humidity;
}

export function getDeviceHandlePosition(device: Device): number {
  return device.handleSensor?.position ?? device.position ?? -1;
}

export function getDeviceShutterLevel(device: Device): number {
  let level = device._currentLevel ?? -1;
  if (level >= 0 && level <= 1) level = level * 100;
  return level;
}

export function getDeviceDesiredTemp(device: Device): number {
  return device.desiredTemp ?? device._desiredTemperatur ?? -99;
}

export function getDeviceValveLevel(device: Device): number {
  return (device._level ?? -0.01) * 100;
}

export function isMotionDetected(device: Device): boolean {
  return device.movementDetected ?? device._movementDetected ?? false;
}

export function getDeviceDetectionsToday(device: Device): number {
  return device._detectionsToday ?? device.detectionsToday ?? -1;
}

export function getDeviceBattery(device: Device): number | undefined {
  return device.battery?.level ?? (device.battery as any)?._level ?? device.batteryLevel;
}

export function getDeviceColor(device: Device): string | undefined {
  return device._color;
}

export function isAcOn(device: Device): boolean {
  return (device as any).acOn ?? (device as any)._acOn ?? device.on ?? device._on ?? false;
}

export function getAcMode(device: Device): number {
  return (device as any)._mode ?? (device as any)._acMode ?? 0;
}

export function getHandleState(device: Device): string | undefined {
  return (device as any).state ?? (device as any)._state;
}

export function getHandlePosition(device: Device): number {
  return (device as any).position ?? (device as any).handleSensor?.position ?? -1;
}

export function isMotionCurrentlyDetected(device: Device): boolean {
  return isMotionDetected(device);
}

export function getDeviceLastUpdate(device: Device): number | string | undefined {
  return (device as any).lastUpdate ?? (device as any)._lastUpdate;
}

export function getPrimaryCapability(device: Device): number | null {
  const capabilities = device.deviceCapabilities ?? [];
  
  // Priority order for display capability (matching SwiftUI primaryCap order)
  if (capabilities.includes(DeviceCapability.scene)) return DeviceCapability.scene;
  if (capabilities.includes(DeviceCapability.handleSensor)) return DeviceCapability.handleSensor;
  if (capabilities.includes(DeviceCapability.ledLamp)) return DeviceCapability.ledLamp;
  if (capabilities.includes(DeviceCapability.dimmableLamp)) return DeviceCapability.dimmableLamp;
  if (capabilities.includes(DeviceCapability.lamp)) return DeviceCapability.lamp;
  if (capabilities.includes(DeviceCapability.actuator)) return DeviceCapability.actuator;
  if (capabilities.includes(DeviceCapability.ac)) return DeviceCapability.ac;
  if (capabilities.includes(DeviceCapability.shutter)) return DeviceCapability.shutter;
  if (capabilities.includes(DeviceCapability.speaker)) return DeviceCapability.speaker;
  if (capabilities.includes(DeviceCapability.motionSensor)) return DeviceCapability.motionSensor;
  if (capabilities.includes(DeviceCapability.heater)) return DeviceCapability.heater;
  if (capabilities.includes(DeviceCapability.temperatureSensor)) return DeviceCapability.temperatureSensor;
  if (capabilities.includes(DeviceCapability.batteryDriven)) return DeviceCapability.batteryDriven;
  return null;
}

/**
 * Device Capability Constants
 */
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
} as const;

export function hasCapability(device: Device, capability: number): boolean {
  return device.deviceCapabilities?.includes(capability) ?? false;
}

/**
 * Additional Device Getters
 */

export function getDeviceLinkQuality(device: Device): number | undefined {
  return device.linkQuality ?? device._linkQuality;
}

export function isDeviceAvailable(device: Device): boolean | undefined {
  return device.available ?? device._available;
}

export function getAutomaticBlockedUntil(device: Device): Date | undefined {
  const ms = (device.blockAutomationHandler as any)?.automaticBlockedUntil;
  if (!ms || ms === 0) return undefined;
  return new Date(ms);
}

/**
 * Device Unreachability Detection
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
  
  const thresholds: number[] = [];
  
  if (hasMotion || hasHandle || hasButtonSwitch) {
    thresholds.push(48 * 60); // 48 hours - not all rooms/buttons used daily
  }
  
  if (hasLamp || hasDimmable || hasLed || hasActuator || hasShutter) {
    thresholds.push(60); // 1 hour
  }
  
  if (hasHeater) {
    thresholds.push(30); // 30 minutes
  }
  
  if ((hasTemp || hasHumidity) && !hasMotion && !hasHandle && !hasButtonSwitch) {
    thresholds.push(15); // 15 minutes
  }
  
  if (isZigbee && !isBatteryDevice && thresholds.length === 0) {
    thresholds.push(10); // 10 minutes
  }
  
  if (thresholds.length > 0) {
    return Math.max(...thresholds);
  }
  
  return 60; // Default 1 hour
}

export function isDeviceUnreachable(device: Device): boolean {
  // Check explicit available flag first
  const available = device.available ?? device._available;
  if (available === false) {
    return true; // Explicitly marked as unavailable
  }
  
  // If no lastUpdate exists, device is not unreachable (e.g., speakers, scenes)
  const lastUpdateRaw = device.lastUpdate ?? device._lastUpdate;
  if (!lastUpdateRaw) {
    return false; // No lastUpdate means device doesn't report state regularly
  }
  
  // Parse lastUpdate timestamp
  const lastUpdateDate = new Date(lastUpdateRaw);
  if (isNaN(lastUpdateDate.getTime()) || lastUpdateDate.getTime() <= 0) {
    return false; // Invalid timestamp, assume device is reachable
  }
  
  // Check if lastUpdate is stale based on device type
  const diffMs = Date.now() - lastUpdateDate.getTime();
  const diffMins = diffMs / 60000;
  const thresholdMins = getDeviceStaleThresholdMinutes(device);
  
  return diffMins >= thresholdMins;
}

/**
 * Device Complexity Check
 */

const COMPLEX_CAPABILITIES = [
  DeviceCapability.vibrationSensor,
  DeviceCapability.speaker,
  DeviceCapability.tv,
  DeviceCapability.smokeSensor,
  DeviceCapability.loadMetering,
  DeviceCapability.buttonSwitch,
  DeviceCapability.energyManager,
  DeviceCapability.excessEnergyConsumer,
  DeviceCapability.bluetoothDetector,
  DeviceCapability.trackableDevice,
  DeviceCapability.camera,
  DeviceCapability.doorbell,
  DeviceCapability.garageDoorOpener,
];

export function isDeviceComplex(device: Device): boolean {
  const caps = device.deviceCapabilities ?? [];
  return caps.some(cap => (COMPLEX_CAPABILITIES as readonly number[]).includes(cap));
}

export function filterDevicesForExpertMode(devices: Record<string, Device>, expertMode: boolean): Record<string, Device> {
  if (expertMode) return devices;
  
  return Object.fromEntries(
    Object.entries(devices).filter(([_, device]) => !isDeviceComplex(device))
  );
}

/**
 * Capability Names
 */

export const CAPABILITY_NAMES: Record<number, string> = {
  [DeviceCapability.ac]: 'Klimaanlage',
  [DeviceCapability.actuator]: 'Steckdose',
  [DeviceCapability.buttonSwitch]: 'Taster',
  [DeviceCapability.energyManager]: 'Energie-Manager',
  [DeviceCapability.excessEnergyConsumer]: 'Überschuss-Verbraucher',
  [DeviceCapability.heater]: 'Heizung',
  [DeviceCapability.humiditySensor]: 'Luftfeuchtigkeit',
  [DeviceCapability.illuminationSensor]: 'Helligkeitssensor',
  [DeviceCapability.lamp]: 'Lampe',
  [DeviceCapability.dimmableLamp]: 'Dimmer',
  [DeviceCapability.motionSensor]: 'Bewegungsmelder',
  [DeviceCapability.shutter]: 'Rolladen',
  [DeviceCapability.temperatureSensor]: 'Temperatur',
  [DeviceCapability.vibrationSensor]: 'Vibrationssensor',
  [DeviceCapability.speaker]: 'Lautsprecher',
  [DeviceCapability.handleSensor]: 'Fenstersensor',
  [DeviceCapability.batteryDriven]: 'Batterie',
  [DeviceCapability.tv]: 'TV',
  [DeviceCapability.ledLamp]: 'LED',
  [DeviceCapability.smokeSensor]: 'Rauchmelder',
  [DeviceCapability.loadMetering]: 'Verbrauchsmessung',
  [DeviceCapability.garageDoorOpener]: 'Garagentor',
  [DeviceCapability.magnetSensor]: 'Magnetsensor',
  [DeviceCapability.bluetoothDetector]: 'Bluetooth-Detektor',
  [DeviceCapability.trackableDevice]: 'Ortbares Gerät',
  [DeviceCapability.scene]: 'Szene',
  [DeviceCapability.blockAutomatic]: 'Automatik blockiert',
  [DeviceCapability.camera]: 'Kamera',
  [DeviceCapability.doorbell]: 'Türklingel',
};

export function getCapabilityName(capability: number): string {
  return CAPABILITY_NAMES[capability] || `Unbekannt (${capability})`;
}

export function getCapabilityNames(device: Device): string[] {
  const caps = device.deviceCapabilities ?? [];
  return caps.map(cap => getCapabilityName(cap));
}
