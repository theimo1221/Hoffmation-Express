import { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Clock, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxEntry } from '@/api/cockpit';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import { DomainBadge } from './DomainBadge';
import {
  isOverdue, isDueToday, isGated, formatShortDate, parseBlockedByIds,
  applyFilters, sortItems,
  type QuickFilter, type TodoFilters, type SortKey,
} from './helpers';

const SORT_COLS: Array<{ key: SortKey | null; label: string }> = [
  { key: null, label: 'ID' },
  { key: 'status', label: 'St.' },
  { key: 'importance_rank', label: 'Wicht.' },
  { key: 'domain', label: 'Kat.' },
  { key: null, label: 'Projekt' },
  { key: null, label: 'Aktion' },
  { key: null, label: 'Beteiligte' },
  { key: 'due_key', label: 'Fällig' },
  { key: null, label: 'Ab' },
  { key: 'effort', label: 'Aufwand' },
  { key: 'created', label: 'Erstellt' },
  { key: 'touched', label: 'Zuletzt' },
];

function TodoRow({
  item,
  config,
  onItemClick,
  onQuickFilter,
  findItem,
  hasComment,
}: {
  item: CockpitItem;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
  onQuickFilter: (f: QuickFilter) => void;
  findItem: (id: string) => CockpitItem | undefined;
  hasComment?: boolean;
}) {
  const overdue = isOverdue(item);
  const today = isDueToday(item);
  const gated = isGated(item);

  const qf = (f: QuickFilter) => (e: React.MouseEvent) => { e.stopPropagation(); onQuickFilter(f); };

  const blockedByRaw = item.blocked_by?.raw ?? '';
  const blockedByIds = blockedByRaw ? parseBlockedByIds(blockedByRaw) : [];

  return (
    <tr className={cn('border-b border-border text-xs hover:bg-muted/30', gated && 'opacity-50')}>
      <td
        className="px-2 py-2 font-mono font-medium whitespace-nowrap cursor-pointer hover:text-primary"
        onClick={() => onItemClick(item)}
      >
        <span className="flex items-center gap-1">
          {item.id}
          {hasComment && <span title="Kommentiert"><MessageSquare className="h-2.5 w-2.5 text-orange-400 shrink-0" /></span>}
        </span>
      </td>
      <td className="px-1 py-2 text-center">{config.status[item.status]?.emoji ?? item.status}</td>
      <td className="px-1 py-2 text-center">{config.importance[item.importance]?.emoji ?? item.importance}</td>
      <td className="px-2 py-2">
        <DomainBadge domain={item.domain} config={config} onClick={qf({ domain: item.domain })} />
      </td>
      <td className="px-2 py-2 text-muted-foreground max-w-[80px] truncate">
        {item.project
          ? <span className="cursor-pointer hover:underline" onClick={qf({ project: item.project.key })}>{item.project.key.replace('project_', '')}</span>
          : '—'}
      </td>
      <td className="px-2 py-2 max-w-xs">
        <span>{item.title}</span>
        {item.tags.map((t) => (
          <span key={t} onClick={qf({ tag: t })} className="ml-1 inline-flex items-center rounded bg-muted px-1 py-0 text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/60">{t}</span>
        ))}
      </td>
      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
        {item.people.length > 0
          ? item.people.map((p, i) => (
              <span key={p.name}>
                {i > 0 && ', '}
                <span className="cursor-pointer hover:underline" onClick={qf({ person: p.name })}>{p.name}</span>
              </span>
            ))
          : '—'}
      </td>
      <td className={cn('px-2 py-2 whitespace-nowrap font-medium', overdue && 'text-red-500', today && 'text-amber-600')}>
        {formatShortDate(item.due_key)}
      </td>
      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
        {blockedByIds.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {blockedByIds.map((refId) => {
              const target = findItem(refId);
              return target ? (
                <button
                  key={refId}
                  onClick={() => onItemClick(target)}
                  className="font-mono text-primary underline underline-offset-2 hover:opacity-75"
                >
                  {refId}
                </button>
              ) : (
                <span key={refId} className="font-mono text-muted-foreground">{refId}</span>
              );
            })}
          </span>
        ) : (blockedByRaw || '—')}
      </td>
      <td className="px-2 py-2 text-muted-foreground max-w-[100px] truncate">{item.effort}</td>
      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{formatShortDate(item.created)}</td>
      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{formatShortDate(item.touched)}</td>
    </tr>
  );
}

