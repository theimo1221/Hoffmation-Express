import { useState } from 'react';
import { X } from 'lucide-react';
import { DenyEditor } from './DenyEditor';
import type { DenyPolicy } from './DenyEditor';

interface TokenDialogProps {
  onSave: (data: { label: string; role: string; deny?: DenyPolicy; scope?: string[] }) => Promise<void>;
  onClose: () => void;
}

export function TokenDialog({ onSave, onClose }: TokenDialogProps) {
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<string>('control');
  const [deny, setDeny] = useState<DenyPolicy>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ label, role, deny });
      onClose();
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Neuer Token</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dialog-token-label"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Label
            </label>
            <input
              id="dialog-token-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="dialog-token-role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Rolle
            </label>
            <select
              id="dialog-token-role"
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

          <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Der Token wird nur einmal angezeigt. Bitte sicher speichern!
            </p>
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
              {saving ? 'Erstellen...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
