import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout } from '@/api/auth';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
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
    const cookies = document.cookie.split(';').map(c => c.trim());
    const roleCookie = cookies.find(c => c.startsWith('hf_role='));
    if (roleCookie) {
      const role = roleCookie.split('=')[1];
      set({ isAdmin: role === 'admin', isAuthenticated: true });
    } else {
      set({ isAdmin: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
