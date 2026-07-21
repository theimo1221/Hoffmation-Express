import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FloorPlanView } from '@/views/FloorPlanView';
import { FavoritesView } from '@/views/FavoritesView';
import { RoomsView } from '@/views/RoomsView';
import { DevicesView } from '@/views/DevicesView';
import { SettingsView } from '@/views/SettingsView';
import { LoginView } from '@/views/LoginView';
import { AdminView } from '@/views/AdminView';
import { CockpitView } from '@/views/CockpitView';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from '@/components/OfflineBanner';

function App() {
  const { darkMode, pollingInterval } = useSettingsStore();
  const { fetchRooms, fetchDevices } = useDataStore();
  const { checkAuthStatus, needsBootstrap, serverMode, isAuthenticated } = useAuthStore();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode === 'dark') {
      root.classList.add('dark');
    } else if (darkMode === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [darkMode]);

  // Load rooms once on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Check auth status on mount and when the PWA resumes from background
  useEffect(() => {
    checkAuthStatus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuthStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAuthStatus]);

  // Redirect to login when bootstrap needed or enforced mode without session
  useEffect(() => {
    if (serverMode === null) return; // not yet fetched
    if (location.pathname === '/login') return; // already there
    if (needsBootstrap || (serverMode === 'enforced' && !isAuthenticated)) {
      navigate('/login', { replace: true });
    }
  }, [needsBootstrap, serverMode, isAuthenticated, navigate, location.pathname]);

  // Poll devices regularly
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, pollingInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchDevices, pollingInterval]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <OfflineBanner isOnline={isOnline} />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="/" element={<FloorPlanView />} />
          <Route path="/floor/:floorLevel" element={<FloorPlanView />} />
          <Route path="/floor/:floorLevel/:roomId" element={<FloorPlanView />} />
          <Route path="/favorites" element={<FavoritesView />} />
          <Route path="/rooms" element={<RoomsView />} />
          <Route path="/rooms/:roomId" element={<RoomsView />} />
          <Route path="/devices" element={<DevicesView />} />
          <Route path="/devices/:deviceId" element={<DevicesView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/cockpit" element={<CockpitView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
