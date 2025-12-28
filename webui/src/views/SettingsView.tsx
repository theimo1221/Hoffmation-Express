import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { Moon, Sun, Globe, RefreshCw, Server, Settings, Layers } from 'lucide-react';

export function SettingsView() {
  const { t, i18n } = useTranslation();
  const { 
    pollingInterval, 
    setPollingInterval, 
    darkMode, 
    setDarkMode,
    language,
    setLanguage,
    apiBaseUrl,
    setApiBaseUrl,
    expertMode,
    setExpertMode,
    excludedLevels,
    setExcludedLevels
  } = useSettingsStore();

  const allLevels = [
    { level: -1, name: 'Keller' },
    { level: 0, name: 'Erdgeschoss' },
    { level: 1, name: '1. OG' },
    { level: 2, name: '2. OG' },
    { level: 3, name: 'Dachboden' },
    { level: 99, name: 'Außen' },
  ];

  const toggleLevel = (level: number) => {
    if (excludedLevels.includes(level)) {
      setExcludedLevels(excludedLevels.filter(l => l !== level));
    } else {
      setExcludedLevels([...excludedLevels, level]);
    }
  };

  const handleLanguageChange = (lang: 'en' | 'de') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="p-4">
        <h1 className="text-2xl font-bold">{t('tabs.settings')}</h1>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-24">
        <div className="space-y-6">
          {/* Server URL */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Server URL
            </h2>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="w-full rounded-xl bg-card p-4 shadow-soft border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="http://localhost:8080"
            />
          </section>

          {/* Refresh Interval */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('settings.pollingInterval')}
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span>{pollingInterval} Sekunden</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5s</span>
                <span>60s</span>
                <span>120s</span>
              </div>
            </div>
          </section>

          {/* Dark Mode */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {t('settings.darkMode')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode('light')}
                className={`flex-1 rounded-xl p-4 shadow-soft transition-all ${
                  darkMode === 'light' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-accent'
                }`}
              >
                <Sun className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm">Hell</span>
              </button>
              <button
                onClick={() => setDarkMode('dark')}
                className={`flex-1 rounded-xl p-4 shadow-soft transition-all ${
                  darkMode === 'dark' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-accent'
                }`}
              >
                <Moon className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm">Dunkel</span>
              </button>
              <button
                onClick={() => setDarkMode('system')}
                className={`flex-1 rounded-xl p-4 shadow-soft transition-all ${
                  darkMode === 'system' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-accent'
                }`}
              >
                <span className="text-sm">System</span>
              </button>
            </div>
          </section>

          {/* Language */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('settings.language')}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('de')}
                className={`flex-1 rounded-xl p-4 shadow-soft transition-all ${
                  language === 'de' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-accent'
                }`}
              >
                🇩🇪 Deutsch
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 rounded-xl p-4 shadow-soft transition-all ${
                  language === 'en' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-accent'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </section>

          {/* Expert Mode */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Experten-Modus
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Zeige erweiterte Informationen</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={expertMode}
                    onChange={(e) => setExpertMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </div>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Zeigt Device-IDs, letzte Befehle und weitere technische Details an.
              </p>
            </div>
          </section>

          {/* Exclude Levels */}
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Ausgeblendete Etagen
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2">
              {allLevels.map(({ level, name }) => (
                <label key={level} className="flex items-center justify-between cursor-pointer py-2">
                  <span className="text-sm">{name}</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={excludedLevels.includes(level)}
                      onChange={() => toggleLevel(level)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                  </div>
                </label>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Ausgewählte Etagen werden in der Raumübersicht ausgeblendet.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
