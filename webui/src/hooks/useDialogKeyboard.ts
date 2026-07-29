import { useEffect } from 'react';

/**
 * Close a dialog on Escape.
 *
 * Registered per dialog rather than globally so nested dialogs close top-down: the
 * listener runs on the document, and the most recently mounted dialog stops propagation
 * for its own key event.
 */
export function useCloseOnEscape(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, enabled]);
}

/** True when the event is the "send" chord (Cmd+Enter / Ctrl+Enter). */
export function isSubmitChord(e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.key === 'Enter' && (e.metaKey || e.ctrlKey);
}
