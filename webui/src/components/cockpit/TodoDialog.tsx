import { useState, useRef, useId } from 'react';
import { postCockpitInbox } from '@/api/cockpit';
import type { CockpitConfig, CockpitItem } from '@/types/cockpit';

const EFFORT_OPTIONS = ['0', '1-10', '10', '30-60', '120-240'];

export type TodoDialogMode = { type: 'new' } | { type: 'edit'; item: CockpitItem };

function PeopleInput({
  selected,
  onChange,
  available,
  listId,
}: {
  selected: string[];
  onChange: (names: string[]) => void;
  available: string[];
  listId: string;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed]);
    setInput('');
  };

  const remove = (name: string) => onChange(selected.filter((n) => n !== name));

  const suggestions = available.filter((p) => !selected.includes(p));

  return (
    <div
      className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 flex flex-wrap gap-1.5 cursor-text min-h-[38px] focus-within:ring-2 focus-within:ring-primary"
      onClick={() => inputRef.current?.focus()}
    >
      {selected.map((name) => (
        <span key={name} className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary text-xs px-2 py-0.5 shrink-0">
          {name}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(name); }}
            className="hover:text-destructive leading-none font-bold"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        list={listId}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none py-0.5"
        placeholder={selected.length === 0 ? 'Name eingeben oder auswählen…' : ''}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(input); }
          if (e.key === 'Backspace' && !input && selected.length > 0) onChange(selected.slice(0, -1));
        }}
        onBlur={() => { if (input.trim()) add(input); }}
      />
      <datalist id={listId}>
        {suggestions.map((p) => <option key={p} value={p} />)}
      </datalist>
    </div>
  );
}

export function TodoDialog({
  mode,
  config,
  availablePeople,
  onSent,
  onClose,
}: {
  mode: TodoDialogMode;
  config: CockpitConfig;
  availablePeople: string[];
  onSent: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = mode.type === 'edit';
  const orig = isEdit ? mode.item : null;

  const origDue = orig && orig.due_key !== '9999-99-99' ? orig.due_key.slice(0, 10) : '';

  const [title, setTitle] = useState(orig?.title ?? '');
  const [dueDate, setDueDate] = useState(origDue);
  const [importance, setImportance] = useState(orig?.importance ?? '');
  const [domain, setDomain] = useState(orig?.domain ?? '');
  const [effort, setEffort] = useState(orig?.effort ?? '');
  const [people, setPeople] = useState<string[]>(orig?.people.map((p) => p.name) ?? []);
  const [sending, setSending] = useState(false);

  const uid = useId();
  const effortListId = `effort-list-${uid}`;
  const peopleListId = `people-list-${uid}`;

  const importanceEntries = Object.entries(config.importance).sort(([, a], [, b]) => a.rank - b.rank);
  const domainEntries = Object.entries(config.domain);

  const selectClass = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  const buildNewText = () => {
    const lines = [title.trim()];
    if (dueDate) lines.push(`Fälligkeit: ${dueDate}`);
    if (importance) {
      const def = config.importance[importance];
      lines.push(`Wichtigkeit: ${importance}${def ? ` (${def.label_de})` : ''}`);
    }
    if (domain) {
      const def = config.domain[domain];
      lines.push(`Kategorie: ${domain}${def ? ` (${def.label})` : ''}`);
    }
    if (effort) lines.push(`Aufwand: ${effort} min`);
    if (people.length > 0) lines.push(`Beteiligte: ${people.join(', ')}`);
    return lines.join('\n');
  };

  const buildDeltaText = (item: CockpitItem): string | null => {
    const changes: string[] = [];
    if (title.trim() !== item.title) changes.push(`Titel: „${item.title}" → „${title.trim()}"`);
    if (dueDate !== origDue) changes.push(`Fälligkeit: ${origDue || '(keine)'} → ${dueDate || '(keine)'}`);
    if (importance !== item.importance) {
      const a = config.importance[item.importance]?.label_de ?? item.importance;
      const b = config.importance[importance]?.label_de ?? importance;
      changes.push(`Wichtigkeit: ${a} → ${b}`);
    }
    if (domain !== item.domain) {
      const a = config.domain[item.domain]?.label ?? item.domain;
      const b = config.domain[domain]?.label ?? domain;
      changes.push(`Kategorie: ${a} → ${b}`);
    }
    if (effort !== (item.effort ?? '')) changes.push(`Aufwand: ${item.effort || '—'} → ${effort || '—'} min`);
    const origP = [...item.people.map((p) => p.name)].sort().join(', ');
    const newP = [...people].sort().join(', ');
    if (origP !== newP) changes.push(`Beteiligte: ${origP || '—'} → ${newP || '—'}`);
    if (changes.length === 0) return null;
    return `Änderungen:\n${changes.map((c) => `- ${c}`).join('\n')}`;
  };

  const handleSend = async () => {
    setSending(true);
    try {
      if (!isEdit) {
        if (!title.trim()) { setSending(false); return; }
        const result = await postCockpitInbox({ kind: 'new', text: buildNewText() });
        onSent(result.id);
        onClose();
      } else {
        const delta = buildDeltaText(orig!);
        if (!delta) { onClose(); return; }
        const result = await postCockpitInbox({ kind: 'note', ref: orig!.id, text: delta });
        onSent(result.id);
        onClose();
      }
    } catch {
      setSending(false);
    }
  };

  const preview = isEdit ? buildDeltaText(orig!) : (title.trim() ? buildNewText() : null);
  const canSend = isEdit ? buildDeltaText(orig!) !== null : title.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="font-semibold text-base">
            {isEdit ? `${orig!.id} bearbeiten` : 'Neues TODO erfassen'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>
        </div>

        <div className="px-5 pb-3 space-y-3 overflow-y-auto">
          {/* Titel */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Titel{!isEdit && ' *'}
            </label>
            <textarea
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder={isEdit ? orig!.title : 'Was muss getan werden?'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSend(); }}
            />
          </div>

          {/* Fälligkeit + Aufwand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fälligkeit</label>
              <input
                type="date"
                className={selectClass}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Aufwand (min)</label>
              <input
                list={effortListId}
                className={selectClass}
                placeholder="z. B. 30-60"
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
              <datalist id={effortListId}>
                {EFFORT_OPTIONS.map((o) => <option key={o} value={o}>{o} min</option>)}
              </datalist>
            </div>
          </div>

          {/* Wichtigkeit + Kategorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Wichtigkeit</label>
              <select className={selectClass} value={importance} onChange={(e) => setImportance(e.target.value)}>
                <option value="">—</option>
                {importanceEntries.map(([key, def]) => (
                  <option key={key} value={key}>{def.emoji} {def.label_de}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Kategorie</label>
              <select className={selectClass} value={domain} onChange={(e) => setDomain(e.target.value)}>
                <option value="">—</option>
                {domainEntries.map(([key, def]) => (
                  <option key={key} value={key}>{def.emoji} {def.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Beteiligte */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beteiligte</label>
            <PeopleInput
              selected={people}
              onChange={setPeople}
              available={availablePeople}
              listId={peopleListId}
            />
          </div>

          {/* Vorschau */}
          {preview && (
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {isEdit ? 'Delta (wird gesendet)' : 'Vorschau'}
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{preview}</pre>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted">
            Abbrechen
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!canSend || sending}
            className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Senden…' : isEdit ? 'Delta senden  ⌘↵' : 'Erfassen  ⌘↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
