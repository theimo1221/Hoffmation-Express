import { useState } from 'react';
import { postCockpitInbox, rescheduleCockpitItem } from '@/api/cockpit';
import type { CockpitItem } from '@/types/cockpit';
import { useCloseOnEscape, isSubmitChord } from '@/hooks/useDialogKeyboard';

const NO_DUE = '9999-99-99';

/**
 * Move an item's due date.
 *
 * Writes both halves: the inbox entry the nightly acts on, and a direct patch of
 * cockpit-data.json so the new date is visible right away here and on other devices.
 * The patch marks the item pending until the nightly regenerates the file.
 */
export function RescheduleDialog({
  item,
  onDone,
  onClose,
}: {
  item: CockpitItem;
  onDone: () => void;
  onClose: () => void;
}) {
  const current = item.due_key && item.due_key !== NO_DUE ? item.due_key.slice(0, 10) : '';
  const [due, setDue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useCloseOnEscape(onClose);

  const shift = (days: number) => {
    const base = due ? new Date(`${due}T00:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    setDue(base.toISOString().slice(0, 10));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const next = due || null;
    try {
      // The nightly reads the inbox, so that entry has to exist even though the
      // patch below already makes the change visible.
      await postCockpitInbox({
        kind: 'note',
        ref: item.id,
        text: `Fälligkeit: ${current || '(keine)'} → ${next ?? '(keine)'}`,
      });
      await rescheduleCockpitItem(item.id, next);
      onDone();
      onClose();
    } catch {
      setError('Konnte nicht gespeichert werden.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">
            <span className="font-mono text-sm text-muted-foreground mr-2">{item.id}</span>
            neu terminieren
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <p className="text-sm leading-snug">{item.title}</p>

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Heute', days: 0, abs: true },
            { label: '+1 Tag', days: 1 },
            { label: '+1 Woche', days: 7 },
            { label: '+1 Monat', days: 30 },
          ].map(({ label, days, abs }) => (
            <button
              key={label}
              onClick={() => (abs ? setDue(new Date().toISOString().slice(0, 10)) : shift(days))}
              className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted"
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Fällig am</label>
          <input
            type="date"
            autoFocus
            value={due}
            onChange={(e) => setDue(e.target.value)}
            onKeyDown={(e) => { if (isSubmitChord(e)) { e.preventDefault(); void save(); } }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {due && (
            <button onClick={() => setDue('')} className="mt-1 text-xs text-muted-foreground underline">
              Fälligkeit entfernen
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Wird sofort übernommen und als vorgemerkt markiert, bis der nächste Digest-Lauf sie verarbeitet hat.
        </p>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted">
            Abbrechen
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Speichern…' : 'Übernehmen'}
          </button>
        </div>
      </div>
    </div>
  );
}
