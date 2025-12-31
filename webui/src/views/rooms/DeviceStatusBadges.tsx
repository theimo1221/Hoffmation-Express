import type { Device } from '@/stores/dataStore';
import { isDeviceUnreachable, DeviceCapability, hasCapability, getDeviceTemperature, getDeviceHandlePosition, isMotionDetected, getDeviceDetectionsToday, getDeviceValveLevel, getDeviceBrightness, getDeviceShutterLevel, isDeviceOn } from '@/stores/dataStore';

interface DeviceStatusBadgesProps {
  device: Device;
}

export function DeviceStatusBadges({ device }: DeviceStatusBadgesProps) {
  const badges: React.ReactNode[] = [];

  // Unreachable indicator (highest priority) - use central function
  if (isDeviceUnreachable(device)) {
    badges.push(
      <span key="unreachable" className="text-xs font-bold text-red-500">
        OFFLINE
      </span>
    );
  }

  // Battery level (show if device has battery capability or batteryLevel property)
  const batteryLevel = device.battery?.level ?? device.batteryLevel;
  if (hasCapability(device, DeviceCapability.batteryDriven) || batteryLevel !== undefined) {
    if (batteryLevel !== undefined && batteryLevel >= 0) {
      const batteryColor = batteryLevel < 20 ? 'text-red-500' : batteryLevel < 50 ? 'text-orange-500' : 'text-green-500';
      badges.push(
        <span key="battery" className={`text-xs ${batteryColor}`}>
          🔋 {batteryLevel}%
        </span>
      );
    }
  }

  // Window handle sensor: show position (priority over temp)
  if (hasCapability(device, DeviceCapability.handleSensor)) {
    const position = getDeviceHandlePosition(device);
    if (position >= 0) {
      const positionText = position === 0 ? 'Geschlossen' : position === 1 ? 'Gekippt' : 'Offen';
      const positionColor = position === 0 ? 'text-green-500' : position === 1 ? 'text-orange-500' : 'text-red-500';
      badges.push(
        <span key="handle" className={`text-xs ${positionColor}`}>
          {positionText}
        </span>
      );
    }
  }

  // Motion sensor: show active status and detections today
  if (hasCapability(device, DeviceCapability.motionSensor)) {
    const movementDetected = isMotionDetected(device);
    const detectionsToday = getDeviceDetectionsToday(device);
    
    if (movementDetected) {
      badges.push(
        <span key="motion-active" className="text-xs text-green-500 font-medium">
          Bewegung!
        </span>
      );
    }
    if (detectionsToday >= 0) {
      badges.push(
        <span key="motion" className="text-xs text-muted-foreground">
          {detectionsToday}x heute
        </span>
      );
    }
  }

  // Heater: show ist/soll temps and valve level
  if (hasCapability(device, DeviceCapability.heater)) {
    const istTemp = getDeviceTemperature(device);
    const sollTemp = device.desiredTemp ?? device._desiredTemperatur ?? -99;
    const valveLevel = getDeviceValveLevel(device);
    
    const parts: string[] = [];
    if (istTemp !== undefined) {
      parts.push(`${istTemp.toFixed(1)}°`);
    }
    if (sollTemp !== -99) {
      parts.push(`→${sollTemp.toFixed(1)}°`);
    }
    if (valveLevel >= 0 && valveLevel <= 100) {
      parts.push(`${Math.round(valveLevel)}%`);
    }
    
    if (parts.length > 0) {
      badges.push(
        <span key="heater" className="text-xs text-muted-foreground">
          {parts.join(' ')}
        </span>
      );
    }
  }

  // Temperature sensor (only if not a heater - heater already shows temp)
  if (hasCapability(device, DeviceCapability.temperatureSensor) && !hasCapability(device, DeviceCapability.heater) && !hasCapability(device, DeviceCapability.handleSensor)) {
    const temp = getDeviceTemperature(device);
    if (temp !== undefined) {
      badges.push(
        <span key="temp" className="text-xs text-muted-foreground">
          {temp.toFixed(1)}°C
        </span>
      );
    }
  }

  // Dimmable lamp: show brightness
  if (hasCapability(device, DeviceCapability.dimmableLamp) && !hasCapability(device, DeviceCapability.ledLamp)) {
    const brightness = getDeviceBrightness(device);
    const isOn = isDeviceOn(device);
    if (isOn) {
      badges.push(
        <span key="dimmer" className="text-xs text-green-500">
          {brightness >= 0 ? `${brightness}%` : 'An'}
        </span>
      );
    } else {
      badges.push(
        <span key="dimmer-off" className="text-xs text-gray-400">
          Aus
        </span>
      );
    }
  }

  // LED: show color and brightness
  if (hasCapability(device, DeviceCapability.ledLamp)) {
    const brightness = getDeviceBrightness(device);
    const color = device._color ?? '';
    const isOn = isDeviceOn(device);
    if (isOn) {
      badges.push(
        <span key="led" className="flex items-center gap-1 text-xs text-green-500">
          {color && (
            <span 
              className="inline-block w-3 h-3 rounded-full border border-border" 
              style={{ backgroundColor: color.startsWith('#') ? color : `#${color}` }}
            />
          )}
          {brightness >= 0 ? `${brightness}%` : 'An'}
        </span>
      );
    } else {
      badges.push(
        <span key="led-off" className="text-xs text-gray-400">
          Aus
        </span>
      );
    }
  }

  // Simple lamp: show on/off
  if (hasCapability(device, DeviceCapability.lamp) && !hasCapability(device, DeviceCapability.dimmableLamp) && !hasCapability(device, DeviceCapability.ledLamp)) {
    const isOn = isDeviceOn(device);
    badges.push(
      <span key="lamp" className={`text-xs ${isOn ? 'text-green-500' : 'text-gray-400'}`}>
        {isOn ? 'An' : 'Aus'}
      </span>
    );
  }

  // Shutter: show level (0-100 or 0-1 depending on device)
  if (hasCapability(device, DeviceCapability.shutter)) {
    const level = getDeviceShutterLevel(device);
    
    if (level >= 0 && level <= 100) {
      badges.push(
        <span key="shutter" className="text-xs text-muted-foreground">
          {Math.round(level)}%
        </span>
      );
    }
  }

  // Actuator (not lamp/dimmer/led): show on/off
  // Skip if device has any light capability - those are handled above
  if (hasCapability(device, DeviceCapability.actuator) && 
      !hasCapability(device, DeviceCapability.lamp) && 
      !hasCapability(device, DeviceCapability.dimmableLamp) && 
      !hasCapability(device, DeviceCapability.ledLamp)) {
    const isOn = isDeviceOn(device);
    badges.push(
      <span key="actuator" className={`text-xs ${isOn ? 'text-green-500' : 'text-gray-400'}`}>
        {isOn ? 'An' : 'Aus'}
      </span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-0.5">
      {badges}
    </div>
  );
}
