import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  needsBootstrap: boolean;
  serverMode: 'optional' | 'enforced' | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isAdmin: false,
  isLoading: false,
  error: null,
  needsBootstrap: false,
  serverMode: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(username, password);
      set({ 
        isAuthenticated: true, 
        isAdmin: response.role === 'admin',
        isLoading: false 
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login fehlgeschlagen'
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiLogout();
      set({ isAuthenticated: false, isAdmin: false, isLoading: false });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ isAuthenticated: false, isAdmin: false, isLoading: false });
    }
  },

  checkAuthStatus: async () => {
    // Read role from cookie (set by backend on login)
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const roleCookie = cookies.find((c) => c.startsWith('hf_role='));
    const isAuthenticated = !!roleCookie;
    const role = roleCookie?.split('=')[1];
    set({ isAdmin: role === 'admin', isAuthenticated });

    // Fetch server-side auth status to detect bootstrap need
    try {
      const res = await fetch('/auth/status');
      if (res.ok) {
        const data = (await res.json()) as { needsBootstrap: boolean; mode: 'optional' | 'enforced' };
        set({ needsBootstrap: data.needsBootstrap, serverMode: data.mode });
      }
    } catch {
      // network error — keep defaults
    }
  },

  clearError: () => set({ error: null }),
}));
