import { useState } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { postCockpitInbox } from '@/api/cockpit';
import type { CockpitItem, CockpitConfig, CockpitProject } from '@/types/cockpit';
import { DomainBadge } from './DomainBadge';
import { isGated, isOverdue, isDueToday, formatShortDate } from './helpers';

export function ProjectDetailDialog({
  project,
  items,
  config,
  onClose,
  onItemClick,
  onSent,
}: {
  project: CockpitProject;
  items: CockpitItem[];
  config: CockpitConfig;
  onClose: () => void;
  onItemClick: (item: CockpitItem) => void;
  onSent: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const result = await postCockpitInbox({ kind: 'note', ref: project.key, text: text.trim() });
      onSent(result.id);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <DomainBadge domain={project.domain} config={config} />
              <span className="text-xs font-mono text-muted-foreground">{project.key.replace('project_', '')}</span>
            </div>
            <h2 className="text-base font-semibold leading-snug">{project.name}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>
        </div>

        {/* Rollup stats — compact inline */}
        <div className="flex items-center gap-4 px-6 pb-3 text-sm">
          <span><span className="font-semibold">{project.rollup.open}</span> <span className="text-muted-foreground">offen</span></span>
          <span className="text-border">·</span>
          <span><span className="font-semibold">{project.rollup.gated}</span> <span className="text-muted-foreground">wartend</span></span>
          {project.rollup.next_due && (
            <>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">Frist <span className="font-semibold text-foreground">{formatShortDate(project.rollup.next_due)}</span></span>
            </>
          )}
        </div>

        {/* Items */}
        <div className="border-t border-border">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn('flex items-center gap-2 px-6 py-2.5 border-b border-border hover:bg-muted/20 cursor-pointer', isGated(item) && 'opacity-50')}
              onClick={() => { onItemClick(item); onClose(); }}
            >
              <span>{config.importance[item.importance]?.emoji}</span>
              <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{item.id}</span>
              <span className="text-xs">{config.status[item.status]?.emoji}</span>
              {item.due_key !== '9999-99-99' && (
                <span className={cn('text-xs whitespace-nowrap', isOverdue(item) && 'text-red-500', isDueToday(item) && 'text-amber-600', !isOverdue(item) && !isDueToday(item) && 'text-muted-foreground')}>
                  {formatShortDate(item.due_key)}
                </span>
              )}
              <span className="flex-1 text-sm leading-snug">{item.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">›</span>
            </div>
          ))}
        </div>

        {/* Body markdown */}
        {project.body_md && (
          <div className="px-6 py-4 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">Projektbeschreibung</div>
            <div className="text-sm leading-relaxed max-h-64 overflow-y-auto
              [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5
              [&_p]:my-1.5
              [&_ul]:pl-4 [&_ul]:my-1 [&_ul]:list-disc
              [&_ol]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal
              [&_li]:my-0.5
              [&_strong]:font-semibold
              [&_em]:italic
              [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
              [&_a]:text-primary [&_a]:underline">
              <ReactMarkdown>{project.body_md}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Comment form */}
        <div className="border-t border-border px-6 py-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Notiz zum Projekt</div>
          <textarea
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            placeholder={`Kommentar zu ${project.key.replace('project_', '')}…`}
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
