import { type Device } from '@/stores';
import { 
  getDeviceShutterLevel, 
  isDeviceOn, 
  getDeviceTemperature, 
  getAcMode, 
  isMotionDetected, 
  isDeviceUnreachable,
  getPrimaryCapability,
  getHandlePosition
} from '@/stores/deviceStore';
import { 
  Lightbulb, 
  LightbulbOff, 
  Blinds, 
  Wind, 
  Snowflake,
  Zap,
  ZapOff,
  Lock,
  LockOpen,
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
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export function DeviceIcon({ device, size = 'md', showStatus = true }: DeviceIconProps) {
  const isOn = isDeviceOn(device);
  const temp = getDeviceTemperature(device);
  
  const sizeClass = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  const primaryCap = getPrimaryCapability(device);

  // Lamp icons - always yellow when on, LED color shown via border elsewhere
  if (primaryCap === DeviceCapability.lamp || primaryCap === DeviceCapability.dimmableLamp || primaryCap === DeviceCapability.ledLamp) {
    if (showStatus && isOn) {
      return <Lightbulb className={`${sizeClass} text-yellow-500 fill-yellow-500`} />;
    }
    return <LightbulbOff className={`${sizeClass} text-muted-foreground`} />;
  }

  // Shutter icons - green when closed (level < 10), orange when partially open, gray when open
  // Note: 0% = closed, 100% = open
  if (primaryCap === DeviceCapability.shutter) {
    const level = getDeviceShutterLevel(device);
    if (level >= 0 && level < 10) {
      // Closed = green (secure) - 0% means closed
      return <Blinds className={`${sizeClass} text-green-500`} />;
    } else if (level >= 10 && level < 90) {
      // Partially open = orange
      return <Blinds className={`${sizeClass} text-orange-500`} />;
    }
    // Open or unknown = muted
    return <Blinds className={`${sizeClass} text-muted-foreground`} />;
  }

  // AC icons - color based on mode: off=gray, cooling=blue, heating=red, auto=green
  if (primaryCap === DeviceCapability.ac) {
    const mode = getAcMode(device);
    if (!showStatus || !isOn) {
      return <Wind className={`${sizeClass} text-muted-foreground`} />;
    }
    // Mode: 0=auto, 1=cool, 2=dry, 3=fan, 4=heat
    if (mode === 4) {
      // Heating
      return <Wind className={`${sizeClass} text-red-500`} />;
    } else if (mode === 1 || mode === 2) {
      // Cooling or Dry
      return <Snowflake className={`${sizeClass} text-blue-500`} />;
    } else if (mode === 0) {
      // Auto
      return <Wind className={`${sizeClass} text-green-500`} />;
    }
    // Fan or unknown - just show on
    return <Wind className={`${sizeClass} text-blue-500`} />;
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
    const movementDetected = isMotionDetected(device);
    if (showStatus && movementDetected) {
      return <PersonStanding className={`${sizeClass} text-green-500`} />;
    }
    return <PersonStanding className={`${sizeClass} text-muted-foreground`} />;
  }

  // Handle sensor - green when closed, orange when tilted, red when open
  if (primaryCap === DeviceCapability.handleSensor) {
    const position = getHandlePosition(device);
    if (position === 0) {
      // Closed = green (secure) - locked icon
      return <Lock className={`${sizeClass} text-green-500`} />;
    } else if (position === 1) {
      // Tilted = orange (partially open) - open lock icon
      return <LockOpen className={`${sizeClass} text-orange-500`} />;
    } else if (position === 2) {
      // Open = red (insecure) - open lock icon
      return <LockOpen className={`${sizeClass} text-red-500`} />;
    }
    // Unknown
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
  // Use centralized unreachability detection
  if (isDeviceUnreachable(device)) {
    return 'bg-red-500';
  }
  
  const isOn = isDeviceOn(device);
  return isOn ? 'bg-primary' : 'bg-primary/10';
}
