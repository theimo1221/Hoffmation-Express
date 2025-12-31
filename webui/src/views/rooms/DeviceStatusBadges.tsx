import type { Device } from '@/stores/dataStore';

interface DeviceStatusBadgesProps {
  device: Device;
}

export function DeviceStatusBadges({ device }: DeviceStatusBadgesProps) {
  const capabilities = device.deviceCapabilities ?? [];
  const badges: React.ReactNode[] = [];

  // Capability constants
  const CAP_MOTION_SENSOR = 10;
  const CAP_HEATER = 5;
  const CAP_DIMMABLE = 9;
  const CAP_LED = 18;
  const CAP_LAMP = 8;
  const CAP_SHUTTER = 11;
  const CAP_TEMP_SENSOR = 12;
  const CAP_ACTUATOR = 1;
  const CAP_HANDLE_SENSOR = 15;
  const CAP_BATTERY = 16;

  // Check if device is unreachable
  const isUnreachable = device.available === false || device._available === false;
  const lastUpdateRaw = device.lastUpdate ?? device._lastUpdate;
  let isStale = false;
  if (lastUpdateRaw) {
    const lastUpdateDate = new Date(lastUpdateRaw);
    const hoursSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
    isStale = hoursSinceUpdate > 1;
  }

  // Unreachable indicator (highest priority)
  if (isUnreachable || isStale) {
    badges.push(
      <span key="unreachable" className="text-xs font-bold text-red-500">
        OFFLINE
      </span>
    );
  }

  // Battery level (show if device has battery capability or batteryLevel property)
  const batteryLevel = device.battery?.level ?? device.batteryLevel;
  if (capabilities.includes(CAP_BATTERY) || batteryLevel !== undefined) {
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
  if (capabilities.includes(CAP_HANDLE_SENSOR)) {
    const position = device.handleSensor?.position ?? device.position ?? -1;
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
  if (capabilities.includes(CAP_MOTION_SENSOR)) {
    const movementDetected = device.movementDetected ?? device._movementDetected ?? false;
    const detectionsToday = device._detectionsToday ?? device.detectionsToday ?? -1;
    
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
  if (capabilities.includes(CAP_HEATER)) {
    const istTemp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
    const sollTemp = device.desiredTemp ?? device._desiredTemperatur ?? -99;
    const valveLevel = (device._level ?? -0.01) * 100;
    
    const parts: string[] = [];
    if (istTemp !== undefined && istTemp !== -99) {
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
  if (capabilities.includes(CAP_TEMP_SENSOR) && !capabilities.includes(CAP_HEATER) && !capabilities.includes(CAP_HANDLE_SENSOR)) {
    const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
    if (temp !== undefined && temp !== -99) {
      badges.push(
        <span key="temp" className="text-xs text-muted-foreground">
          {temp.toFixed(1)}°C
        </span>
      );
    }
  }

  // Dimmable lamp: show brightness
  if (capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED)) {
    const brightness = device.brightness ?? device._brightness ?? -1;
    const isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
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
  if (capabilities.includes(CAP_LED)) {
    const brightness = device.brightness ?? device._brightness ?? -1;
    const color = device._color ?? '';
    const isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
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
  if (capabilities.includes(CAP_LAMP) && !capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED)) {
    const isOn = device.lightOn ?? device._lightOn ?? false;
    badges.push(
      <span key="lamp" className={`text-xs ${isOn ? 'text-green-500' : 'text-gray-400'}`}>
        {isOn ? 'An' : 'Aus'}
      </span>
    );
  }

  // Shutter: show level (0-100 or 0-1 depending on device)
  if (capabilities.includes(CAP_SHUTTER)) {
    let level = device._currentLevel ?? -1;
    // Normalize level to 0-100 range
    if (level > 1 && level <= 100) {
      // Already in 0-100 range
    } else if (level >= 0 && level <= 1) {
      level = level * 100;
    } else {
      level = -1; // Invalid
    }
    
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
  if (capabilities.includes(CAP_ACTUATOR) && 
      !capabilities.includes(CAP_LAMP) && 
      !capabilities.includes(CAP_DIMMABLE) && 
      !capabilities.includes(CAP_LED)) {
    const isOn = device.actuatorOn ?? device._actuatorOn ?? false;
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
