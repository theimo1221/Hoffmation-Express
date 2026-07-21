import { useState } from 'react';
import { X } from 'lucide-react';
import type { Token } from '@/api/auth';
import { DenyEditor } from './DenyEditor';
import type { DenyPolicy } from './DenyEditor';

interface TokenEditDialogProps {
  token: Token;
  onSave: (updates: { role: string; deny: DenyPolicy; disabled: boolean }) => Promise<void>;
  onClose: () => void;
}

export function TokenEditDialog({ token, onSave, onClose }: TokenEditDialogProps) {
  const [role, setRole] = useState<string>(token.role);
  const [disabled, setDisabled] = useState(token.disabled ?? false);
  const [deny, setDeny] = useState<DenyPolicy>(token.deny ?? {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ role, deny, disabled });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        className="w-full max-w-md overflow-y-auto max-h-[90vh] rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Token bearbeiten</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</span>
            <span className="block text-sm text-gray-500 dark:text-gray-400 font-mono">{token.label}</span>
          </div>

          <div>
            <label htmlFor="edit-token-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rolle
            </label>
            <select
              id="edit-token-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="control">Control</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          <DenyEditor deny={deny} onChange={setDeny} />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-token-disabled"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="edit-token-disabled" className="text-sm text-gray-700 dark:text-gray-300">
              Deaktiviert
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
