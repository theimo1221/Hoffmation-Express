import { apiPost } from './client';

export interface WebUIUpdateResult {
  success: boolean;
  steps: { step: string; success: boolean; output?: string; error?: string }[];
  message?: string;
  error?: string;
}

export async function updateWebUI(): Promise<WebUIUpdateResult> {
  return apiPost<WebUIUpdateResult>('/webui/update', {});
}

export interface HoffmationRestartResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function restartHoffmation(): Promise<HoffmationRestartResult> {
  return apiPost<HoffmationRestartResult>('/hoffmation/restart', {});
}
