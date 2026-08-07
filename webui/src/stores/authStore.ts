import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';
import { useSettingsStore } from './settingsStore';

const MOBILE_TOKEN_KEY = 'hf_mobile_token';

/**
 * Admins see the advanced settings by default. The role is only known once
 * authentication resolves, so this runs at every site that determines it.
 */
function applyRoleDefaults(isAdmin: boolean): void {
  if (isAdmin) useSettingsStore.getState().applyAdminExpertDefault();
}

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  needsBootstrap: boolean;
  serverMode: 'optional' | 'enforced' | null;
  hasMobileToken: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  retryStoredToken: () => Promise<boolean>;
  clearError: () => void;
  clearMobileToken: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isAdmin: false,
  isLoading: false,
  error: null,
  needsBootstrap: false,
  serverMode: null,
  hasMobileToken: !!localStorage.getItem(MOBILE_TOKEN_KEY),

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(username, password);
      const isAdmin = response.role === 'admin';
      set({
        isAuthenticated: true,
        isAdmin,
        isLoading: false,
      });
      applyRoleDefaults(isAdmin);
    } catch (error) {
      set({
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login fehlgeschlagen',
      });
      throw error;
    }
  },

  loginWithToken: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/auth/mobile-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Fehler ${res.status}`);
      }
      const data = (await res.json()) as { role: string };
      localStorage.setItem(MOBILE_TOKEN_KEY, token);
      const isAdmin = data.role === 'admin';
      set({
        isAuthenticated: true,
        isAdmin,
        isLoading: false,
        hasMobileToken: true,
        error: null,
      });
      applyRoleDefaults(isAdmin);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Token ungültig',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    localStorage.removeItem(MOBILE_TOKEN_KEY);
    try {
      await apiLogout();
      set({ isAuthenticated: false, isAdmin: false, isLoading: false, hasMobileToken: false });
    } catch {
      set({ isAuthenticated: false, isAdmin: false, isLoading: false, hasMobileToken: false });
    }
  },

  checkAuthStatus: async () => {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const roleCookie = cookies.find((c) => c.startsWith('hf_role='));
    const role = roleCookie?.split('=')[1];

    // The cookie only says what we were; the server says what we still are. Sessions live in
    // memory, so a restart invalidates them while the cookie happily survives - trusting it
    // here meant the app believed it was signed in and never tried to recover.
    let isAuthenticated = !!roleCookie;
    let needsBootstrap = false;
    let serverMode: 'optional' | 'enforced' = 'optional';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/auth/status', { credentials: 'include', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as {
          needsBootstrap: boolean;
          mode: 'optional' | 'enforced';
          authenticated?: boolean;
        };
        needsBootstrap = data.needsBootstrap;
        serverMode = data.mode;
        // Older servers do not report it; fall back to the cookie so nothing regresses.
        isAuthenticated = data.authenticated ?? !!roleCookie;
      }
    } catch {
      clearTimeout(timeout);
      // Server unreachable - keep what the cookie suggests rather than forcing a logout.
    }

    // Recover before publishing serverMode: the redirect effect reacts to it, and would bounce
    // to the login screen during the moment between "not authenticated" and a successful retry.
    if (!isAuthenticated) {
      isAuthenticated = await useAuthStore.getState().retryStoredToken();
    }

    set({
      needsBootstrap,
      serverMode,
      isAuthenticated,
      // retryStoredToken already published the role it got from the server.
      ...(isAuthenticated && !roleCookie ? {} : { isAdmin: role === 'admin' }),
    });
    if (role === 'admin') applyRoleDefaults(true);
  },

  /**
   * Signs back in with the token already on this device.
   *
   * Used both automatically and from the login screen, so a dropped session - an expired
   * cookie, a server restart, a server that was briefly offline - never means typing the
   * token in again.
   * @returns Whether a session could be established
   */
  retryStoredToken: async () => {
    const token = localStorage.getItem(MOBILE_TOKEN_KEY);
    if (!token) return false;
    try {
      const res = await fetch('/auth/mobile-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = (await res.json()) as { role: string };
        const isAdmin = data.role === 'admin';
        set({ isAuthenticated: true, isAdmin, hasMobileToken: true, error: null });
        applyRoleDefaults(isAdmin);
        return true;
      }
      // Only a 401 proves the token is gone for good; anything else may be a passing outage.
      if (res.status === 401) {
        localStorage.removeItem(MOBILE_TOKEN_KEY);
        set({ hasMobileToken: false, error: 'Geräte-Token ist nicht mehr gültig.' });
      } else {
        set({ error: `Server antwortete mit ${res.status}. Später erneut versuchen.` });
      }
      return false;
    } catch {
      set({ error: 'Server nicht erreichbar.' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearMobileToken: () => {
    localStorage.removeItem(MOBILE_TOKEN_KEY);
    set({ hasMobileToken: false });
  },
}));
