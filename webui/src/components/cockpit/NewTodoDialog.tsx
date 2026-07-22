import { useState } from 'react';
import { postCockpitInbox } from '@/api/cockpit';

export function NewTodoDialog({ onSent, onClose }: { onSent: (id: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const result = await postCockpitInbox({ kind: 'new', text: text.trim() });
      onSent(result.id);
      onClose();
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Neues TODO erfassen</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>
        </div>
        <textarea
          autoFocus
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={4}
          placeholder="Beschreibung des TODOs…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSend(); }}
        />
        <p className="text-xs text-muted-foreground">Wird als Inbox-Eintrag erfasst und beim nächsten Digest verarbeitet. ⌘↵ zum Senden.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted">
            Abbrechen
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!text.trim() || sending}
            className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {sending ? 'Senden…' : 'Erfassen'}
          </button>
        </div>
      </div>
    </div>
  );
}
