import { useState } from 'react';
import { X } from 'lucide-react';
import type { User } from '@/api/auth';
import { DenyEditor } from './DenyEditor';
import type { DenyPolicy } from './DenyEditor';

export type UserCreatePayload = { username: string; password: string; role: string; deny: DenyPolicy; scope: string[] | null };
export type UserUpdatePayload = { role: string; disabled: boolean; deny: DenyPolicy; scope: string[] | null; password?: string };

interface UserDialogProps {
  user: User | null;
  onSave: (data: UserCreatePayload | UserUpdatePayload) => Promise<void>;
  onClose: () => void;
}

export function UserDialog({ user, onSave, onClose }: UserDialogProps) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(user?.role || 'control');
  const [disabled, setDisabled] = useState(user?.disabled || false);
  const [deny, setDeny] = useState<DenyPolicy>(user?.deny ?? {});
  const [cockpitScope, setCockpitScope] = useState((user?.scope ?? []).includes('cockpit'));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const scope = cockpitScope ? ['cockpit'] : null;
      if (user) {
        const updates: UserUpdatePayload = { role, disabled, deny, scope };
        if (password) updates.password = password;
        await onSave(updates);
      } else {
        await onSave({ username, password, role, deny, scope });
      }
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {user ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dialog-username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Benutzername
            </label>
            <input
              id="dialog-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!user}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white disabled:opacity-50"
              required={!user}
            />
          </div>

          <div>
            <label
              htmlFor="dialog-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {user ? 'Neues Passwort (leer lassen für keine Änderung)' : 'Passwort'}
            </label>
            <input
              id="dialog-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white"
              required={!user}
            />
          </div>

          <div>
            <label htmlFor="dialog-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rolle
            </label>
            <select
              id="dialog-role"
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

          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scopes</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="user-cockpit-scope"
                checked={cockpitScope}
                onChange={(e) => setCockpitScope(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="user-cockpit-scope" className="text-sm text-gray-700 dark:text-gray-300">
                🗂 Cockpit-Zugriff
              </label>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="disabled"
                checked={disabled}
                onChange={(e) => setDisabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="disabled" className="text-sm text-gray-700 dark:text-gray-300">
                Deaktiviert
              </label>
            </div>
          )}

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
