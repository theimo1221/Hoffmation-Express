import { useMemo } from 'react';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import type { CockpitBriefing } from '@/api/cockpit';
import { MarkdownWithItemLinks } from './itemLinks';
import { formatShortDate, formatTs } from './helpers';
import type { TodoFilters } from './helpers';

export function OverviewTab({
  data,
  config,
  briefing,
  onGoToTodos,
  onItemClick,
}: {
  data: CockpitData;
  config: CockpitConfig;
  briefing: CockpitBriefing | null;
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
      {/* Daily briefing - rendered verbatim, never reformatted or summarised */}
      {briefing?.markdown && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tages-Briefing
            <span className="ml-2 font-normal normal-case tracking-normal">
              {formatTs(briefing.generated_at)}
            </span>
          </h2>
          <div
            className="rounded-2xl bg-card p-4 shadow-sm text-sm leading-relaxed
              [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-2
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5
              [&_p]:my-1.5
              [&_ul]:pl-4 [&_ul]:my-1 [&_ul]:list-disc
              [&_ol]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal
              [&_li]:my-0.5
              [&_strong]:font-semibold
              [&_em]:italic
              [&_hr]:my-3 [&_hr]:border-border
              [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
              [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_td]:py-0.5
              [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto
              [&_a]:text-primary [&_a]:underline
              [&_table]:border-collapse [&_table]:my-2
              [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50
              [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1
              [&_del]:line-through [&_del]:text-muted-foreground"
          >
            <MarkdownWithItemLinks
              markdown={briefing.markdown}
              itemById={itemById}
              onItemClick={onItemClick}
            />
          </div>
        </section>
      )}

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
