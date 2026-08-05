import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { CockpitItem } from '@/types/cockpit';
import { formatShortDate, isDuePending, isOverdue, isDueToday, toLocalIsoDate, TODAY } from './helpers';
import { PendingDot } from './PendingDot';

const NO_DUE = '9999-99-99';

/** Shift presets, applied on a single click - no confirm step. */
const PRESETS: { label: string; days: number | 'today' }[] = [
  { label: 'Heute', days: 'today' },
  { label: '+1 Tag', days: 1 },
  { label: '+1 Woche', days: 7 },
  { label: '+1 Monat', days: 30 },
];

function shift(from: string, days: number): string {
  const base = from ? new Date(`${from}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return toLocalIsoDate(base);
}

/**
 * The due date of an item, rescheduled in place.
 *
 * Double-click opens a small menu right at the date so a shift is one further click, rather
 * than a dialog that has to be filled in and saved. The menu is positioned fixed because the
 * list scrolls inside an overflow container that would otherwise clip it.
 */
export function DueDateQuickEdit({
  item,
  onReschedule,
  compact = false,
}: {
  item: CockpitItem;
  onReschedule: (item: CockpitItem, due: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const current = item.due_key && item.due_key !== NO_DUE ? item.due_key.slice(0, 10) : '';

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // Any outside interaction or scroll dismisses it; the menu itself stops propagation.
    document.addEventListener('pointerdown', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const openMenu = () => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    // Keep it on screen; the menu is roughly 230px wide.
    setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 240) });
    setOpen(true);
  };

  const apply = (due: string | null) => {
    setOpen(false);
    onReschedule(item, due);
  };

  const overdue = isOverdue(item);
  const today = isDueToday(item);

  return (
    <>
      <span
        ref={anchorRef}
        onDoubleClick={(e) => {
          e.stopPropagation();
          openMenu();
        }}
        title="Doppelklick: neu terminieren"
        className={cn(
          'cursor-pointer select-none',
          overdue && 'text-red-500',
          today && 'text-amber-600',
          compact ? 'inline-flex items-center gap-0.5' : '',
        )}
      >
        {formatShortDate(item.due_key)}
        {isDuePending(item) && <PendingDot />}
      </span>

      {open && pos && (
        <div
          style={{ top: pos.top, left: pos.left }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-[230px] rounded-xl border border-border bg-card p-2 shadow-lg space-y-2"
        >
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.id} verschieben
          </div>
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => apply(p.days === 'today' ? TODAY : shift(current, p.days))}
                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={current}
            autoFocus
            onChange={(e) => apply(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {current && (
            <button
              onClick={() => apply(null)}
              className="w-full rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Fälligkeit entfernen
            </button>
          )}
        </div>
      )}
    </>
  );
}
