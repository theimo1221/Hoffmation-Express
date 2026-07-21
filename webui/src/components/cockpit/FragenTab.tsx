import { useState } from 'react';
import { Send, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { postCockpitInbox } from '@/api/cockpit';
import type { CockpitQuestion, CockpitConfig } from '@/types/cockpit';

export function FragenTab({ questions, config }: { questions: CockpitQuestion[]; config: CockpitConfig }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const [sent, setSent] = useState<Record<number, boolean>>({});

  const handleSend = async (idx: number, q: CockpitQuestion) => {
    const text = answers[idx]?.trim();
    if (!text) return;
    setSending((prev) => ({ ...prev, [idx]: true }));
    try {
      await postCockpitInbox({ kind: 'answer', ref: q.ref, text });
      setSent((prev) => ({ ...prev, [idx]: true }));
    } finally {
      setSending((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const handleYesNo = async (idx: number, q: CockpitQuestion, answer: 'Ja' | 'Nein') => {
    setSending((prev) => ({ ...prev, [idx]: true }));
    try {
      await postCockpitInbox({ kind: 'answer', ref: q.ref, text: answer });
      setSent((prev) => ({ ...prev, [idx]: true }));
    } finally {
      setSending((prev) => ({ ...prev, [idx]: false }));
    }
  };

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Keine offenen Digest-Fragen</p>
      </div>
    );
  }

  const byDomain: Record<string, CockpitQuestion[]> = {};
  questions.forEach((q) => {
    const d = q.domain ?? 'sonstige';
    (byDomain[d] ??= []).push(q);
  });

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {Object.entries(byDomain).map(([domain, qs]) => (
        <section key={domain}>
          <h2 className="mb-3 font-semibold text-sm">
            {config.domain[domain] ? `${config.domain[domain].emoji} ${config.domain[domain].label}` : domain}
          </h2>
          <div className="space-y-4">
            {qs.map((q, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm leading-relaxed">{q.text}</p>
                {!sent[idx] ? (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => handleYesNo(idx, q, 'Ja')} disabled={sending[idx]} className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-muted disabled:opacity-50">Ja</button>
                      <button onClick={() => handleYesNo(idx, q, 'Nein')} disabled={sending[idx]} className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-muted disabled:opacity-50">Nein</button>
                    </div>
                    <textarea
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Antwort an Claude..."
                      value={answers[idx] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    />
                    <button
                      onClick={() => handleSend(idx, q)}
                      disabled={!answers[idx]?.trim() || sending[idx]}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-orange-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sending[idx] ? 'Senden…' : 'Senden →'}
                    </button>
                  </>
                ) : (
                  <div className={cn('flex items-center gap-1.5 text-sm text-green-600')}>
                    <CheckSquare className="h-4 w-4" /> Gesendet
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