function TodoCard({
  item,
  config,
  onItemClick,
  onQuickFilter,
  hasComment,
}: {
  item: CockpitItem;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
  onQuickFilter: (f: QuickFilter) => void;
  hasComment?: boolean;
}) {
  const overdue = isOverdue(item);
  const today = isDueToday(item);
  const qf = (f: QuickFilter) => (e: React.MouseEvent) => { e.stopPropagation(); onQuickFilter(f); };
  return (
    <div
      className={cn('rounded-2xl bg-card p-3 shadow-sm border border-border', isGated(item) && 'opacity-50')}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-primary" onClick={() => onItemClick(item)}>{item.id}</span>
        {hasComment && <span title="Kommentiert"><MessageSquare className="h-3 w-3 text-orange-400 shrink-0" /></span>}
        <DomainBadge domain={item.domain} config={config} onClick={qf({ domain: item.domain })} />
        <span>{config.status[item.status]?.emoji}</span>
        <span>{config.importance[item.importance]?.emoji}</span>
      </div>
      <p className="text-sm leading-snug">{item.title}</p>
      {item.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span key={t} onClick={qf({ tag: t })} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground cursor-pointer hover:bg-muted/60">{t}</span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {item.due_key !== '9999-99-99' && (
          <span className={cn('flex items-center gap-0.5', overdue && 'text-red-500', today && 'text-amber-600')}>
            <Clock className="h-3 w-3" />{formatShortDate(item.due_key)}
          </span>
        )}
        {item.people.length > 0 && (
          <span>
            {item.people.map((p, i) => (
              <span key={p.name}>
                {i > 0 && ', '}
                <span className="cursor-pointer hover:underline" onClick={qf({ person: p.name })}>{p.name}</span>
              </span>
            ))}
          </span>
        )}
        {item.effort && <span>{item.effort}</span>}
      </div>
    </div>
  );
}

