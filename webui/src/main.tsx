import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import './i18n';

// registerType is 'autoUpdate', so a newly discovered service worker activates
// and reloads on its own. The browser only looks for one on a hard navigation
// though, which an installed PWA resumed from the background never does - it
// would keep serving the bundle it was installed with. Poll explicitly instead.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => void registration.update();
    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename="/ui">
      <App />
    </BrowserRouter>
  </StrictMode>
);
