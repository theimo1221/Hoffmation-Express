import type { Device } from '@/stores';
import {
  DeviceCapability,
  getDeviceTemperature,
  getDeviceDesiredTemp,
  getDeviceBrightness,
  getDeviceShutterLevel,
  isDeviceOn,
  getDeviceDetectionsToday,
  isMotionDetected,
  getDeviceBattery,
  getDeviceLinkQuality,
  getAcMode,
} from '@/stores/deviceStore';
import {
  Info,
  Lightbulb,
  Square,
  Battery,
  Signal,
  Thermometer,
  Wind,
  Activity,
  Droplets,
  Flame,
  Snowflake,
  Zap,
  ZapOff,
  Play,
  Square as StopIcon,
} from 'lucide-react';

export interface RadialMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  color?: string;
  onClick?: () => void;
  isInfo?: boolean;
  clockPosition?: number;
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
  desiredTemp?: number;
}

export function getDeviceStatus(device: Device): DeviceStatus {
  const caps = device.deviceCapabilities ?? [];
  const status: DeviceStatus = {};

  const batteryVal = getDeviceBattery(device);
  if (batteryVal !== undefined && batteryVal >= 0) status.battery = Math.round(batteryVal);

  let lq = getDeviceLinkQuality(device);
  if (lq !== undefined) {
    if (lq > 100) lq = Math.round((lq / 255) * 100);
    status.linkQuality = lq;
  }

  const temp = getDeviceTemperature(device);
  if (temp !== undefined && temp !== -99) status.temperature = temp;

  const desiredTemp = getDeviceDesiredTemp(device);
  if (typeof desiredTemp === 'number' && desiredTemp !== -99) status.desiredTemp = desiredTemp;

  const brightness = getDeviceBrightness(device);
  if (brightness !== undefined && (caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp))) {
    status.brightness = Math.round(brightness);
  }

  let level = getDeviceShutterLevel(device);
  if (level !== undefined && caps.includes(DeviceCapability.shutter)) {
    if (level >= 0 && level <= 1) level = level * 100;
    status.level = Math.round(level);
  }

  status.isOn = isDeviceOn(device);

  if (caps.includes(DeviceCapability.motionSensor)) {
    const detectionsToday = getDeviceDetectionsToday(device);
    if (detectionsToday !== undefined && detectionsToday >= 0) {
      status.detectionsToday = detectionsToday;
    }
    status.movementDetected = isMotionDetected(device);
  }

  return status;
}

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
  },
): RadialMenuItem[] {
  const caps = device.deviceCapabilities ?? [];
  const items: RadialMenuItem[] = [];

  items.push({
    id: 'details',
    icon: <Info className="h-5 w-5 text-blue-500" />,
    label: 'Details',
    color: '#3b82f6',
    onClick: handlers.onDetails,
    clockPosition: 6,
  });

  if (caps.includes(DeviceCapability.lamp) || caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp)) {
    const hasDimmer = caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp);

    items.push({
      id: 'lamp-off',
      icon: <Lightbulb className="h-6 w-6 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onLampOff ?? (() => {}),
      clockPosition: 10,
    });

    if (hasDimmer && handlers.onLamp50) {
      items.push({
        id: 'lamp-50',
        icon: <Lightbulb className="h-6 w-6 text-orange-400 fill-orange-400" />,
        label: '50%',
        color: '#fb923c',
        onClick: handlers.onLamp50,
        clockPosition: 12,
      });
    }

    items.push({
      id: 'lamp-on',
      icon: <Lightbulb className="h-6 w-6 text-yellow-400 fill-yellow-400" />,
      label: hasDimmer ? '100%' : 'An',
      color: '#facc15',
      onClick: handlers.onLampOn ?? (() => {}),
      clockPosition: 2,
    });
  } else if (caps.includes(DeviceCapability.shutter)) {
    items.push({
      id: 'shutter-down',
      icon: <Square className="h-6 w-6 text-green-500 fill-green-500" />,
      label: 'Zu',
      color: '#22c55e',
      onClick: handlers.onShutterDown ?? (() => {}),
      clockPosition: 10,
    });

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
      clockPosition: 12,
    });

    items.push({
      id: 'shutter-up',
      icon: <Square className="h-6 w-6 text-gray-400" />,
      label: 'Auf',
      color: '#9ca3af',
      onClick: handlers.onShutterUp ?? (() => {}),
      clockPosition: 2,
    });
  } else if (caps.includes(DeviceCapability.actuator)) {
    items.push({
      id: 'actuator-off',
      icon: <ZapOff className="h-5 w-5 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onActuatorOff ?? (() => {}),
      clockPosition: 10,
    });

    items.push({
      id: 'actuator-on',
      icon: <Zap className="h-5 w-5 text-green-500" />,
      label: 'An',
      color: '#22c55e',
      onClick: handlers.onActuatorOn ?? (() => {}),
      clockPosition: 2,
    });
  } else if (caps.includes(DeviceCapability.scene)) {
    items.push({
      id: 'scene-stop',
      icon: <StopIcon className="h-5 w-5 text-gray-400" />,
      label: 'Stop',
      color: '#9ca3af',
      onClick: handlers.onSceneEnd ?? (() => {}),
      clockPosition: 10,
    });

    items.push({
      id: 'scene-start',
      icon: <Play className="h-5 w-5 text-green-500" />,
      label: 'Start',
      color: '#22c55e',
      onClick: handlers.onSceneStart ?? (() => {}),
      clockPosition: 2,
    });
  } else if (caps.includes(DeviceCapability.ac)) {
    const acMode = getAcMode(device);
    const currentMonth = new Date().getMonth();
    const isSummerSeason = currentMonth >= 4 && currentMonth <= 9;
    const isCooling = acMode === 1 || (acMode === 0 && isSummerSeason);
    const isHeating = acMode === 4 || (acMode === 0 && !isSummerSeason);
    const windColorClass = isHeating ? 'text-red-500' : isCooling ? 'text-blue-500' : 'text-green-500';
    const powerColor = isHeating ? '#ef4444' : isCooling ? '#3b82f6' : '#22c55e';
    const powerLabel = isHeating ? 'Heizen' : isCooling ? 'Kühlen' : 'An';

    items.push({
      id: 'ac-off',
      icon: <Wind className="h-5 w-5 text-gray-400" />,
      label: 'Aus',
      color: '#9ca3af',
      onClick: handlers.onAcOff ?? (() => {}),
      clockPosition: 10.5,
    });

    items.push({
      id: 'ac-on',
      icon: <Wind className={`h-5 w-5 ${windColorClass}`} />,
      label: powerLabel,
      color: powerColor,
      onClick: handlers.onAcOn ?? (() => {}),
      clockPosition: 1.5,
    });
  }

  const status = getDeviceStatus(device);

  if (caps.includes(DeviceCapability.heater) && status.temperature !== undefined) {
    items.push({
      id: 'heater-temp',
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      label: `${status.temperature.toFixed(1)}°C`,
      color: '#f97316',
      isInfo: true,
      clockPosition: 9,
    });
  }

  if (caps.includes(DeviceCapability.ac)) {
    const acMode = getAcMode(device);
    const currentMonth = new Date().getMonth();
    const isSummerSeason = currentMonth >= 4 && currentMonth <= 9;
    const isCooling = acMode === 1 || (acMode === 0 && isSummerSeason);
    const tempToShow = status.desiredTemp ?? status.temperature;

    if (tempToShow !== undefined) {
      const tempIcon = isCooling ? <Snowflake className="h-5 w-5 text-blue-500" /> : <Flame className="h-5 w-5 text-red-500" />;
      const tempColor = isCooling ? '#3b82f6' : '#ef4444';

      items.push({
        id: 'ac-target-temp',
        icon: tempIcon,
        label: `${tempToShow.toFixed(1)}°C`,
        color: tempColor,
        isInfo: true,
        clockPosition: 9,
      });
    }
  }

  if (status.temperature !== undefined) {
    items.push({
      id: 'temp',
      icon: <Thermometer className="h-5 w-5 text-blue-500" />,
      label: `${status.temperature.toFixed(1)}°C`,
      color: '#3b82f6',
      isInfo: true,
      clockPosition: 4,
    });
  }

  if (status.detectionsToday !== undefined) {
    items.push({
      id: 'detections',
      icon: <Activity className={`h-5 w-5 ${status.movementDetected ? 'text-green-500' : 'text-gray-400'}`} />,
      label: `${status.detectionsToday}x`,
      color: status.movementDetected ? '#22c55e' : '#9ca3af',
      isInfo: true,
      clockPosition: 5,
    });
  }

  if (status.humidity !== undefined) {
    items.push({
      id: 'humidity',
      icon: <Droplets className="h-5 w-5 text-blue-400" />,
      label: `${status.humidity.toFixed(0)}%`,
      color: '#60a5fa',
      isInfo: true,
      clockPosition: status.detectionsToday !== undefined ? 4.5 : 5,
    });
  }

  if (status.battery !== undefined) {
    const batteryColor = status.battery < 20 ? '#ef4444' : status.battery < 50 ? '#f97316' : '#22c55e';
    const batteryClass = status.battery < 20 ? 'text-red-500' : status.battery < 50 ? 'text-orange-500' : 'text-green-500';
    items.push({
      id: 'battery',
      icon: <Battery className={`h-5 w-5 ${batteryClass}`} />,
      label: `${status.battery}%`,
      color: batteryColor,
      isInfo: true,
      clockPosition: 7,
    });
  }

  if (status.linkQuality !== undefined) {
    const lqColor = status.linkQuality < 30 ? '#ef4444' : status.linkQuality < 60 ? '#f97316' : '#22c55e';
    const lqClass = status.linkQuality < 30 ? 'text-red-500' : status.linkQuality < 60 ? 'text-orange-500' : 'text-green-500';
    items.push({
      id: 'link-quality',
      icon: <Signal className={`h-5 w-5 ${lqClass}`} />,
      label: `${status.linkQuality}%`,
      color: lqColor,
      isInfo: true,
      clockPosition: 8,
    });
  }

  return items;
}
