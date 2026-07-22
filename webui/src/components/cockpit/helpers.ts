import type { CockpitItem } from '@/types/cockpit';

export const TODAY = new Date().toISOString().slice(0, 10);

export const ITEM_ID_RE = /((?:G|H|P|Ph)-\d+[a-z]?)/g;

export const DOMAIN_FALLBACK_COLOR = '#6b7280';

export type QuickFilter = { domain?: string; person?: string; tag?: string; project?: string };

export type SortKey = 'due_key' | 'importance_rank' | 'created' | 'touched' | 'domain' | 'status' | 'effort';

export interface TodoFilters {
  domain: string;
  status: string;
  importance: string;
  persons: string[];
  project: string;
  text: string;
  fokus: boolean;
  showGated: boolean;
  tags: string[];
}

export function isOverdue(item: CockpitItem): boolean {
  return item.due_key !== '9999-99-99' && item.due_key < TODAY;
}

export function isDueToday(item: CockpitItem): boolean {
  return item.due_key === TODAY;
}

export function isGated(item: CockpitItem): boolean {
  if (item.status === 'wartet' || item.status === 'pausiert') return true;
  if (!item.blocked_by) return false;
  const g = item.blocked_by.gate_date;
  if (!g) return false;
  const normalized = g.length === 7 ? `${g}-01` : g.length === 6 ? `${g.slice(0, 4)}-${g.slice(4)}-01` : g;
  return normalized > TODAY;
}

export function formatShortDate(iso: string | null): string {
  if (!iso || iso === '9999-99-99') return '—';
  const d = iso.slice(0, 10).split('-');
  if (d.length < 3) return iso;
  return `${d[2]}.${d[1]}.${d[0]}`;
}

export function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function parseBlockedByIds(raw: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(ITEM_ID_RE.source, 'g');
  while ((m = re.exec(raw)) !== null) ids.push(m[1]);
  return ids;
}

export function applyFilters(items: CockpitItem[], f: TodoFilters): CockpitItem[] {
  return items.filter((item) => {
    if (f.domain && item.domain !== f.domain) return false;
    if (f.status && item.status !== f.status) return false;
    if (f.importance && item.importance !== f.importance) return false;
    if (f.persons.length > 0 && !item.people.some((p) => f.persons.includes(p.name))) return false;
    if (f.project && item.project?.key !== f.project) return false;
    if (f.text) {
      const q = f.text.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) return false;
    }
    if (f.tags.length > 0 && !f.tags.every((t) => item.tags.includes(t))) return false;
    if (f.fokus && isGated(item) && !f.showGated) return false;
    return true;
  });
}

function effortMinutes(e: string): number {
  const n = parseInt(e, 10);
  return isNaN(n) ? Infinity : n;
}

export function sortItems(items: CockpitItem[], sortBy: SortKey = 'due_key', sortDir: 'asc' | 'desc' = 'asc'): CockpitItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'importance_rank') {
      cmp = a.importance_rank - b.importance_rank;
    } else if (sortBy === 'effort') {
      cmp = effortMinutes(a.effort) - effortMinutes(b.effort);
    } else if (sortBy === 'due_key') {
      cmp = a.due_key < b.due_key ? -1 : a.due_key > b.due_key ? 1 : 0;
      if (cmp === 0) cmp = b.importance_rank - a.importance_rank;
    } else if (sortBy === 'created' || sortBy === 'touched') {
      const av = a[sortBy] ?? '';
      const bv = b[sortBy] ?? '';
      cmp = av < bv ? -1 : av > bv ? 1 : 0;
    } else {
      const av = a[sortBy] as string;
      const bv = b[sortBy] as string;
      cmp = av < bv ? -1 : av > bv ? 1 : 0;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}
