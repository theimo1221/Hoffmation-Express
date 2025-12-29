import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FloorPlanView } from '@/views/FloorPlanView';
import { FavoritesView } from '@/views/FavoritesView';
import { RoomsView } from '@/views/RoomsView';
import { DevicesView } from '@/views/DevicesView';
import { SettingsView } from '@/views/SettingsView';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDataStore } from '@/stores/dataStore';

function App() {
  const { darkMode, pollingInterval } = useSettingsStore();
  const { fetchData } = useDataStore();

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollingInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, pollingInterval]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<FloorPlanView />} />
          <Route path="/floor/:floorLevel" element={<FloorPlanView />} />
          <Route path="/floor/:floorLevel/:roomId" element={<FloorPlanView />} />
          <Route path="/favorites" element={<FavoritesView />} />
          <Route path="/rooms" element={<RoomsView />} />
          <Route path="/rooms/:roomId" element={<RoomsView />} />
          <Route path="/devices" element={<DevicesView />} />
          <Route path="/devices/:deviceId" element={<DevicesView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
