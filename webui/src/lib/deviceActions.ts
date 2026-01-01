/**
 * Centralized device action functions
 * Handles device state changes with proper delays and refresh logic
 */

import type { Device } from '@/stores';
import { isDeviceOn, isAcOn } from '@/stores';
import { isToggleableDevice } from '@/stores/deviceStore';
import { setLamp, setActuator, setShutter, setAc, startScene, endScene } from '@/api/devices';

export const REFRESH_DELAY_MS = 300;
export const REFRESH_DELAY_AC_MS = 500; // AC/Shutter need longer delay

/**
 * Generic action wrapper that handles:
 * - Device ID validation
 * - Loading state management
 * - API call execution
 * - Delay and refresh
 * - Error handling
 * 
 * @example
 * const handleToggle = async () => {
 *   await executeDeviceAction(
 *     device,
 *     async (id) => await setLamp(id, !isOn),
 *     onUpdate,
 *     setIsLoading
 *   );
 * };
 */
export async function executeDeviceAction(
  device: Device,
  action: (deviceId: string) => Promise<void>,
  onUpdate: () => Promise<void>,
  setIsLoading: (loading: boolean) => void,
  delayMs: number = REFRESH_DELAY_MS
): Promise<void> {
  if (!device.id) return;
  
  setIsLoading(true);
  try {
    await action(device.id);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await onUpdate();
  } catch (e) {
    console.error('Device action failed:', e);
  } finally {
    setIsLoading(false);
  }
}

/**
 * Helper to calculate duration in milliseconds
 * @param minutes - Duration in minutes, 0 means no timeout (-1)
 */
export function calculateDuration(minutes: number): number {
  return minutes === 0 ? -1 : minutes * 60 * 1000;
}

/**
 * Toggle device state (on/off, open/closed)
 * Handles all toggleable device types (lamp, actuator, shutter, AC, scene)
 */
export async function toggleDevice(
  device: Device,
  onUpdate: () => Promise<void>,
  setIsLoading: (loading: boolean) => void
): Promise<void> {
  if (!isToggleableDevice(device)) return;
  
  // Get current states
  const currentState = isDeviceOn(device);
  const currentAcState = isAcOn(device);
  
  // Get shutter level for toggle logic
  const getShutterLevel = (device: Device) => {
    let level = device._currentLevel ?? -1;
    if (level >= 0 && level <= 1) level = level * 100;
    return level;
  };
  const currentLevel = getShutterLevel(device);
  
  await executeDeviceAction(
    device,
    (id) => {
      const caps = device.deviceCapabilities ?? [];
      
      // Lamp, Dimmer, LED
      if (caps.some(c => [8, 9, 18].includes(c))) {
        return setLamp(id, !currentState);
      }
      // Actuator
      if (caps.includes(1)) {
        return setActuator(id, !currentState);
      }
      // Shutter (toggle between open and closed)
      if (caps.includes(11)) {
        return setShutter(id, currentLevel < 50 ? 100 : 0);
      }
      // AC
      if (caps.includes(0)) {
        return setAc(id, !currentAcState);
      }
      // Scene
      if (caps.includes(13)) {
        return currentState ? endScene(id) : startScene(id);
      }
      return Promise.resolve();
    },
    onUpdate,
    setIsLoading
  );
}
