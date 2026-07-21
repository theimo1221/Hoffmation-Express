import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { postCockpitInbox } from '@/api/cockpit';
import type { InboxEntry } from '@/api/cockpit';
import type { CockpitItem, CockpitConfig } from '@/types/cockpit';
import { DomainBadge } from './DomainBadge';
import { isOverdue, isDueToday, formatShortDate, formatTs } from './helpers';

export function ItemDetailDialog({
  item,
  config,
  inboxEntries,
  onClose,
  onSent,
  onShowInTodos,
}: {
  item: CockpitItem | null;
  config: CockpitConfig;
  inboxEntries: InboxEntry[];
  onClose: () => void;
  onSent: (id: string) => void;
  onShowInTodos: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'note' | 'done'>('note');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !item) return;
    setSending(true);
    try {
      const result = await postCockpitInbox({ kind, ref: item.id, text: text.trim() });
      onSent(result.id);
      onClose();
    } catch {
      setSending(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(item?.id ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (!item) return null;

  const overdue = isOverdue(item);
  const today = isDueToday(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-1">{item.id}</div>
            <h2 className="text-sm font-semibold leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <DomainBadge domain={item.domain} config={config} />
          <span className="text-xs bg-muted rounded px-1.5 py-0.5">
            {config.status[item.status]?.emoji} {config.status[item.status]?.label_de ?? item.status}
          </span>
          <span className="text-xs bg-muted rounded px-1.5 py-0.5">
            {config.importance[item.importance]?.emoji} {config.importance[item.importance]?.label_de ?? item.importance}
          </span>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-5 pb-3 text-xs text-muted-foreground">
          {item.effort && <><span className="font-medium text-foreground">Aufwand</span><span>{item.effort}</span></>}
          {item.due_key !== '9999-99-99' && (
            <><span className="font-medium text-foreground">Fällig</span>
            <span className={cn(overdue && 'text-red-500', today && 'text-amber-500')}>{formatShortDate(item.due_key)}</span></>
          )}
          {item.touched && <><span className="font-medium text-foreground">Zuletzt</span><span>{formatShortDate(item.touched)}</span></>}
          {item.created && <><span className="font-medium text-foreground">Erstellt</span><span>{formatShortDate(item.created)}</span></>}
          {item.people.length > 0 && (
            <><span className="font-medium text-foreground">Personen</span><span>{item.people.map((p) => p.name).join(', ')}</span></>
          )}
          {item.project && (
            <><span className="font-medium text-foreground">Projekt</span><span>{item.project.key.replace('project_', '')}</span></>
          )}
        </div>

        {/* Context */}
        {item.context_md && (
          <div className="mx-5 mb-3 rounded-xl bg-muted/40 border border-border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-foreground/80 max-h-40 overflow-y-auto">
            {item.context_md}
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-5 pb-3">
            {item.tags.map((t) => (
              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 px-5 pb-4">
          <button
            onClick={() => { onShowInTodos(item.id); onClose(); }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted text-foreground"
          >
            In TODOs zeigen
          </button>
          <button
            onClick={handleCopyId}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted text-muted-foreground"
          >
            {copied ? '✓ Kopiert' : '⌘ ID'}
          </button>
        </div>

        {/* Existing inbox entries */}
        {inboxEntries.length > 0 && (
          <div className="border-t border-border px-5 pt-3 pb-2 space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Kommentare ({inboxEntries.length})
            </div>
            {inboxEntries.map((e) => (
              <div key={e.id} className="rounded-lg bg-muted/40 border border-border px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{e.kind}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTs(e.ts)}</span>
                </div>
                <p className="text-xs whitespace-pre-wrap leading-relaxed">{e.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Inbox form */}
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            {inboxEntries.length > 0 ? 'Weiterer Kommentar' : 'Notiz / Status an Claude'}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setKind('note')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', kind === 'note' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>Notiz</button>
            <button onClick={() => setKind('done')} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', kind === 'done' ? 'bg-green-600 text-white' : 'bg-muted')}>Erledigt</button>
          </div>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            placeholder={`Kommentar zu ${item.id}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-orange-700 w-full justify-center"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Senden…' : 'Senden ↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
