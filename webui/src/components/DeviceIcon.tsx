import { type Device } from '@/stores/dataStore';
import { 
  Lightbulb, 
  LightbulbOff, 
  Blinds, 
  Wind, 
  Snowflake,
  Zap,
  ZapOff,
  Lock,
  PersonStanding,
  Activity,
  Flame,
  Speaker,
  CloudFog
} from 'lucide-react';

// Device capabilities from hoffmation-base DeviceCapability enum
export const DeviceCapability = {
  ac: 0,
  actuator: 1,
  energyManager: 3,
  heater: 5,
  humiditySensor: 6,
  co2Sensor: 7,
  lamp: 8,
  dimmableLamp: 9,
  motionSensor: 10,
  shutter: 11,
  temperatureSensor: 12,
  speaker: 14,
  handleSensor: 15,
  batteryDriven: 16,
  ledLamp: 18,
  scene: 103,
  blockAutomatic: 104,
  camera: 105,
};

interface DeviceIconProps {
  device: Device;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export function DeviceIcon({ device, size = 'md', showStatus = true }: DeviceIconProps) {
  const capabilities = device.deviceCapabilities ?? [];
  const isOn = device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  // Priority order for display capability (like SwiftUI primaryCap)
  const getPrimaryCap = (): number | null => {
    if (capabilities.includes(DeviceCapability.lamp)) return DeviceCapability.lamp;
    if (capabilities.includes(DeviceCapability.dimmableLamp)) return DeviceCapability.dimmableLamp;
    if (capabilities.includes(DeviceCapability.ledLamp)) return DeviceCapability.ledLamp;
    if (capabilities.includes(DeviceCapability.shutter)) return DeviceCapability.shutter;
    if (capabilities.includes(DeviceCapability.ac)) return DeviceCapability.ac;
    if (capabilities.includes(DeviceCapability.heater)) return DeviceCapability.heater;
    if (capabilities.includes(DeviceCapability.speaker)) return DeviceCapability.speaker;
    if (capabilities.includes(DeviceCapability.co2Sensor)) return DeviceCapability.co2Sensor;
    if (capabilities.includes(DeviceCapability.temperatureSensor)) return DeviceCapability.temperatureSensor;
    if (capabilities.includes(DeviceCapability.motionSensor)) return DeviceCapability.motionSensor;
    if (capabilities.includes(DeviceCapability.handleSensor)) return DeviceCapability.handleSensor;
    if (capabilities.includes(DeviceCapability.actuator)) return DeviceCapability.actuator;
    if (capabilities.includes(DeviceCapability.scene)) return DeviceCapability.scene;
    return null;
  };

  const primaryCap = getPrimaryCap();

  // Lamp icons
  if (primaryCap === DeviceCapability.lamp || primaryCap === DeviceCapability.dimmableLamp || primaryCap === DeviceCapability.ledLamp) {
    if (showStatus && isOn) {
      return <Lightbulb className={`${sizeClass} text-yellow-500 fill-yellow-500`} />;
    }
    return <LightbulbOff className={`${sizeClass} text-muted-foreground`} />;
  }

  // Shutter icons
  if (primaryCap === DeviceCapability.shutter) {
    return <Blinds className={`${sizeClass} text-primary`} />;
  }

  // AC icons
  if (primaryCap === DeviceCapability.ac) {
    if (showStatus && isOn) {
      return <Snowflake className={`${sizeClass} text-blue-500`} />;
    }
    return <Wind className={`${sizeClass} text-muted-foreground`} />;
  }

  // Heater icons
  if (primaryCap === DeviceCapability.heater) {
    return <Flame className={`${sizeClass} text-orange-500`} />;
  }

  // Temperature sensor - show temp value
  if (primaryCap === DeviceCapability.temperatureSensor && temp !== undefined) {
    return (
      <span className="text-xs font-bold text-primary">
        {temp.toFixed(0)}°
      </span>
    );
  }

  // Motion sensor
  if (primaryCap === DeviceCapability.motionSensor) {
    const movementDetected = device.movementDetected ?? device._movementDetected ?? false;
    if (showStatus && movementDetected) {
      return <PersonStanding className={`${sizeClass} text-green-500`} />;
    }
    return <PersonStanding className={`${sizeClass} text-muted-foreground`} />;
  }

  // Handle sensor
  if (primaryCap === DeviceCapability.handleSensor) {
    return <Lock className={`${sizeClass} text-muted-foreground`} />;
  }

  // Actuator
  if (primaryCap === DeviceCapability.actuator) {
    if (showStatus && isOn) {
      return <Zap className={`${sizeClass} text-green-500`} />;
    }
    return <ZapOff className={`${sizeClass} text-muted-foreground`} />;
  }

  // Scene
  if (primaryCap === DeviceCapability.scene) {
    if (showStatus && isOn) {
      return <Activity className={`${sizeClass} text-green-500`} />;
    }
    return <Activity className={`${sizeClass} text-muted-foreground`} />;
  }

  // Speaker
  if (primaryCap === DeviceCapability.speaker) {
    return <Speaker className={`${sizeClass} text-primary`} />;
  }

  // CO2 Sensor
  if (primaryCap === DeviceCapability.co2Sensor) {
    return <CloudFog className={`${sizeClass} text-muted-foreground`} />;
  }

  // Default
  return <Zap className={`${sizeClass} text-muted-foreground`} />;
}

export function getDeviceStatusColor(device: Device): string {
  const isOn = device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
  return isOn ? 'bg-primary' : 'bg-primary/10';
}