export function TodosTab({
  data,
  config,
  onItemClick,
  initialFilters,
  inboxByRef,
}: {
  data: CockpitData;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
  initialFilters?: Partial<TodoFilters>;
  inboxByRef: Map<string, InboxEntry[]>;
}) {
  const [filters, setFilters] = useState<TodoFilters>(() => ({
    domain: '', status: '', importance: '', person: '', project: '', text: '', fokus: false, showGated: false, tags: [],
    ...initialFilters,
  }));
  const [sortBy, setSortBy] = useState<SortKey>('due_key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const allPeople = useMemo(() => {
    const s = new Set<string>();
    data.items.forEach((i) => i.people.forEach((p) => s.add(p.name)));
    return [...s].sort();
  }, [data.items]);

  const allProjects = useMemo(() => {
    const s = new Set<string>();
    data.items.forEach((i) => { if (i.project) s.add(i.project.key); });
    return [...s].sort();
  }, [data.items]);

  const findItem = useCallback((id: string) => data.items.find((i) => i.id === id), [data.items]);

  const filtered = useMemo(() => sortItems(applyFilters(data.items, filters), sortBy, sortDir), [data.items, filters, sortBy, sortDir]);

  const overdue = filtered.filter(isOverdue);
  const today = filtered.filter((i) => !isOverdue(i) && isDueToday(i));
  const rest = filtered.filter((i) => !isOverdue(i) && !isDueToday(i));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 700;
  const hasFilter = filters.domain || filters.status || filters.importance || filters.person || filters.project || filters.text || filters.tags.length > 0;

  const setF = (patch: Partial<TodoFilters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const handleQuickFilter = (f: QuickFilter) => {
    setFilters((prev) => ({
      ...prev,
      ...(f.domain !== undefined ? { domain: f.domain } : {}),
      ...(f.person !== undefined ? { person: f.person } : {}),
      ...(f.project !== undefined ? { project: f.project } : {}),
      ...(f.tag !== undefined ? { tags: prev.tags.includes(f.tag!) ? prev.tags : [...prev.tags, f.tag!] } : {}),
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="border-b border-border bg-background/95 px-3 py-2 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={filters.domain} onChange={(e) => setF({ domain: e.target.value })}>
            <option value="">Kategorie (alle)</option>
            {Object.entries(config.domain).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={filters.status} onChange={(e) => setF({ status: e.target.value })}>
            <option value="">Status (alle)</option>
            {Object.entries(config.status).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label_de}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={filters.importance} onChange={(e) => setF({ importance: e.target.value })}>
            <option value="">Wichtigkeit (alle)</option>
            {Object.entries(config.importance).sort(([, a], [, b]) => b.rank - a.rank).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label_de}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={filters.person} onChange={(e) => setF({ person: e.target.value })}>
            <option value="">Person (alle)</option>
            {allPeople.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={filters.project} onChange={(e) => setF({ project: e.target.value })}>
            <option value="">Projekt (alle)</option>
            {allProjects.map((p) => <option key={p} value={p}>{p.replace('project_', '')}</option>)}
          </select>
          <input
            type="text"
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs min-w-[120px]"
            placeholder="Suche..."
            value={filters.text}
            onChange={(e) => setF({ text: e.target.value })}
          />
          {hasFilter && (
            <button
              onClick={() => setFilters({ domain: '', status: '', importance: '', person: '', project: '', text: '', fokus: filters.fokus, showGated: filters.showGated, tags: [] })}
              className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              × Filter
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} von {data.items.length}</span>
        </div>
        {/* Fokus row */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={filters.fokus} onChange={(e) => setF({ fokus: e.target.checked })} className="h-3.5 w-3.5" />
            <span>🎯 Fokus: was kann ich <strong>jetzt</strong> tun?</span>
          </label>
          {filters.fokus && (
            <>
              {config.tags.map((t) => (
                <button key={t} onClick={() => setF({ tags: filters.tags.includes(t) ? filters.tags.filter((x) => x !== t) : [...filters.tags, t] })}
                  className={cn('rounded px-2 py-0.5 text-xs', filters.tags.includes(t) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {t}
                </button>
              ))}
              <label className="flex items-center gap-1 text-xs cursor-pointer ml-2">
                <input type="checkbox" checked={filters.showGated} onChange={(e) => setF({ showGated: e.target.checked })} className="h-3.5 w-3.5" />
                💤 Schlummernde
              </label>
            </>
          )}
        </div>
      </div>

      {/* Severity banners */}
      {overdue.length > 0 && (
        <div className="px-3 py-2 flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: '#A32D2D', color: 'white' }}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {overdue.length} überfällige{overdue.length === 1 ? 's' : ''} Item{overdue.length === 1 ? '' : 's'}
        </div>
      )}
      {today.length > 0 && (
        <div className="px-3 py-2 flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: '#854F0B', color: 'white' }}>
          <Clock className="h-5 w-5 shrink-0" />
          {today.length} heute fällig
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto">
        {isMobile ? (
          <div className="p-3 space-y-2">
            {[...overdue, ...today, ...rest].map((item) => (
              <TodoCard key={item.id} item={item} config={config} onItemClick={onItemClick} onQuickFilter={handleQuickFilter} hasComment={(inboxByRef.get(item.id)?.length ?? 0) > 0} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background/95 border-b border-border">
                <tr>
                  {SORT_COLS.map((col) => (
                    <th
                      key={col.label}
                      className={cn('px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap', col.key && 'cursor-pointer hover:text-foreground select-none')}
                      onClick={col.key ? () => handleSort(col.key!) : undefined}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        {col.key && sortBy === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3 shrink-0" />
                            : <ChevronDown className="h-3 w-3 shrink-0" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...overdue, ...today, ...rest].map((item) => (
                  <TodoRow key={item.id} item={item} config={config} onItemClick={onItemClick} onQuickFilter={handleQuickFilter} findItem={findItem} hasComment={(inboxByRef.get(item.id)?.length ?? 0) > 0} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Keine Items gefunden</div>
        )}
      </div>
    </div>
  );
}
