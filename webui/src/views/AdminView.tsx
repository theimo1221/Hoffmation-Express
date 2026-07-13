import { useState, useEffect } from 'react';
import { Users, Key, Plus, Trash2, Edit, Copy, Check, X } from 'lucide-react';
import QRCode from 'qrcode';
import {
  getUsers,
  getTokens,
  getAuthMode,
  createUser,
  updateUser,
  deleteUser,
  mintToken,
  revokeToken,
  setAuthMode,
  type User,
  type Token
} from '@/api/auth';
import { UserDialog } from '@/views/admin/UserDialog';
import { TokenDialog } from '@/views/admin/TokenDialog';
import { PageHeader } from '@/components/layout/PageHeader';

export function AdminView() {
  const [users, setUsers] = useState<User[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [authMode, setAuthModeState] = useState<'optional' | 'enforced'>('optional');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'tokens'>('users');

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, tokensData, modeData] = await Promise.all([getUsers(), getTokens(), getAuthMode()]);
      setUsers(usersData);
      setTokens(tokensData);
      setAuthModeState(modeData.mode);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (data: { username: string; password: string; role: string; deny?: any }) => {
    await createUser(data);
    await loadData();
    setUserDialogOpen(false);
  };

  const handleUpdateUser = async (username: string, updates: any) => {
    await updateUser(username, updates);
    await loadData();
    setUserDialogOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return;
    await deleteUser(username);
    await loadData();
  };

  const handleMintToken = async (data: { label: string; role: string; deny?: any; scope?: string[] }) => {
    const result = await mintToken(data.label, data.role, data.deny, data.scope);
    setMintedToken(result.token);
    const redeemUrl = `${window.location.origin}/ui/login?registration-token=${encodeURIComponent(result.registrationToken)}`;
    try {
      const dataUrl = await QRCode.toDataURL(redeemUrl, { width: 280, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
    await loadData();
  };

  const handleRevokeToken = async (label: string) => {
    if (!confirm(`Token "${label}" wirklich widerrufen?`)) return;
    await revokeToken(label);
    await loadData();
  };

  const handleCopyToken = () => {
    if (mintedToken) {
      navigator.clipboard.writeText(mintedToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleToggleAuthMode = async () => {
    const newMode = authMode === 'optional' ? 'enforced' : 'optional';
    await setAuthMode(newMode);
    setAuthModeState(newMode);
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Admin-Panel" subtitle="Benutzer- und Token-Verwaltung" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Lade...</div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <PageHeader title="Admin-Panel" subtitle="Benutzer- und Token-Verwaltung" />
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-6xl">

        <div className="mb-6 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Auth-Modus</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {authMode === 'optional' ? 'Auth wird akzeptiert, aber nicht erzwungen' : 'Auth wird erzwungen (401/403)'}
              </p>
            </div>
            <button
              onClick={handleToggleAuthMode}
              className={`rounded-xl px-6 py-3 font-medium transition-colors ${
                authMode === 'enforced'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {authMode === 'optional' ? 'Optional' : 'Enforced'}
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 rounded-2xl bg-white dark:bg-gray-800 p-2 shadow-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 rounded-xl px-4 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Benutzer
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 rounded-xl px-4 py-3 font-medium transition-colors ${
              activeTab === 'tokens'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Key className="inline h-5 w-5 mr-2" />
            Tokens
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Benutzer</h2>
              <button
                onClick={() => { setEditingUser(null); setUserDialogOpen(true); }}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Neu
              </button>
            </div>

            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.username}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Rolle: {user.role}
                      {user.disabled && <span className="ml-2 text-red-600">• Deaktiviert</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 space-x-3">
                      {user.createdAt && <span>Erstellt: {new Date(user.createdAt).toLocaleString('de-DE')}</span>}
                      {user.lastLogin && <span>Letzter Login: {new Date(user.lastLogin).toLocaleString('de-DE')}</span>}
                      {!user.lastLogin && user.createdAt && <span>Letzter Login: noch nie</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingUser(user); setUserDialogOpen(true); }}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.username)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tokens</h2>
              <button
                onClick={() => setTokenDialogOpen(true)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Neu
              </button>
            </div>

            {mintedToken && (
              <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* QR code — only present right after creation */}
                  {qrDataUrl && (
                    <div className="flex-shrink-0">
                      <img src={qrDataUrl} alt="Einlöse-QR" className="rounded-lg" width={140} height={140} />
                      <p className="mt-1 text-center text-xs text-green-700 dark:text-green-300">15 min gültig</p>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Token erstellt — QR scannen oder Token sichern
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                      QR-Code öffnet die Login-Seite und löst den Token automatisch ein (einmalig).
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white dark:bg-gray-900 p-2 text-xs break-all min-w-0">
                        {mintedToken}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        className="flex-shrink-0 rounded-lg p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                        title="Token kopieren"
                      >
                        {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMintedToken(null); setQrDataUrl(null); }}
                    className="flex-shrink-0 rounded-lg p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                    title="Schließen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.label}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{token.label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Rolle: {token.role}
                      {token.disabled && <span className="ml-2 text-red-600">• Deaktiviert</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 space-x-3">
                      {token.createdAt && <span>Erstellt: {new Date(token.createdAt).toLocaleString('de-DE')}</span>}
                      {token.lastUsed && <span>Zuletzt verwendet: {new Date(token.lastUsed).toLocaleString('de-DE')}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeToken(token.label)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {userDialogOpen && (
        <UserDialog
          user={editingUser}
          onSave={editingUser ? (updates) => handleUpdateUser(editingUser.username, updates) : handleCreateUser}
          onClose={() => { setUserDialogOpen(false); setEditingUser(null); }}
        />
      )}

      {tokenDialogOpen && (
        <TokenDialog
          onSave={handleMintToken}
          onClose={() => setTokenDialogOpen(false)}
        />
      )}
      </div>
    </div>
  );
}
