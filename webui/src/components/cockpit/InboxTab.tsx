import { useState } from 'react';
import { Trash2, Send, Inbox, Pencil } from 'lucide-react';
import { postCockpitInbox, deleteCockpitInboxEntry, updateCockpitInboxEntry } from '@/api/cockpit';
import type { InboxEntry } from '@/api/cockpit';
import type { CockpitItem } from '@/types/cockpit';
import { TextWithItemLinks } from './itemLinks';
import { formatTs } from './helpers';

const KIND_LABEL: Record<string, string> = {
  note: 'Notiz',
  answer: 'Antwort',
  done: 'Erledigt',
  new: 'Neu',
};

/**
 * What is queued for the next digest run, and not yet processed.
 *
 * Answers and notes were previously write-only: once sent there was no way to see
 * what was waiting, add a late thought, or take back a mistaken entry.
 */
export function InboxTab({
  inbox,
  items,
  onChanged,
  onItemClick,
}: {
  inbox: InboxEntry[];
  items: CockpitItem[];
  onChanged: () => void;
  onItemClick: (item: CockpitItem) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const itemById = new Map(items.map((i) => [i.id, i]));
  // Newest first: a late addition belongs at the top, not buried under the day's answers.
  const entries = [...inbox].sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    setBusy('add');
    setError(null);
    try {
      await postCockpitInbox({ kind: 'note', text });
      setNote('');
      onChanged();
    } catch {
      setError('Konnte nicht gesendet werden.');
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) return;
    setBusy(editing.id);
    setError(null);
    try {
      await updateCockpitInboxEntry(editing.id, text);
      setEditing(null);
      onChanged();
    } catch {
      setError('Konnte nicht gespeichert werden.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await deleteCockpitInboxEntry(id);
      onChanged();
    } catch {
      setError('Konnte nicht gelöscht werden.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-2xl lg:max-w-4xl mx-auto">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nachtragen
        </h2>
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            placeholder="Noch etwas für den nächsten Digest-Lauf…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void addNote(); }
            }}
          />
          <button
            onClick={() => void addNote()}
            disabled={!note.trim() || busy === 'add'}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {busy === 'add' ? 'Senden…' : 'Nachtragen  ⌘↵'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Wartet auf den Digest ({entries.length})
        </h2>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        {entries.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nichts offen — alles verarbeitet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="rounded-2xl bg-card border border-border p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </span>
                  {e.ref && <span className="font-mono">{e.ref}</span>}
                  {e.dq && <span className="font-mono">{e.dq}</span>}
                  <span className="ml-auto">{formatTs(e.ts)}</span>
                  {e.edited_at && <span title={`Bearbeitet ${formatTs(e.edited_at)}`}>· bearbeitet</span>}
                  <button
                    onClick={() => setEditing({ id: e.id, text: e.text })}
                    disabled={busy === e.id}
                    title="Eintrag bearbeiten"
                    aria-label={`Eintrag ${e.id} bearbeiten`}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void remove(e.id)}
                    disabled={busy === e.id}
                    title="Eintrag streichen"
                    aria-label={`Eintrag ${e.id} streichen`}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {editing?.id === e.id ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      value={editing.text}
                      onChange={(ev) => setEditing({ id: e.id, text: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Escape') { ev.preventDefault(); setEditing(null); }
                        if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); void saveEdit(); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(null)}
                        className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => void saveEdit()}
                        disabled={!editing.text.trim() || busy === e.id}
                        className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-xs font-medium disabled:opacity-50"
                      >
                        {busy === e.id ? 'Speichern…' : 'Speichern  ⌘↵'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-snug whitespace-pre-wrap">
                    <TextWithItemLinks text={e.text} itemById={itemById} onItemClick={onItemClick} />
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
