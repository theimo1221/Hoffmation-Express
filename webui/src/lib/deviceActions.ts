/**
 * Centralized device action functions
 * Handles device state changes with proper delays and refresh logic
 */

import type { Device } from '@/stores';
import { isDeviceOn, isAcOn, useDataStore } from '@/stores';
import { isToggleableDevice, isLampDevice, isActuatorDevice, isShutterDevice, isAcDevice, isSceneDevice, getDeviceBrightness, getDeviceColor, DeviceCapability } from '@/stores/deviceStore';
import { setLamp, setDimmer, setLed, setActuator, setShutter, setAc, startScene, endScene } from '@/api/devices';

export const REFRESH_DELAY_MS = 800; // Increased for Zigbee devices (was 300ms)
export const REFRESH_DELAY_AC_MS = 1000; // AC/Shutter need longer delay

/**
 * Generic action wrapper that handles:
 * - Device ID validation
 * - Loading state management
 * - API call execution
 * - Delay and automatic device refresh
 * - Error handling
 * 
 * @example
 * const handleToggle = async () => {
 *   await executeDeviceAction(
 *     device,
 *     async (id) => await setLamp(id, !isOn),
 *     setIsLoading
 *   );
 * };
 */
export async function executeDeviceAction(
  device: Device,
  action: (deviceId: string) => Promise<void>,
  setIsLoading: (loading: boolean) => void,
  delayMs: number = REFRESH_DELAY_MS
): Promise<void> {
  if (!device.id) return;
  
  setIsLoading(true);
  try {
    await action(device.id);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await useDataStore.getState().fetchDevice(device.id);
  } catch (e) {
    console.error('Device action failed:', e);
  } finally {
    setIsLoading(false);
  }
}

/**
 * Helper to calculate duration in milliseconds.
 * 0 maps to 24 h — backend interprets -1 as "no block" (automation reverts immediately).
 */
export function calculateDuration(minutes: number): number {
  return minutes === 0 ? 24 * 60 * 60 * 1000 : minutes * 60 * 1000;
}

/**
 * Toggle device state (on/off, open/closed)
 * Handles all toggleable device types (lamp, actuator, shutter, AC, scene)
 */
export async function toggleDevice(
  device: Device,
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
      // Lamp, Dimmer, LED
      if (isLampDevice(device)) {
        const caps = device.deviceCapabilities ?? [];
        const hasLedCap = caps.includes(DeviceCapability.ledLamp);      // 18
        const hasDimmerCap = caps.includes(DeviceCapability.dimmableLamp); // 9
        if (hasLedCap && !hasDimmerCap) {
          // Pure LED device: backend route is /led/:id/:state/:brightness/:color
          const brightness = Math.max(1, getDeviceBrightness(device) === -1 ? 100 : getDeviceBrightness(device));
          const color = getDeviceColor(device) ?? '#FFFFFF';
          return setLed(id, !currentState, brightness, color);
        } else if (hasDimmerCap) {
          return setDimmer(id, !currentState);
        } else {
          return setLamp(id, !currentState);
        }
      }
      // Actuator
      if (isActuatorDevice(device)) {
        return setActuator(id, !currentState);
      }
      // Shutter (toggle between open and closed)
      if (isShutterDevice(device)) {
        return setShutter(id, currentLevel > 0 ? 0 : 100);
      }
      // AC
      if (isAcDevice(device)) {
        return setAc(id, !currentAcState);
      }
      // Scene
      if (isSceneDevice(device)) {
        return currentState ? endScene(id) : startScene(id);
      }
      return Promise.resolve();
    },
    setIsLoading
  );
}
