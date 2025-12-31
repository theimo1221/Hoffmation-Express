import { apiGet, apiPost } from './client';
import type { FloorDefinition } from '@/stores/dataStore';

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
