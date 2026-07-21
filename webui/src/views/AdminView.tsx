import { useState, useEffect } from 'react';
import { Users, Key, Plus, Trash2, Edit, Copy, Check, X, RefreshCw, Download, CheckCircle, XCircle, Loader2, Bug, Settings } from 'lucide-react';
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
import { updateWebUI, restartHoffmation, type WebUIUpdateResult, type HoffmationRestartResult } from '@/api/system';
import { updateToken } from '@/api/auth';
import { UserDialog, type UserCreatePayload, type UserUpdatePayload } from '@/views/admin/UserDialog';
import { TokenDialog } from '@/views/admin/TokenDialog';
import { TokenEditDialog } from '@/views/admin/TokenEditDialog';
import type { DenyPolicy } from '@/views/admin/DenyEditor';
import { BugReportsManagement } from '@/components/BugReportsManagement';
import { PageHeader } from '@/components/layout/PageHeader';

export function AdminView() {
  const [users, setUsers] = useState<User[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [authMode, setAuthModeState] = useState<'optional' | 'enforced'>('optional');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'tokens' | 'system'>('users');

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<WebUIUpdateResult | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartResult, setRestartResult] = useState<HoffmationRestartResult | null>(null);
  const [showBugReports, setShowBugReports] = useState(false);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
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

  const handleCreateUser = async (data: UserCreatePayload | UserUpdatePayload) => {
    if ('username' in data) {
      await createUser({ username: data.username, password: data.password, role: data.role, deny: data.deny });
    }
    await loadData();
    setUserDialogOpen(false);
  };

  const handleUpdateUser = async (username: string, updates: UserCreatePayload | UserUpdatePayload) => {
    await updateUser(username, {
      role: updates.role,
      deny: updates.deny,
      disabled: 'disabled' in updates ? updates.disabled : undefined,
      password: updates.password,
    });
    await loadData();
    setUserDialogOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return;
    await deleteUser(username);
    await loadData();
  };

  const handleMintToken = async (data: { label: string; role: string; deny?: DenyPolicy; scope?: string[] }) => {
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

  const handleUpdateToken = async (label: string, updates: { role: string; deny: object; disabled: boolean }) => {
    await updateToken(label, updates);
    await loadData();
    setEditingToken(null);
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

  const handleUpdateWebUI = async () => {
    setIsUpdating(true);
    setUpdateResult(null);
    try {
      const result = await updateWebUI();
      setUpdateResult(result);
      if (result.success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (e) {
      setUpdateResult({ success: false, steps: [], error: String(e) });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRestartHoffmation = async () => {
    setIsRestarting(true);
    setRestartResult(null);
    try {
      const result = await restartHoffmation();
      setRestartResult(result);
    } catch (e) {
      setRestartResult({ success: false, error: String(e) });
    } finally {
      setIsRestarting(false);
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
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 rounded-xl px-4 py-3 font-medium transition-colors ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            System
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingToken(token)}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRevokeToken(token.label)}
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

        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* Bug Reports */}
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Bug-Reports
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Verwalte gemeldete Bugs: Bearbeiten, Abhaken und Historie einsehen.
              </p>
              <button
                onClick={() => setShowBugReports(true)}
                className="w-full rounded-xl bg-red-500 py-3 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95 flex items-center justify-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Bug-Verwaltung öffnen
              </button>
            </div>

            {/* Hoffmation Restart */}
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Hoffmation Update & Restart
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Aktualisiert Hoffmation vom Git-Repository und startet den Service neu.
              </p>
              <button
                onClick={handleRestartHoffmation}
                disabled={isRestarting}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-medium text-white transition-all hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Restart läuft...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Hoffmation neu starten
                  </>
                )}
              </button>
              {restartResult && (
                <div className={`mt-3 rounded-xl p-3 text-sm ${restartResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  <div className="flex items-center gap-2">
                    {restartResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span className="font-medium">
                      {restartResult.success ? restartResult.message : restartResult.error ?? 'Restart fehlgeschlagen'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* WebUI Update */}
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Download className="h-5 w-5" />
                WebUI Update
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Aktualisiert die WebUI vom Git-Repository (git pull, npm ci, build).
              </p>
              <button
                onClick={handleUpdateWebUI}
                disabled={isUpdating}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Update läuft...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    WebUI aktualisieren
                  </>
                )}
              </button>
              {updateResult && (
                <div className={`mt-3 rounded-xl p-3 text-sm ${updateResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {updateResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span className="font-medium">
                      {updateResult.success ? 'Update erfolgreich! Seite wird neu geladen...' : 'Update fehlgeschlagen'}
                    </span>
                  </div>
                  {updateResult.steps.length > 0 && (
                    <div className="space-y-1 text-xs">
                      {updateResult.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {step.success ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          <span>{step.step}</span>
                          {step.output && <span className="text-muted-foreground">– {step.output}</span>}
                          {step.error && <span className="text-red-500">– {step.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {updateResult.error && !updateResult.steps.length && (
                    <p className="text-xs">{updateResult.error}</p>
                  )}
                </div>
              )}
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

      {editingToken && (
        <TokenEditDialog
          token={editingToken}
          onSave={(updates) => handleUpdateToken(editingToken.label, updates)}
          onClose={() => setEditingToken(null)}
        />
      )}

      <BugReportsManagement
        isOpen={showBugReports}
        onClose={() => setShowBugReports(false)}
      />
      </div>
    </div>
  );
}
