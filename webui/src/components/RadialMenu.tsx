import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  Info, Lightbulb, SunDim,
  PanelBottom, Square,
  Battery, Signal, Thermometer,
  Wind
} from 'lucide-react';
import type { Device } from '@/stores/dataStore';
import { DeviceCapability } from '@/components/DeviceIcon';

export interface RadialMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick: () => void;
}

export interface DeviceStatus {
  battery?: number;
  linkQuality?: number;
  temperature?: number;
  humidity?: number;
  brightness?: number;
  level?: number;
  isOn?: boolean;
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

export function RadialMenu({ items, isOpen, onClose, position, centerIcon, deviceStatus, deviceName }: RadialMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

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

  const radius = 70; // Distance from center to items
  const angleStep = (2 * Math.PI) / items.length;
  const startAngle = -Math.PI / 2; // Start from top

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
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
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
          
          {/* Status indicators */}
          {deviceStatus && (
            <div className="flex flex-wrap gap-1 justify-center text-[10px]">
              {deviceStatus.battery !== undefined && (
                <span className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
                  deviceStatus.battery < 20 ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                )}>
                  <Battery className="h-3 w-3" />
                  {deviceStatus.battery}%
                </span>
              )}
              {deviceStatus.linkQuality !== undefined && (
                <span className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
                  deviceStatus.linkQuality < 50 ? "bg-orange-500/20 text-orange-500" : "bg-blue-500/20 text-blue-500"
                )}>
                  <Signal className="h-3 w-3" />
                  {deviceStatus.linkQuality}%
                </span>
              )}
              {deviceStatus.temperature !== undefined && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500">
                  <Thermometer className="h-3 w-3" />
                  {deviceStatus.temperature.toFixed(1)}°
                </span>
              )}
              {deviceStatus.brightness !== undefined && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
                  <SunDim className="h-3 w-3" />
                  {deviceStatus.brightness}%
                </span>
              )}
              {deviceStatus.level !== undefined && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                  {deviceStatus.level}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Radial items */}
        {items.map((item, index) => {
          const angle = startAngle + index * angleStep;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={cn(
                "absolute left-1/2 top-1/2",
                "flex h-12 w-12 items-center justify-center rounded-full",
                "bg-card shadow-lg border-2",
                "transition-all duration-300 hover:scale-110",
                item.color ? `border-${item.color}` : "border-primary"
              )}
              style={{
                transform: animateIn 
                  ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` 
                  : 'translate(-50%, -50%)',
                opacity: animateIn ? 1 : 0,
                transitionDelay: `${index * 30}ms`,
                borderColor: item.color,
              }}
              title={item.label}
            >
              {item.icon}
            </button>
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
  
  // Temperature
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  if (temp !== undefined) status.temperature = temp;
  
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
  }
): RadialMenuItem[] {
  const caps = device.deviceCapabilities ?? [];
  const items: RadialMenuItem[] = [];
  
  // Info button always first (top position)
  items.push({
    id: 'details',
    icon: <Info className="h-5 w-5 text-blue-500" />,
    label: 'Details',
    color: '#3b82f6',
    onClick: handlers.onDetails,
  });
  
  // Lamp controls - same icon, different fill/color (like SwiftUI: lightbulb.fill vs lightbulb)
  // 100% = bright yellow filled, 50% = orange filled, 0% = gray outline only
  if (caps.includes(DeviceCapability.lamp) || caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp)) {
    const hasDimmer = caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp);
    
    // 100% - Bright lamp (yellow, filled) - like lightbulb.fill
    items.push({
      id: 'lamp-on',
      icon: <Lightbulb className="h-6 w-6 text-yellow-400 fill-yellow-400" />,
      label: hasDimmer ? '100%' : 'An',
      color: '#facc15',
      onClick: handlers.onLampOn ?? (() => {}),
    });
    
    // 50% - Dimmed lamp (orange, filled)
    if (hasDimmer && handlers.onLamp50) {
      items.push({
        id: 'lamp-50',
        icon: <Lightbulb className="h-6 w-6 text-orange-400 fill-orange-400" />,
        label: '50%',
        color: '#fb923c',
        onClick: handlers.onLamp50,
      });
    }
    
    // 0% - Off lamp (gray, no fill) - like lightbulb (outline)
    items.push({
      id: 'lamp-off',
      icon: <Lightbulb className="h-6 w-6 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onLampOff ?? (() => {}),
    });
  }
  
  // Shutter controls - same Square icon, different fill levels (like SwiftUI rectangle.inset.filled)
  // Open = outline only, 50% = half filled, Closed = fully filled
  else if (caps.includes(DeviceCapability.shutter)) {
    // Open (0%) - outline only, green
    items.push({
      id: 'shutter-up',
      icon: <Square className="h-6 w-6 text-green-500" />,
      label: 'Auf',
      color: '#22c55e',
      onClick: handlers.onShutterUp ?? (() => {}),
    });
    
    // 50% - half filled, orange
    items.push({
      id: 'shutter-50',
      icon: <PanelBottom className="h-6 w-6 text-orange-500 fill-orange-500/50" />,
      label: '50%',
      color: '#f97316',
      onClick: handlers.onShutter50 ?? (() => {}),
    });
    
    // Closed (100%) - fully filled, red/brown
    items.push({
      id: 'shutter-down',
      icon: <Square className="h-6 w-6 text-amber-700 fill-amber-700" />,
      label: 'Zu',
      color: '#b45309',
      onClick: handlers.onShutterDown ?? (() => {}),
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
      id: 'ac-on',
      icon: <Wind className={`h-5 w-5 ${windColorClass}`} />,
      label: powerLabel,
      color: powerColor,
      onClick: handlers.onAcOn ?? (() => {}),
    });
    
    items.push({
      id: 'ac-off',
      icon: <Wind className="h-5 w-5 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af', // gray
      onClick: handlers.onAcOff ?? (() => {}),
    });
  }
  
  // For other devices (sensors etc.), only info button
  
  return items;
}
