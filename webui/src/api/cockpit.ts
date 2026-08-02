import { apiGet, apiPost, apiPatch, apiDelete } from './client';
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
  /** Set once the entry's text has been amended; ts stays the original queue time. */
  edited_at?: string;
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

/**
 * Amend a queued entry's text. Only the text changes - kind and ref describe what
 * the entry is about, and the original queue time is kept.
 */
export async function updateCockpitInboxEntry(id: string, text: string): Promise<{ success: boolean; id: string }> {
  return apiPatch<{ success: boolean; id: string }>(`/cockpit/inbox/${encodeURIComponent(id)}`, { text });
}

/**
 * Drop a single queued entry. Unlike ack, which archives everything up to a
 * position, this removes one mistaken note without touching the rest.
 */
export async function deleteCockpitInboxEntry(id: string): Promise<{ success: boolean; id: string }> {
  return apiDelete<{ success: boolean; id: string }>(`/cockpit/inbox/${encodeURIComponent(id)}`);
}

export async function ackCockpitInbox(through_id: string): Promise<{ success: boolean; archived: number }> {
  return apiPost<{ success: boolean; archived: number }>('/cockpit/inbox/ack', { through_id });
}
