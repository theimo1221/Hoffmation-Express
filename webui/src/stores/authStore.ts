import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';

const MOBILE_TOKEN_KEY = 'hf_mobile_token';

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
      set({
        isAuthenticated: true,
        isAdmin: response.role === 'admin',
        isLoading: false,
      });
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
      set({
        isAuthenticated: true,
        isAdmin: data.role === 'admin',
        isLoading: false,
        hasMobileToken: true,
        error: null,
      });
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
    // Read role from cookie (set by backend on login)
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const roleCookie = cookies.find((c) => c.startsWith('hf_role='));
    let isAuthenticated = !!roleCookie;
    const role = roleCookie?.split('=')[1];
    set({ isAdmin: role === 'admin', isAuthenticated });

    // If no active session, try auto-login via stored mobile token
    if (!isAuthenticated) {
      const storedToken = localStorage.getItem(MOBILE_TOKEN_KEY);
      if (storedToken) {
        try {
          const res = await fetch('/auth/mobile-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: storedToken }),
          });
          if (res.ok) {
            const data = (await res.json()) as { role: string };
            isAuthenticated = true;
            set({ isAuthenticated: true, isAdmin: data.role === 'admin', hasMobileToken: true });
          } else {
            // Token expired or revoked — clear it so the user sees the login form
            localStorage.removeItem(MOBILE_TOKEN_KEY);
            set({ hasMobileToken: false });
          }
        } catch {
          // network error — leave token in place, try again next time
        }
      }
    }

    // Fetch server-side auth mode / bootstrap state
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/auth/status', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as { needsBootstrap: boolean; mode: 'optional' | 'enforced' };
        set({ needsBootstrap: data.needsBootstrap, serverMode: data.mode });
      } else {
        set({ serverMode: 'optional' });
      }
    } catch {
      clearTimeout(timeout);
      set({ serverMode: 'optional' });
    }
  },

  clearError: () => set({ error: null }),
  clearMobileToken: () => {
    localStorage.removeItem(MOBILE_TOKEN_KEY);
    set({ hasMobileToken: false });
  },
}));
