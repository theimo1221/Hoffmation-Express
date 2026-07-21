import { useMemo } from 'react';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import { formatShortDate, formatTs } from './helpers';
import type { TodoFilters } from './helpers';

export function OverviewTab({
  data,
  config,
  onGoToTodos,
  onItemClick,
}: {
  data: CockpitData;
  config: CockpitConfig;
  onGoToTodos: (filters: Partial<TodoFilters>) => void;
  onItemClick: (item: CockpitItem) => void;
}) {
  const ov = data.overview;
  const domainEntries = Object.entries(ov.counts).filter(([k]) => k !== 'total');
  const priorityEntries = Object.entries(ov.priority).sort(
    ([a], [b]) => (config.importance[b]?.rank ?? 0) - (config.importance[a]?.rank ?? 0),
  );
  const itemById = useMemo(() => new Map(data.items.map((i) => [i.id, i])), [data.items]);

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      {/* Counts by domain */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domänen</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {domainEntries.map(([domain, count]) => {
            const def = config.domain[domain];
            return (
              <div
                key={domain}
                className="rounded-2xl bg-card p-4 shadow-sm text-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onGoToTodos({ domain })}
                title={`Alle ${def?.label ?? domain}-Items in TODOs anzeigen`}
              >
                <div className="text-2xl mb-1">{def?.emoji ?? '📋'}</div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{def?.label ?? domain}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-sm text-muted-foreground">
          Gesamt:{' '}
          <button className="font-bold underline hover:text-foreground" onClick={() => onGoToTodos({})}>
            {ov.counts.total} offene Items
          </button>
        </div>
      </section>

      {/* Priority distribution */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priorität</h2>
        <div className="space-y-1.5">
          {priorityEntries.map(([imp, count]) => {
            const def = config.importance[imp];
            const pct = Math.round((count / ov.counts.total) * 100);
            return (
              <div
                key={imp}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/20 rounded-lg px-1 py-0.5 transition-colors"
                onClick={() => onGoToTodos({ importance: imp })}
                title={`${def?.label_de ?? imp}-Items in TODOs anzeigen`}
              >
                <span className="w-4 text-center">{def?.emoji ?? imp}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Neglect top */}
      {ov.neglect_top.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vernachlässigt</h2>
          <div className="space-y-1">
            {ov.neglect_top.map((n) => {
              const item = itemById.get(n.id);
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
                  onClick={() => item && onItemClick(item)}
                >
                  <span className="font-mono text-xs text-muted-foreground w-12">{n.id}</span>
                  <span className="flex-1">{item?.title.slice(0, 60) ?? '—'}</span>
                  <span className="text-xs text-orange-500">{n.days}d</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Meta */}
      <section className="text-xs text-muted-foreground space-y-1">
        <div>Letzter Lauf: {formatTs(ov.last_run)}</div>
        {ov.count_drift && <div className="text-amber-500">⚠ Count-Drift erkannt</div>}
        {ov.presence.vacation_until && (
          <div>🏖 Urlaub bis {formatShortDate(ov.presence.vacation_until)}</div>
        )}
        {data._warnings.map((w, i) => (
          <div key={i} className="text-amber-500">⚠ {w}</div>
        ))}
      </section>
    </div>
  );
}
