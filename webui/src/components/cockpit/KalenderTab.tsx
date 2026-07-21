import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import { TODAY, DOMAIN_FALLBACK_COLOR } from './helpers';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type CalView = 'month' | 'week';

function buildMonthCells(year: number, month: number): Array<{ day: number | null; iso: string | null }> {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }
  return cells;
}

function buildWeekCells(anchor: Date, weeks = 1): Array<{ day: number; iso: string; weekday: string }> {
  const dow = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 * weeks }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      day: d.getDate(),
      iso: d.toISOString().slice(0, 10),
      weekday: WEEKDAYS[i % 7],
    };
  });
}

function MonthGrid({
  year,
  month,
  itemsByDate,
  todayIso,
  config,
  onItemClick,
}: {
  year: number;
  month: number;
  itemsByDate: Map<string, CockpitItem[]>;
  todayIso: string;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
}) {
  const cells = buildMonthCells(year, month);
  const label = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  return (
    <div>
      <div className="text-sm font-semibold text-center mb-2 text-muted-foreground">{label}</div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map((cell, i) => {
          const items = cell.iso ? (itemsByDate.get(cell.iso) ?? []) : [];
          const isToday = cell.iso === todayIso;
          return (
            <div key={i} className={cn('bg-background p-1.5 min-h-[110px]', !cell.day && 'opacity-0 pointer-events-none', isToday && 'ring-2 ring-inset ring-primary')}>
              {cell.day && (
                <>
                  <div className={cn('text-xs mb-1 text-center w-5 h-5 flex items-center justify-center rounded-full mx-auto', isToday && 'bg-primary text-primary-foreground font-bold')}>
                    {cell.day}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        title={`${item.id} – ${item.title}`}
                        style={{ backgroundColor: config.domain[item.domain]?.color ?? DOMAIN_FALLBACK_COLOR, color: config.domain[item.domain]?.text_color ?? '#fff' }}
                        className="text-[10px] rounded px-1 truncate cursor-pointer hover:opacity-80 leading-[1.4]"
                        onClick={() => onItemClick(item)}
                      >
                        {item.id} {item.title.slice(0, 28)}
                      </div>
                    ))}
                    {items.length > 6 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{items.length - 6}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KalenderTab({
  data,
  config,
  onItemClick,
}: {
  data: CockpitData;
  config: CockpitConfig;
  onItemClick: (item: CockpitItem) => void;
}) {
  const [view, setView] = useState<CalView>('month');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };
  const prevWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(d.getDate() - 14); return n; });
  const nextWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(d.getDate() + 14); return n; });
  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear()); setMonth(n.getMonth()); setWeekAnchor(n);
  };

  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth2 = month === 11 ? 0 : month + 1;

  const itemsByDate = useMemo(() => {
    const m = new Map<string, CockpitItem[]>();
    data.items.forEach((item) => {
      const dk = item.due_key;
      if (!dk || dk === '9999-99-99') return;
      const day = dk.slice(0, 10);
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(item);
    });
    return m;
  }, [data.items]);

  const weekCells = useMemo(() => buildWeekCells(weekAnchor, 2), [weekAnchor]);
  const weekLabel = (() => {
    const first = weekCells[0];
    const last = weekCells[13];
    return `${first.day}.–${last.day}. ${new Date(last.iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`;
  })();

  const legend = (
    <div className="flex flex-wrap gap-3 px-3 py-2 shrink-0">
      {Object.entries(config.domain).map(([k, v]) => (
        <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: v.color ?? DOMAIN_FALLBACK_COLOR }} />
          {v.label}
        </div>
      ))}
    </div>
  );

  const navHeader = (
    <div className="flex items-center justify-between px-3 pt-3 pb-2 gap-2 shrink-0">
      <button onClick={view === 'month' ? prevMonth : prevWeek} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {view === 'month'
          ? <span className="font-semibold">{new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
          : <span className="font-semibold">{weekLabel}</span>}
        <button onClick={goToday} className="rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-muted">Heute</button>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button onClick={() => setView('month')} className={cn('px-2 py-0.5', view === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>Monat</button>
          <button onClick={() => setView('week')} className={cn('px-2 py-0.5 border-l border-border', view === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>Woche</button>
        </div>
      </div>
      <button onClick={view === 'month' ? nextMonth : nextWeek} className="rounded-lg p-2 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );

  if (view === 'month') {
    return (
      <div className="p-3">
        {navHeader}
        <div className="space-y-6 mt-1">
          <MonthGrid year={year} month={month} itemsByDate={itemsByDate} todayIso={TODAY} config={config} onItemClick={onItemClick} />
          <MonthGrid year={nextYear} month={nextMonth2} itemsByDate={itemsByDate} todayIso={TODAY} config={config} onItemClick={onItemClick} />
        </div>
        {legend}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {navHeader}
      <div className="flex-1 flex flex-col gap-px min-h-0 px-3 pb-1">
        {[0, 1].map((weekIdx) => {
          const slice = weekCells.slice(weekIdx * 7, weekIdx * 7 + 7);
          return (
            <div key={weekIdx} className="flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden border border-border bg-border gap-px">
              <div className="grid grid-cols-7 gap-px shrink-0">
                {slice.map((cell) => {
                  const isToday = cell.iso === TODAY;
                  return (
                    <div key={cell.iso} className={cn('bg-card text-xs font-medium text-center py-1.5', isToday && 'text-primary')}>
                      {cell.weekday} {cell.day}.
                    </div>
                  );
                })}
              </div>
              <div className="flex-1 grid grid-cols-7 gap-px min-h-0">
                {slice.map((cell) => {
                  const items = itemsByDate.get(cell.iso) ?? [];
                  const isToday = cell.iso === TODAY;
                  return (
                    <div key={cell.iso} className={cn('bg-background overflow-y-auto p-1.5 space-y-1', isToday && 'ring-2 ring-inset ring-primary')}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          title={item.title}
                          style={{ backgroundColor: config.domain[item.domain]?.color ?? DOMAIN_FALLBACK_COLOR, color: config.domain[item.domain]?.text_color ?? '#fff' }}
                          className="text-[11px] rounded px-1.5 py-1 cursor-pointer hover:opacity-80 leading-snug"
                          onClick={() => onItemClick(item)}
                        >
                          <div className="font-mono opacity-80 text-[10px]">{item.id}</div>
                          <div className="break-words">{item.title.slice(0, 60)}</div>
                        </div>
                      ))}
                      {items.length === 0 && <div className="text-[9px] text-muted-foreground px-1 pt-1">—</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {legend}
    </div>
  );
}
