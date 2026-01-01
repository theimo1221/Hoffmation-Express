import type { Device } from '@/stores';

export interface DeviceControlProps {
  device: Device;
  isLoading: boolean;
  onAction: () => void;
}

export interface LampControlsProps extends DeviceControlProps {
  isOn: boolean;
  forceDuration: number;
  setForceDuration: (value: number) => void;
  onToggle: () => Promise<void>;
  onForce: (state: boolean) => Promise<void>;
}

export interface DimmerControlsProps extends LampControlsProps {
  brightness: number;
  desiredBrightness: number;
  setDesiredBrightness: (value: number) => void;
  onDimmer: (state: boolean, brightness: number) => Promise<void>;
}

export interface LedControlsProps extends DimmerControlsProps {
  desiredColor: string;
  setDesiredColor: (value: string) => void;
  onLed: (state: boolean, brightness: number, color: string) => Promise<void>;
  onForceLed: (state: boolean) => Promise<void>;
}

export interface ShutterControlsProps extends DeviceControlProps {
  currentLevel: number;
  desiredPosition: number;
  setDesiredPosition: (value: number) => void;
  onSetShutter: (level: number) => Promise<void>;
}

export interface TemperatureControlsProps extends DeviceControlProps {
  temperature: number;
  humidity: number;
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  tempHistory: { timestamp: Date; temperature: number }[];
  onLoadHistory: () => Promise<void>;
}

export interface AcControlsProps extends DeviceControlProps {
  isOn: boolean;
  acMode: number;
  desiredTemp: number;
  roomTemp: number;
  onAc: (power: boolean, mode?: number, temp?: number) => Promise<void>;
}

export interface HeaterControlsProps extends DeviceControlProps {
  valveLevel: number;
  roomTemp: number;
  desiredTemp: number;
}

export interface MotionSensorControlsProps extends DeviceControlProps {
  movementDetected: boolean;
  detectionsToday: number;
  timeSinceLastMotion: number;
}

export interface HandleSensorControlsProps extends DeviceControlProps {
  position: number;
}

export interface HumiditySensorControlsProps extends DeviceControlProps {
  humidity: number;
}

export interface SpeakerControlsProps extends DeviceControlProps {
  speakMessage: string;
  setSpeakMessage: (value: string) => void;
  onSpeak: (message: string) => Promise<void>;
}

export interface SceneControlsProps extends DeviceControlProps {
  isOn: boolean;
  sceneTimeout: number;
  setSceneTimeout: (value: number) => void;
  onScene: (start: boolean, timeout?: number) => Promise<void>;
}

export interface CameraControlsProps extends DeviceControlProps {
  cameraImageLink?: string;
  h264StreamLink?: string;
  mpegStreamLink?: string;
}

export interface BlockAutomaticControlsProps extends DeviceControlProps {
  automaticBlockedUntil: number;
  blockHours: number;
  setBlockHours: (value: number) => void;
  blockUntilDate: string;
  setBlockUntilDate: (value: string) => void;
  onBlockAutomatic: (hours: number) => Promise<void>;
  onLiftBlock: () => Promise<void>;
  onBlockUntilDate: (date: string) => Promise<void>;
}

export interface EnergyManagerControlsProps extends DeviceControlProps {
  batteryLevel: number;
  excessEnergy: number;
  selfConsumingWattage: number;
}

export interface BatteryControlsProps extends DeviceControlProps {
  batteryLevel: number;
}

export interface DeviceInfoProps {
  device: Device;
  expertMode: boolean;
  showRawJson: boolean;
  setShowRawJson: (value: boolean) => void;
  capabilities: number[];
  hasTemp: boolean;
  hasHumidity: boolean;
  hasHeater: boolean;
  hasMotion: boolean;
  hasHandle: boolean;
  hasLamp: boolean;
  hasDimmable: boolean;
  hasLed: boolean;
  hasActuator: boolean;
  hasShutter: boolean;
  hasBattery: boolean;
}

// Capability constants (from hoffmation-base DeviceCapability enum)
export const DeviceCapabilities = {
  AC: 0,
  ACTUATOR: 1,
  ENERGY_MANAGER: 3,
  HEATER: 5,
  HUMIDITY_SENSOR: 6,
  LAMP: 8,
  DIMMABLE: 9,
  MOTION_SENSOR: 10,
  SHUTTER: 11,
  TEMP_SENSOR: 12,
  SPEAKER: 14,
  HANDLE_SENSOR: 15,
  BATTERY: 16,
  LED: 18,
  SCENE: 103,
  BLOCK_AUTOMATIC: 104,
  CAMERA: 105,
} as const;
