import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Info, Lightbulb,
  Square,
  Battery, Signal, Thermometer,
  Wind, Activity, Droplets, Flame, Snowflake,
  Zap, ZapOff, Play, Square as StopIcon
} from 'lucide-react';
import type { Device } from '@/stores';
import { DeviceCapability } from '@/components/DeviceIcon';

export interface RadialMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
  isInfo?: boolean; // Non-interactive info items
  clockPosition?: number; // Position in hours (0-12), e.g., 10 = 10 o'clock
}

export interface DeviceStatus {
  battery?: number;
  linkQuality?: number;
  temperature?: number;
  humidity?: number;
  brightness?: number;
  level?: number;
  isOn?: boolean;
  detectionsToday?: number;
  movementDetected?: boolean;
  desiredTemp?: number; // Target temperature for AC/Heater
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  centerIcon?: React.ReactNode;
  deviceStatus?: DeviceStatus;
  deviceName?: string;
}

export function RadialMenu({ items, isOpen, onClose, position, centerIcon, deviceName }: RadialMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after mount
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const radius = 150; // Distance from center to items (GTA-style, increased to reduce overlap)
  
  // Helper to convert clock position (hours) to radians
  // 12 o'clock = -π/2 (top), then clockwise
  const clockToRadians = (hours: number) => {
    return (hours / 12) * 2 * Math.PI - Math.PI / 2;
  };

  // On mobile devices (width < 768px), center the menu on screen
  // On desktop, clamp position to keep menu within screen bounds
  const isMobile = window.innerWidth < 768;
  const menuSize = radius * 2 + 120; // Approximate menu size (larger for labels)
  const padding = 20;
  
  let clampedX: number;
  let clampedY: number;
  
  if (isMobile) {
    // Center on screen for mobile
    clampedX = window.innerWidth / 2;
    clampedY = window.innerHeight / 2;
  } else {
    // Clamp to screen bounds for desktop
    clampedX = Math.max(menuSize / 2 + padding, Math.min(window.innerWidth - menuSize / 2 - padding, position.x));
    clampedY = Math.max(menuSize / 2 + padding, Math.min(window.innerHeight - menuSize / 2 - padding, position.y));
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200",
          animateIn ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Menu Container */}
      <div
        ref={menuRef}
        className="absolute"
        style={{
          left: clampedX,
          top: clampedY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer circle with hover sectors */}
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          width={radius * 2 + 200}
          height={radius * 2 + 200}
          style={{
            opacity: animateIn ? 1 : 0,
            transition: 'opacity 200ms',
          }}
        >
          {/* Base circle */}
          <circle
            cx={(radius * 2 + 200) / 2}
            cy={(radius * 2 + 200) / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border/30"
          />
          
          {/* Hover highlight sectors */}
          {items.map((item, index) => {
            // Only show hover for clickable items
            if (hoveredIndex !== index || item.isInfo || !item.onClick) return null;
            
            const angle = item.clockPosition !== undefined 
              ? clockToRadians(item.clockPosition)
              : clockToRadians((index / items.length) * 12);
            
            // Create arc path for sector
            const sectorAngle = Math.PI / 5; // 36 degrees (wider sector)
            const startAngle = angle - sectorAngle / 2;
            const endAngle = angle + sectorAngle / 2;
            
            const innerRadius = 60;
            const outerRadius = radius + 60; // Extended to cover label with more padding
            
            const centerX = (radius * 2 + 200) / 2;
            const centerY = (radius * 2 + 200) / 2;
            
            const x1 = Math.cos(startAngle) * innerRadius + centerX;
            const y1 = Math.sin(startAngle) * innerRadius + centerY;
            const x2 = Math.cos(startAngle) * outerRadius + centerX;
            const y2 = Math.sin(startAngle) * outerRadius + centerY;
            const x3 = Math.cos(endAngle) * outerRadius + centerX;
            const y3 = Math.sin(endAngle) * outerRadius + centerY;
            const x4 = Math.cos(endAngle) * innerRadius + centerX;
            const y4 = Math.sin(endAngle) * innerRadius + centerY;
            
            // Always use small arc (0) for sectors smaller than 180 degrees
            const largeArcFlag = 0;
            
            return (
              <path
                key={`sector-${item.id}`}
                d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`}
                fill={item.color || '#3b82f6'}
                fillOpacity="0.2"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
        {/* Center area with device icon and status */}
        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex flex-col items-center justify-center rounded-2xl",
            "bg-card shadow-lg border-2 border-border p-3",
            "transition-all duration-300",
            animateIn ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
          style={{ minWidth: '100px' }}
        >
          {/* Device Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            {centerIcon}
          </div>
          
          {/* Device Name */}
          {deviceName && (
            <div className="text-xs font-medium text-center mb-1 max-w-[90px] truncate">
              {deviceName}
            </div>
          )}
        </div>

        {/* Radial items */}
        {items.map((item, index) => {
          // Use clockPosition if specified, otherwise distribute evenly
          const angle = item.clockPosition !== undefined 
            ? clockToRadians(item.clockPosition)
            : clockToRadians((index / items.length) * 12);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={item.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => item.onClick && !item.isInfo ? setHoveredIndex(index) : null}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Icon circle */}
              <div
                onClick={item.onClick ? (e) => {
                  e.stopPropagation();
                  item.onClick!();
                } : undefined}
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200",
                  "bg-card shadow-lg border-2",
                  hoveredIndex === index && item.onClick && !item.isInfo ? "border-primary scale-110" : "border-border",
                  item.onClick && !item.isInfo ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-default",
                  animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}
                style={{
                  transitionDelay: `${index * 30}ms`,
                }}
              >
                {item.icon}
              </div>
              {/* Label below icon */}
              <div
                className={cn(
                  "mt-1 text-xs font-medium text-center whitespace-nowrap px-2 py-0.5 rounded",
                  "bg-card/90 shadow-sm transition-all duration-200",
                  animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}
                style={{
                  transitionDelay: `${index * 30 + 50}ms`,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to get device status from device object
export function getDeviceStatus(device: Device): DeviceStatus {
  const caps = device.deviceCapabilities ?? [];
  const status: DeviceStatus = {};
  
  // Battery
  const batteryVal = (device as Record<string, unknown>).battery ?? (device as Record<string, unknown>)._battery;
  if (typeof batteryVal === 'number') status.battery = Math.round(batteryVal);
  
  // Link Quality (normalize to 0-100)
  let lq = device._linkQuality;
  if (lq !== undefined) {
    if (lq > 100) lq = Math.round((lq / 255) * 100);
    status.linkQuality = lq;
  }
  
  // Temperature (check all possible sources - handles with temp sensors use temperatureSensor.temperature)
  const temp = device.temperatureSensor?.roomTemperature ?? 
               device.temperatureSensor?.temperature ?? 
               device._roomTemperature;
  if (temp !== undefined && temp !== -99) status.temperature = temp;
  
  // Desired temperature (for AC/Heater)
  const desiredTemp = (device as Record<string, unknown>).desiredTemp ?? (device as Record<string, unknown>)._desiredTemperatur;
  if (typeof desiredTemp === 'number' && desiredTemp !== -99) status.desiredTemp = desiredTemp;
  
  // Brightness (for dimmers/LEDs)
  const brightness = device.brightness ?? device._brightness;
  if (brightness !== undefined && (caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp))) {
    status.brightness = Math.round(brightness);
  }
  
  // Shutter level
  let level = device._currentLevel;
  if (level !== undefined && caps.includes(DeviceCapability.shutter)) {
    if (level >= 0 && level <= 1) level = level * 100;
    status.level = Math.round(level);
  }
  
  // Is on state
  status.isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
  
  // Motion detection (for motion sensors)
  if (caps.includes(DeviceCapability.motionSensor)) {
    const detectionsToday = device._detectionsToday ?? device.detectionsToday;
    if (detectionsToday !== undefined && detectionsToday >= 0) {
      status.detectionsToday = detectionsToday;
    }
    status.movementDetected = device.movementDetected ?? device._movementDetected ?? false;
  }
  
  return status;
}

// Generate menu items based on device type - consistent positions!
export function getDeviceMenuItems(
  device: Device,
  handlers: {
    onDetails: () => void;
    onLampOn?: () => void;
    onLampOff?: () => void;
    onLamp50?: () => void;
    onShutterUp?: () => void;
    onShutterDown?: () => void;
    onShutter50?: () => void;
    onAcOn?: () => void;
    onAcOff?: () => void;
    onActuatorOn?: () => void;
    onActuatorOff?: () => void;
    onSceneStart?: () => void;
    onSceneEnd?: () => void;
  }
): RadialMenuItem[] {
  const caps = device.deviceCapabilities ?? [];
  const items: RadialMenuItem[] = [];
  
  // Details button always at 6 o'clock (18h on analog clock)
  items.push({
    id: 'details',
    icon: <Info className="h-5 w-5 text-blue-500" />,
    label: 'Details',
    color: '#3b82f6',
    onClick: handlers.onDetails,
    clockPosition: 6, // 6 o'clock = bottom
  });
  
  // Lamp controls - same icon, different fill/color (like SwiftUI: lightbulb.fill vs lightbulb)
  // 100% = bright yellow filled, 50% = orange filled, 0% = gray outline only
  if (caps.includes(DeviceCapability.lamp) || caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp)) {
    const hasDimmer = caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp);
    
    // 0% - Off lamp (gray, no fill) - at 10 o'clock (left)
    items.push({
      id: 'lamp-off',
      icon: <Lightbulb className="h-6 w-6 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onLampOff ?? (() => {}),
      clockPosition: 10, // Actions: 10-14h (left to right: off, 50%, on)
    });
    
    // 50% - Dimmed lamp (orange, filled) - at 12 o'clock (top)
    if (hasDimmer && handlers.onLamp50) {
      items.push({
        id: 'lamp-50',
        icon: <Lightbulb className="h-6 w-6 text-orange-400 fill-orange-400" />,
        label: '50%',
        color: '#fb923c',
        onClick: handlers.onLamp50,
        clockPosition: 12, // Actions: 10-14h
      });
    }
    
    // 100% - Bright lamp (yellow, filled) - at 2 o'clock (right)
    items.push({
      id: 'lamp-on',
      icon: <Lightbulb className="h-6 w-6 text-yellow-400 fill-yellow-400" />,
      label: hasDimmer ? '100%' : 'An',
      color: '#facc15',
      onClick: handlers.onLampOn ?? (() => {}),
      clockPosition: 2, // Actions: 10-14h (left to right: off, 50%, on)
    });
  }
  
  // Shutter controls - same Square icon, different fill levels (like SwiftUI rectangle.inset.filled)
  // Open = outline only, 50% = half filled, Closed = fully filled
  else if (caps.includes(DeviceCapability.shutter)) {
    // Closed (100%) - fully filled, green (secure) - at 10 o'clock (left = down/closed)
    items.push({
      id: 'shutter-down',
      icon: <Square className="h-6 w-6 text-green-500 fill-green-500" />,
      label: 'Zu',
      color: '#22c55e',
      onClick: handlers.onShutterDown ?? (() => {}),
      clockPosition: 10, // Actions: 10-14h (left to right: closed, 50%, open)
    });
    
    // 50% - half filled, orange - at 12 o'clock (top)
    items.push({
      id: 'shutter-50',
      icon: (
        <div className="relative h-6 w-6">
          <Square className="h-6 w-6 text-orange-500" />
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-orange-500/60 rounded-b" />
        </div>
      ),
      label: '50%',
      color: '#f97316',
      onClick: handlers.onShutter50 ?? (() => {}),
      clockPosition: 12, // Actions: 10-14h
    });
    
    // Open (0%) - outline only, gray (insecure) - at 2 o'clock (right = up/open)
    items.push({
      id: 'shutter-up',
      icon: <Square className="h-6 w-6 text-gray-400" />,
      label: 'Auf',
      color: '#9ca3af',
      onClick: handlers.onShutterUp ?? (() => {}),
      clockPosition: 2, // Actions: 10-14h (left to right: closed, 50%, open)
    });
  }
  
  // Actuator controls (outlets/switches) - Zap icon
  else if (caps.includes(DeviceCapability.actuator)) {
    items.push({
      id: 'actuator-off',
      icon: <ZapOff className="h-5 w-5 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onActuatorOff ?? (() => {}),
      clockPosition: 10, // Actions: 10-14h (left = off)
    });
    
    items.push({
      id: 'actuator-on',
      icon: <Zap className="h-5 w-5 text-green-500" />,
      label: 'An',
      color: '#22c55e',
      onClick: handlers.onActuatorOn ?? (() => {}),
      clockPosition: 2, // Actions: 10-14h (right = on)
    });
  }
  
  // Scene controls - Play/Stop icons
  else if (caps.includes(DeviceCapability.scene)) {
    items.push({
      id: 'scene-stop',
      icon: <StopIcon className="h-5 w-5 text-gray-400" />,
      label: 'Stop',
      color: '#9ca3af',
      onClick: handlers.onSceneEnd ?? (() => {}),
      clockPosition: 10, // Actions: 10-14h (left = stop)
    });
    
    items.push({
      id: 'scene-start',
      icon: <Play className="h-5 w-5 text-green-500" />,
      label: 'Start',
      color: '#22c55e',
      onClick: handlers.onSceneStart ?? (() => {}),
      clockPosition: 2, // Actions: 10-14h (right = start)
    });
  }
  
  // AC controls - Wind icon with mode-dependent colors
  else if (caps.includes(DeviceCapability.ac)) {
    // Determine current mode and seasonal default
    const acMode = (device as Record<string, unknown>)._acMode as number | undefined;
    const currentMonth = new Date().getMonth(); // 0-11
    const isSummerSeason = currentMonth >= 4 && currentMonth <= 9; // May-October = cooling
    
    // Mode: 0=Auto, 1=Cool, 2=Dry, 3=Fan, 4=Heat (typical AC modes)
    const isCooling = acMode === 1 || (acMode === 0 && isSummerSeason);
    const isHeating = acMode === 4 || (acMode === 0 && !isSummerSeason);
    
    // Wind icon with mode-appropriate color: red=heating, blue=cooling, green=auto/fan
    const windColorClass = isHeating ? 'text-red-500' : isCooling ? 'text-blue-500' : 'text-green-500';
    const powerColor = isHeating ? '#ef4444' : isCooling ? '#3b82f6' : '#22c55e';
    const powerLabel = isHeating ? 'Heizen' : isCooling ? 'Kühlen' : 'An';
    
    items.push({
      id: 'ac-off',
      icon: <Wind className="h-5 w-5 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af', // gray
      onClick: handlers.onAcOff ?? (() => {}),
      clockPosition: 10.5, // Actions: 10:30 (left = off)
    });
    
    items.push({
      id: 'ac-on',
      icon: <Wind className={`h-5 w-5 ${windColorClass}`} />,
      label: powerLabel,
      color: powerColor,
      onClick: handlers.onAcOn ?? (() => {}),
      clockPosition: 1.5, // Actions: 13:30 (right = on)
    });
  }
  
  // Add status info items for all devices
  const status = getDeviceStatus(device);
  
  // Heater temperature - at 9 o'clock (left side)
  if (caps.includes(DeviceCapability.heater) && status.temperature !== undefined) {
    items.push({
      id: 'heater-temp',
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      label: `${status.temperature.toFixed(1)}°C`,
      color: '#f97316',
      isInfo: true,
      clockPosition: 9, // 9 o'clock = left side
    });
  }
  
  // AC target temperature - at 9 o'clock (left side) for heating/cooling devices
  if (caps.includes(DeviceCapability.ac)) {
    const acMode = (device as Record<string, unknown>)._acMode as number | undefined;
    const currentMonth = new Date().getMonth();
    const isSummerSeason = currentMonth >= 4 && currentMonth <= 9;
    const isCooling = acMode === 1 || (acMode === 0 && isSummerSeason);
    
    // Use desiredTemp if available, otherwise use temperature
    const tempToShow = status.desiredTemp ?? status.temperature;
    
    if (tempToShow !== undefined) {
      // Icon based on mode: Snowflake for cooling, Flame for heating
      // Default to heating in winter (December = month 11)
      const tempIcon = isCooling 
        ? <Snowflake className="h-5 w-5 text-blue-500" />
        : <Flame className="h-5 w-5 text-red-500" />; // Default to flame (heating)
      const tempColor = isCooling ? '#3b82f6' : '#ef4444'; // Default to red (heating)
      
      items.push({
        id: 'ac-target-temp',
        icon: tempIcon,
        label: `${tempToShow.toFixed(1)}°C`,
        color: tempColor,
        isInfo: true,
        clockPosition: 9, // 9 o'clock = left side
      });
    }
  }
  
  // Room temperature - at 4 o'clock (16h) for all devices with temperature
  // Show for all devices that have temperature (AC, Heater, Sensors)
  if (status.temperature !== undefined) {
    items.push({
      id: 'temp',
      icon: <Thermometer className="h-5 w-5 text-blue-500" />,
      label: `${status.temperature.toFixed(1)}°C`,
      color: '#3b82f6',
      isInfo: true,
      clockPosition: 4, // Info: 16-20h
    });
  }
  
  // Motion detections today - at 5 o'clock (17h)
  if (status.detectionsToday !== undefined) {
    items.push({
      id: 'detections',
      icon: <Activity className={`h-5 w-5 ${status.movementDetected ? 'text-green-500' : 'text-gray-400'}`} />,
      label: `${status.detectionsToday}x`,
      color: status.movementDetected ? '#22c55e' : '#9ca3af',
      isInfo: true,
      clockPosition: 5, // Info: 16-20h
    });
  }
  
  // Humidity - at 6 o'clock (18h) - moved from 5h to make room
  if (status.humidity !== undefined) {
    items.push({
      id: 'humidity',
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
      label: `${Math.round(status.humidity)}%`,
      color: '#3b82f6',
      isInfo: true,
      clockPosition: 5, // Info: 16-20h (17h)
    });
  }
  
  // Battery - at 7 o'clock (19h)
  if (status.battery !== undefined) {
    const batteryColor = status.battery < 20 ? '#ef4444' : status.battery < 50 ? '#f97316' : '#22c55e';
    const batteryClass = status.battery < 20 ? 'text-red-500' : status.battery < 50 ? 'text-orange-500' : 'text-green-500';
    items.push({
      id: 'battery',
      icon: <Battery className={`h-5 w-5 ${batteryClass}`} />,
      label: `${status.battery}%`,
      color: batteryColor,
      isInfo: true,
      clockPosition: 7, // Info: 16-20h
    });
  }
  
  // Link Quality - at 8 o'clock (20h)
  if (status.linkQuality !== undefined) {
    const lqColor = status.linkQuality < 30 ? '#ef4444' : status.linkQuality < 60 ? '#f97316' : '#22c55e';
    const lqClass = status.linkQuality < 30 ? 'text-red-500' : status.linkQuality < 60 ? 'text-orange-500' : 'text-green-500';
    items.push({
      id: 'link-quality',
      icon: <Signal className={`h-5 w-5 ${lqClass}`} />,
      label: `${status.linkQuality}%`,
      color: lqColor,
      isInfo: true,
      clockPosition: 8, // Info: 16-20h
    });
  }
  
  // Humidity - at 5 o'clock (17h) if no detections, otherwise 4.5
  if (status.humidity !== undefined) {
    items.push({
      id: 'humidity',
      icon: <Droplets className="h-5 w-5 text-blue-400" />,
      label: `${status.humidity.toFixed(0)}%`,
      color: '#60a5fa',
      isInfo: true,
      clockPosition: status.detectionsToday !== undefined ? 4.5 : 5, // Info: 16-20h
    });
  }
  
  return items;
}
