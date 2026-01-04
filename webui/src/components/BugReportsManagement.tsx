import { useState, useEffect } from 'react';
import { Bug, CheckCircle, Circle, Edit2, X, AlertCircle, Loader2 } from 'lucide-react';
import { useBugReport, type BugReport } from '@/hooks/useBugReport';
import { createPortal } from 'react-dom';

interface BugReportsManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugReportsManagement({ isOpen, onClose }: BugReportsManagementProps) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<BugReport | null>(null);
  const [showDone, setShowDone] = useState(false);
  const { fetchBugReports, updateBugReport } = useBugReport();

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen]);

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchBugReports();
    if (result.success && result.reports) {
      // Sort by createdAt descending (newest first)
      const sorted = result.reports.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReports(sorted);
    } else {
      setError(result.error || 'Fehler beim Laden');
    }
    setIsLoading(false);
  };

  const handleToggleDone = async (report: BugReport) => {
    const result = await updateBugReport(report.id, { done: !report.done });
    if (result.success && result.report) {
      setReports(reports.map(r => r.id === report.id ? result.report! : r));
    }
  };

  const handleSaveEdit = async (id: string, description: string) => {
    const result = await updateBugReport(id, { description });
    if (result.success && result.report) {
      setReports(reports.map(r => r.id === id ? result.report! : r));
      setEditingReport(null);
    }
  };

  if (!isOpen) return null;

  const filteredReports = showDone ? reports : reports.filter(r => !r.done);
  const openCount = reports.filter(r => !r.done).length;
  const doneCount = reports.filter(r => r.done).length;

  const dialog = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-card shadow-2xl m-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">Bug-Reports Verwaltung</h2>
            <div className="flex items-center gap-2 ml-4 text-sm">
              <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium">
                {openCount} offen
              </span>
              <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 font-medium">
                {doneCount} erledigt
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="border-b border-border px-4 py-3">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Erledigte anzeigen</span>
          </label>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && filteredReports.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {showDone ? 'Keine Bug-Reports vorhanden' : 'Keine offenen Bug-Reports'}
            </div>
          )}

          {!isLoading && !error && filteredReports.length > 0 && (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <BugReportItem
                  key={report.id}
                  report={report}
                  isEditing={editingReport?.id === report.id}
                  onToggleDone={() => handleToggleDone(report)}
                  onEdit={() => setEditingReport(report)}
                  onCancelEdit={() => setEditingReport(null)}
                  onSaveEdit={(description) => handleSaveEdit(report.id, description)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

interface BugReportItemProps {
  report: BugReport;
  isEditing: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (description: string) => void;
}

function BugReportItem({ report, isEditing, onToggleDone, onEdit, onCancelEdit, onSaveEdit }: BugReportItemProps) {
  const [editedDescription, setEditedDescription] = useState(report.description);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${
      report.done 
        ? 'border-green-500/30 bg-green-500/5' 
        : 'border-border bg-secondary/50'
    }`}>
      <div className="flex items-start gap-3">
        {/* Done Checkbox */}
        <button
          onClick={onToggleDone}
          className="mt-1 flex-shrink-0 transition-colors hover:scale-110"
        >
          {report.done ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSaveEdit(editedDescription)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  Speichern
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm whitespace-pre-wrap ${report.done ? 'line-through opacity-60' : ''}`}>
                {report.description}
              </p>
              
              {/* Metadata */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Erstellt: {formatDate(report.createdAt)}</span>
                {report.doneAt && (
                  <span className="text-green-500">Erledigt: {formatDate(report.doneAt)}</span>
                )}
                {report.context.entityType && (
                  <span>Typ: {report.context.entityType}</span>
                )}
                {report.context.entityId && (
                  <span>ID: {report.context.entityId}</span>
                )}
                <span>Route: {report.context.route}</span>
              </div>
            </>
          )}
        </div>

        {/* Edit Button */}
        {!isEditing && !report.done && (
          <button
            onClick={onEdit}
            className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-secondary"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
