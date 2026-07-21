import { apiGet, apiPost } from './client';
import type { CockpitData, CockpitConfig } from '@/types/cockpit';

export type { CockpitData, CockpitConfig };

export async function getCockpitData(): Promise<CockpitData> {
  return apiGet<CockpitData>('/cockpit/data');
}

export async function getCockpitConfig(): Promise<CockpitConfig> {
  return apiGet<CockpitConfig>('/cockpit/config');
}

export interface InboxEntry {
  id: string;
  ref?: string;
  kind: string;
  text: string;
  ts: string;
  by?: string;
}

export async function getCockpitInbox(): Promise<InboxEntry[]> {
  return apiGet<InboxEntry[]>('/cockpit/inbox');
}

export interface InboxPost {
  kind: 'note' | 'answer' | 'done' | 'new';
  ref?: string;
  text: string;
}

export async function postCockpitInbox(entry: InboxPost): Promise<{ success: boolean; id: string }> {
  return apiPost<{ success: boolean; id: string }>('/cockpit/inbox', entry);
}

export async function ackCockpitInbox(through_id: string): Promise<{ success: boolean; archived: number }> {
  return apiPost<{ success: boolean; archived: number }>('/cockpit/inbox/ack', { through_id });
}
