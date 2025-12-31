import { apiGet, apiGetNoResponse, apiPostNoResponse } from './client';
import type { Device } from '@/stores/dataStore';

export async function getDevices(): Promise<Record<string, Device>> {
  return apiGet<Record<string, Device>>('/devices');
}

export async function getDevice(deviceId: string): Promise<Device> {
  const encodedId = encodeURIComponent(deviceId);
  return apiGet<Device>(`/devices/${encodedId}`);
}

export async function setLamp(deviceId: string, state: boolean, duration?: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  const url = duration 
    ? `/lamps/${encodedId}/${state}/${duration}`
    : `/lamps/${encodedId}/${state}`;
  await apiGetNoResponse(url);
}

export async function setDimmer(
  deviceId: string, 
  state: boolean, 
  brightness?: number, 
  duration?: number
): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  let url = `/dimmer/${encodedId}/${state}`;
  if (brightness !== undefined) url += `/${brightness}`;
  if (duration !== undefined) url += `/${duration}`;
  await apiGetNoResponse(url);
}

export async function setShutter(deviceId: string, level: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiGetNoResponse(`/shutter/${encodedId}/${level}`);
}

export async function setActuator(deviceId: string, state: boolean, duration?: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  const url = duration 
    ? `/actuator/${encodedId}/${state}/${duration}`
    : `/actuator/${encodedId}/${state}`;
  await apiGetNoResponse(url);
}

export async function updateDeviceSettings(deviceId: string, settings: unknown): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiPostNoResponse(`/deviceSettings/${encodedId}`, { settings });
}

export async function setDevicePosition(deviceId: string, position: { x: number; y: number; z: number }): Promise<void> {
  await updateDeviceSettings(deviceId, { trilaterationRoomPosition: position });
}

export async function setLed(
  deviceId: string,
  state: boolean,
  brightness: number,
  color: string,
  duration?: number
): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  let url = `/led/${encodedId}/${state}/${brightness}/${encodeURIComponent(color)}`;
  if (duration !== undefined) url += `/${duration}`;
  await apiGetNoResponse(url);
}

export async function setAc(deviceId: string, power: boolean, mode?: number, temp?: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  let url = `/ac/${encodedId}/power/${power}`;
  if (mode !== undefined) url += `/${mode}`;
  if (temp !== undefined) url += `/${temp}`;
  await apiGetNoResponse(url);
}

export async function startScene(deviceId: string, timeout?: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  // Backend expects timeout parameter (matching Swift app behavior):
  // - timeout = 0: no automatic end (scene runs until manually stopped)
  // - timeout > 0: automatic end after X ms
  const timeoutParam = timeout ?? 0;
  const url = `/scene/${encodedId}/start/${timeoutParam}`;
  await apiGetNoResponse(url);
}

export async function endScene(deviceId: string): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiGetNoResponse(`/scene/${encodedId}/end`);
}

export async function speakOnDevice(deviceId: string, message: string): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiPostNoResponse(`/speak/${encodedId}`, { message });
}

export async function blockAutomatic(deviceId: string, durationSeconds: number): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiGetNoResponse(`/device/${encodedId}/blockAutomatic/${durationSeconds}`);
}

export async function liftAutomaticBlock(deviceId: string): Promise<void> {
  const encodedId = encodeURIComponent(deviceId);
  await apiGetNoResponse(`/device/${encodedId}/liftAutomaticBlock`);
}

export interface TemperatureHistoryEntry {
  date: string;
  temperature: number;
}

export async function getTemperatureHistory(
  deviceId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<TemperatureHistoryEntry[]> {
  const encodedId = encodeURIComponent(deviceId);
  let url = `/temperature/${encodedId}/history`;
  if (startDate) {
    url += `/${startDate.getTime()}`;
    if (endDate) {
      url += `/${endDate.getTime()}`;
    }
  }
  return apiGet<TemperatureHistoryEntry[]>(url);
}
