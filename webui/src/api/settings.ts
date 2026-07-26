import { apiGet, apiPost } from './client';
import type { FloorDefinition } from '@/stores';

export interface WebUISettings {
  floors: FloorDefinition[];
  version: string;
}

/**
 * Get WebUI settings from backend
 */
export async function getWebUISettings(): Promise<WebUISettings> {
  return apiGet<WebUISettings>('/webui/settings');
}

/**
 * Update WebUI settings
 */
export async function updateWebUISettings(settings: WebUISettings): Promise<void> {
  await apiPost('/webui/settings', settings);
}

export interface ServiceStatus {
  uptimeSeconds: number;
  startedAt: string;
  nodeVersion: string;
  baseVersion: string;
}

/**
 * Backend service uptime and versions, shown in the settings version section.
 */
export async function getServiceStatus(): Promise<ServiceStatus> {
  return apiGet<ServiceStatus>('/webui/status');
}
