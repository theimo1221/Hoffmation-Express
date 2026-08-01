import { apiGet, apiPost, apiPatch } from './client';
import type { CockpitData, CockpitConfig } from '@/types/cockpit';

export type { CockpitData, CockpitConfig };

export async function getCockpitData(): Promise<CockpitData> {
  return apiGet<CockpitData>('/cockpit/data');
}

export async function getCockpitConfig(): Promise<CockpitConfig> {
  return apiGet<CockpitConfig>('/cockpit/config');
}

/**
 * The daily briefing. Markdown travels JSON-wrapped so it shares the snapshot
 * deploy path (scope, schema_version validation, atomic write) with the rest.
 */
export interface CockpitBriefing {
  schema_version: number;
  generated_at: string;
  markdown: string;
}

export async function getCockpitBriefing(): Promise<CockpitBriefing> {
  return apiGet<CockpitBriefing>('/cockpit/briefing');
}

/**
 * Write a new due date straight into cockpit-data.json and flag it as pending.
 *
 * The inbox entry is what the nightly acts on, but on its own the new date would
 * only appear after that run. This makes it visible immediately, on this device and
 * every other one. Always file the inbox entry too.
 */
export async function rescheduleCockpitItem(
  id: string,
  due: string | null,
): Promise<{ success: boolean; id: string; due: string | null }> {
  return apiPatch<{ success: boolean; id: string; due: string | null }>(
    `/cockpit/item/${encodeURIComponent(id)}/due`,
    { due },
  );
}

export interface InboxEntry {
  id: string;
  ref?: string;
  dq?: string;
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
  dq?: string;
}

export async function postCockpitInbox(entry: InboxPost): Promise<{ success: boolean; id: string }> {
  return apiPost<{ success: boolean; id: string }>('/cockpit/inbox', entry);
}

export async function ackCockpitInbox(through_id: string): Promise<{ success: boolean; archived: number }> {
  return apiPost<{ success: boolean; archived: number }>('/cockpit/inbox/ack', { through_id });
}
