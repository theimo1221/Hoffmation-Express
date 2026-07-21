import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import { DomainBadge } from './DomainBadge';
import { isOverdue, isDueToday, formatShortDate, sortItems } from './helpers';

const KANBAN_COLUMNS: { id: string; label: string; statuses: string[] }[] = [
  { id: 'dringend', label: 'Dringend', statuses: ['dringend'] },
  { id: 'aktiv', label: 'In Arbeit', statuses: ['aktiv'] },
  { id: 'wartet', label: 'Wartet', statuses: ['wartet'] },
  { id: 'geplant', label: 'Geplant', statuses: ['geplant', 'pausiert'] },
];

export function KanbanTab({
  data,
  config,
  onItemClick,
}: {
  data: CockpitData;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
}) {
  const [domainFilter, setDomainFilter] = useState('');

  const filtered = useMemo(
    () => data.items.filter((i) => !domainFilter || i.domain === domainFilter),
    [data.items, domainFilter],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <select className="rounded-lg border border-border bg-background px-2 py-1 text-xs" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
          <option value="">Kategorie (alle)</option>
          {Object.entries(config.domain).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} Items</span>
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full gap-3 p-3 min-w-max">
          {KANBAN_COLUMNS.map((col) => {
            const items = sortItems(filtered.filter((i) => col.statuses.includes(i.status)));
            return (
              <div key={col.id} className="flex flex-col w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-card border border-border p-3 shadow-sm cursor-pointer hover:bg-muted/30"
                      onClick={() => onItemClick(item)}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                        <span>{config.importance[item.importance]?.emoji}</span>
                      </div>
                      <p className="text-xs leading-snug mb-2">{item.title}</p>
                      <div className="flex items-center gap-2">
                        <DomainBadge domain={item.domain} config={config} />
                        {item.due_key !== '9999-99-99' && (
                          <span className={cn('text-xs flex items-center gap-0.5', isOverdue(item) && 'text-red-500', isDueToday(item) && 'text-amber-600', !isOverdue(item) && !isDueToday(item) && 'text-muted-foreground')}>
                            🏆 {formatShortDate(item.due_key)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">leer</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
