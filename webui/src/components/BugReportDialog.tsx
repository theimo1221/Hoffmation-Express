import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Bug, CheckCircle, AlertCircle } from 'lucide-react';
import { useBugReport } from '@/hooks/useBugReport';

interface BugReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: 'device' | 'room' | 'scene' | 'group';
  entityId?: string;
  entityData?: any;
}

export function BugReportDialog({ isOpen, onClose, entityType, entityId, entityData }: BugReportDialogProps) {
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { submitBugReport, isSubmitting } = useBugReport();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when dialog opens (with delay for iOS)
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Delay focus for iOS PWA to ensure keyboard shows properly
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setStatus('error');
      setErrorMessage('Bitte beschreibe das Problem');
      return;
    }

    const result = await submitBugReport(description, entityType, entityId, entityData);
    
    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setDescription('');
        setStatus('idle');
      }, 2000);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Fehler beim Senden');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setDescription('');
      setStatus('idle');
      setErrorMessage('');
    }
  };

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
        // Close on backdrop click (but not on dialog click)
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-card shadow-2xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">Bug melden</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Context Info */}
          {(entityType || entityId) && (
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <p className="text-muted-foreground">
                Kontext wird automatisch erfasst:
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {entityType && <li>• Typ: {entityType}</li>}
                {entityId && <li>• ID: {entityId}</li>}
                <li>• Route, Browser-Info, Raw JSON</li>
              </ul>
            </div>
          )}

          {/* Description Field */}
          <div>
            <label htmlFor="bug-description" className="block text-sm font-medium mb-2">
              Beschreibung des Problems <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting || status === 'success'}
              placeholder="Was ist passiert? Was hast du erwartet?"
              rows={6}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Beschreibe das Problem so detailliert wie möglich
            </p>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-500">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Bug-Report erfolgreich gesendet!</span>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-secondary px-4 py-3 font-medium transition-all hover:bg-secondary/80 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || status === 'success' || !description.trim()}
              className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Sende...' : status === 'success' ? 'Gesendet!' : 'Bug melden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render dialog as portal directly in body to avoid header safe-area-inset issues
  return isOpen ? createPortal(dialog, document.body) : null;
}
