import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCockpitData, getCockpitConfig, getCockpitInbox } from '@/api/cockpit';
import type { InboxEntry } from '@/api/cockpit';
import type { CockpitData, CockpitConfig, CockpitItem } from '@/types/cockpit';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatTs } from '@/components/cockpit/helpers';
import type { TodoFilters } from '@/components/cockpit/helpers';
import { ItemDetailDialog } from '@/components/cockpit/ItemDetailDialog';
import { TodoDialog } from '@/components/cockpit/TodoDialog';
import type { TodoDialogMode } from '@/components/cockpit/TodoDialog';
import { OverviewTab } from '@/components/cockpit/OverviewTab';
import { TodosTab } from '@/components/cockpit/TodosTab';
import { FragenTab } from '@/components/cockpit/FragenTab';
import { KanbanTab } from '@/components/cockpit/KanbanTab';
import { ProjekteTab } from '@/components/cockpit/ProjekteTab';
import { KalenderTab } from '@/components/cockpit/KalenderTab';

type Tab = 'overview' | 'todos' | 'fragen' | 'kanban' | 'projekte' | 'kalender';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'todos', label: 'TODOs' },
  { id: 'fragen', label: 'Digest-Fragen' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'projekte', label: 'Projekte' },
  { id: 'kalender', label: 'Kalender' },
];

export function CockpitView() {
  const [data, setData] = useState<CockpitData | null>(null);
  const [config, setConfig] = useState<CockpitConfig | null>(null);
  const [inbox, setInbox] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('todos');
  const [detailItem, setDetailItem] = useState<CockpitItem | null>(null);
  const [todosFilters, setTodosFilters] = useState<Partial<TodoFilters>>({});
  const [todosTabKey, setTodosTabKey] = useState(0);
  const [sentToast, setSentToast] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [todoDialog, setTodoDialog] = useState<TodoDialogMode | null>(null);

  const handleGoToTodos = useCallback((filters: Partial<TodoFilters>) => {
    setTodosFilters(filters);
    setTodosTabKey((k) => k + 1);
    setActiveTab('todos');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getCockpitData(), getCockpitConfig(), getCockpitInbox().catch(() => [] as InboxEntry[])])
      .then(([d, c, ib]) => {
        if (!cancelled) { setData(d); setConfig(c); setInbox(ib); setLoading(false); }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message.includes('403') || e.message.includes('forbidden') ? 'Kein Zugriff — Cockpit-Scope für dieses Token erforderlich.' : 'Daten nicht verfügbar, Stand unbekannt.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const allPeople = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    data.items.forEach((i) => i.people.forEach((p) => s.add(p.name)));
    return [...s].sort();
  }, [data]);

  const inboxByRef = useMemo(() => {
    const m = new Map<string, InboxEntry[]>();
    inbox.forEach((e) => {
      if (!e.ref) return;
      if (!m.has(e.ref)) m.set(e.ref, []);
      m.get(e.ref)!.push(e);
    });
    return m;
  }, [inbox]);

  const handleNoteSent = useCallback((newId: string) => {
    setSentToast(true);
    setTimeout(() => setSentToast(false), 3000);
    getCockpitInbox().catch(() => [] as InboxEntry[]).then(setInbox);
    void newId;
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Lade Cockpit…</div>
      </div>
    );
  }

  if (error || !data || !config) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
          <p className="text-sm text-muted-foreground">{error ?? 'Daten nicht verfügbar, Stand unbekannt.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Cockpit"
        subtitle={`Stand ${formatTs(data.generated_at)}`}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        isLoading={loading}
        rightContent={
          <button
            onClick={() => setTodoDialog({ type: 'new' })}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95 text-lg font-light"
            aria-label="Neues TODO"
            title="Neues TODO erfassen"
          >
            +
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto shrink-0 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.id === 'fragen' && data.questions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5 py-0.5">{data.questions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto">
            <OverviewTab data={data} config={config} onGoToTodos={handleGoToTodos} onItemClick={setDetailItem} />
          </div>
        )}
        {activeTab === 'todos' && (
          <TodosTab key={todosTabKey} data={data} config={config} onItemClick={setDetailItem} onEditItem={(item) => setTodoDialog({ type: 'edit', item })} initialFilters={todosFilters} inboxByRef={inboxByRef} />
        )}
        {activeTab === 'fragen' && <div className="h-full overflow-y-auto"><FragenTab questions={data.questions} config={config} /></div>}
        {activeTab === 'kanban' && <KanbanTab data={data} config={config} onItemClick={setDetailItem} />}
        {activeTab === 'projekte' && <div className="h-full overflow-y-auto"><ProjekteTab data={data} config={config} onItemClick={setDetailItem} onNoteSent={handleNoteSent} /></div>}
        {activeTab === 'kalender' && <div className="h-full overflow-hidden"><KalenderTab data={data} config={config} onItemClick={setDetailItem} /></div>}
      </div>

      {/* Item detail dialog */}
      {detailItem && (
        <ItemDetailDialog
          item={detailItem}
          config={config}
          inboxEntries={inboxByRef.get(detailItem.id) ?? []}
          onClose={() => setDetailItem(null)}
          onSent={handleNoteSent}
          onShowInTodos={(id) => handleGoToTodos({ text: id })}
        />
      )}

      {/* Sent toast */}
      {sentToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-xl bg-foreground text-background text-sm px-4 py-2 shadow-lg z-50">
          Gesendet — wird im nächsten Digest verarbeitet
        </div>
      )}

      {todoDialog && (
        <TodoDialog
          mode={todoDialog}
          config={config}
          availablePeople={allPeople}
          onSent={handleNoteSent}
          onClose={() => setTodoDialog(null)}
        />
      )}
    </div>
  );
}
