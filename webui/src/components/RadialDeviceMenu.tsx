import { Wind } from 'lucide-react';
import type { Device } from '@/stores';
import { isDeviceOn, hasCapability, DeviceCapability } from '@/stores/deviceStore';
import { setLamp, setActuator, setShutter, setAc, setDimmer, startScene, endScene } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';
import { DeviceIcon } from './DeviceIcon';
import { RadialMenu, getDeviceMenuItems } from './RadialMenu';

interface RadialDeviceMenuProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  deviceName?: string;
  onDetails: () => void;
}

/**
 * Wrapper around RadialMenu that accepts a Device object and generates menu items automatically.
 * Handles all device actions internally.
 */
export function RadialDeviceMenu({
  device,
  isOpen,
  onClose,
  position,
  deviceName,
  onDetails,
}: RadialDeviceMenuProps) {
  
  if (!device) return null;

  // Internal action handlers
  const handleLampOn = async () => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setLamp(id, true),
      () => {}
    );
  };

  const handleLampOff = async () => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setLamp(id, false),
      () => {}
    );
  };

  const handleLamp50 = async () => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setDimmer(id, true, 50),
      () => {}
    );
  };

  const handleShutterLevel = async (level: number) => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setShutter(id, level),
      () => {}
    );
  };

  const handleAcPower = async (power: boolean) => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setAc(id, power),
      () => {}
    );
  };

  const handleActuatorPower = async (power: boolean) => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => setActuator(id, power),
      () => {}
    );
  };

  const handleSceneStart = async () => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => startScene(id),
      () => {}
    );
  };

  const handleSceneEnd = async () => {
    onClose();
    await executeDeviceAction(
      device,
      (id) => endScene(id),
      () => {}
    );
  };

  const items = getDeviceMenuItems(device, {
    onDetails,
    onLampOn: handleLampOn,
    onLampOff: handleLampOff,
    onLamp50: handleLamp50,
    onShutterUp: () => handleShutterLevel(100),
    onShutter50: () => handleShutterLevel(50),
    onShutterDown: () => handleShutterLevel(0),
    onAcOn: () => handleAcPower(true),
    onAcOff: () => handleAcPower(false),
    onActuatorOn: () => handleActuatorPower(true),
    onActuatorOff: () => handleActuatorPower(false),
    onSceneStart: handleSceneStart,
    onSceneEnd: handleSceneEnd,
  });

  // Generate center icon based on device type
  const centerIcon = (() => {
    // For AC devices, always show Wind icon (colored by mode)
    if (hasCapability(device, DeviceCapability.ac)) {
      const acMode = (device as Record<string, unknown>)._acMode as number | undefined;
      const currentMonth = new Date().getMonth();
      const isSummerSeason = currentMonth >= 4 && currentMonth <= 9;
      const isCooling = acMode === 1 || (acMode === 0 && isSummerSeason);
      const isHeating = acMode === 4 || (acMode === 0 && !isSummerSeason);
      const isOn = isDeviceOn(device);
      
      const windColorClass = !isOn ? 'text-gray-400' : isHeating ? 'text-red-500' : isCooling ? 'text-blue-500' : 'text-green-500';
      return <Wind className={`h-8 w-8 ${windColorClass}`} />;
    }
    
    // For other devices, use DeviceIcon
    return <DeviceIcon device={device} size="md" />;
  })();

  return (
    <RadialMenu
      items={items}
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      centerIcon={centerIcon}
      deviceName={deviceName}
    />
  );
}
