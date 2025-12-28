import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDataStore, type Device, getDeviceRoom } from '@/stores/dataStore';
import { Star, Zap, Lightbulb, Thermometer, Blinds, Power, RefreshCw } from 'lucide-react';
import { setLamp, setShutter, setActuator } from '@/api/devices';

function getFavoriteIds(): string[] {
  const stored = localStorage.getItem('hoffmation-favorites');
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function FavoritesView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { devices, fetchData, isLoading } = useDataStore();
  const [favoriteIds] = useState<string[]>(getFavoriteIds());

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const favoriteDevices = Object.values(devices).filter(
    (d) => d.id && favoriteIds.includes(d.id)
  );

  if (isLoading && Object.keys(devices).length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('tabs.home')}</h1>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4" />
            {t('home.favorites')}
          </h2>
          
          {favoriteDevices.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 shadow-soft text-center text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('home.noFavorites')}</p>
              <p className="text-sm mt-2">{t('home.addFavoritesHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteDevices.map((device) => (
                <DeviceQuickCard key={device.id} device={device} onSelect={() => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface DeviceQuickCardProps {
  device: Device;
  onSelect: () => void;
}

function DeviceQuickCard({ device, onSelect }: DeviceQuickCardProps) {
  const { fetchDevice } = useDataStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const info = device.info ?? device._info;
  const name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = getDeviceRoom(device);
  const isOn = device.lightOn ?? device._lightOn ?? device.actuatorOn ?? device._actuatorOn ?? device.on ?? device._on ?? false;
  const capabilities = device.deviceCapabilities ?? [];
  
  // Capability constants (from hoffmation-base DeviceCapability enum)
  const CAP_ACTUATOR = 1;
  const CAP_LAMP = 8;
  const CAP_DIMMABLE = 9;
  const CAP_SHUTTER = 11;
  const CAP_TEMP_SENSOR = 12;
  const CAP_LED = 18;
  
  const hasLamp = capabilities.includes(CAP_LAMP) || capabilities.includes(CAP_DIMMABLE) || capabilities.includes(CAP_LED);
  const hasShutter = capabilities.includes(CAP_SHUTTER);
  const hasActuator = capabilities.includes(CAP_ACTUATOR) && !hasLamp;
  const hasTemp = capabilities.includes(CAP_TEMP_SENSOR);
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  const currentLevel = device._currentLevel ?? -1;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleToggleLamp = async () => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setLamp(device.id, !isOn);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to toggle lamp:', e);
    }
    setIsLoading(false);
  };

  const handleToggleActuator = async () => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setActuator(device.id, !isOn);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to toggle actuator:', e);
    }
    setIsLoading(false);
  };

  const handleShutter = async (level: number) => {
    if (!device.id) return;
    setIsLoading(true);
    try {
      await setShutter(device.id, level);
      await delay(300);
      await fetchDevice(device.id);
    } catch (e) {
      console.error('Failed to set shutter:', e);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft">
      <button 
        onClick={onSelect}
        className="flex items-center gap-3 text-left flex-1 min-w-0"
      >
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          hasLamp || hasActuator ? (isOn ? 'bg-yellow-500' : 'bg-primary/10') : 'bg-primary/10'
        }`}>
          {hasLamp ? (
            <Lightbulb className={`h-6 w-6 ${isOn ? 'text-white' : 'text-primary'}`} />
          ) : hasShutter ? (
            <Blinds className="h-6 w-6 text-primary" />
          ) : hasActuator ? (
            <Power className={`h-6 w-6 ${isOn ? 'text-white' : 'text-primary'}`} />
          ) : hasTemp ? (
            <Thermometer className="h-6 w-6 text-primary" />
          ) : (
            <Zap className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{name}</span>
          <span className="text-sm text-muted-foreground truncate">{room}</span>
        </div>
      </button>

      <div className="flex items-center gap-2">
        {hasTemp && temp !== undefined && (
          <span className="text-lg font-semibold">{temp.toFixed(1)}°C</span>
        )}
        {hasShutter && (
          <div className="flex gap-1">
            <button 
              onClick={() => handleShutter(0)}
              disabled={isLoading}
              className="rounded-lg px-2 py-1 text-xs font-medium bg-secondary hover:bg-accent disabled:opacity-50"
            >
              Zu
            </button>
            <button 
              onClick={() => handleShutter(100)}
              disabled={isLoading}
              className="rounded-lg px-2 py-1 text-xs font-medium bg-secondary hover:bg-accent disabled:opacity-50"
            >
              Auf
            </button>
            {currentLevel >= 0 && (
              <span className="text-xs text-muted-foreground ml-1">{currentLevel.toFixed(0)}%</span>
            )}
          </div>
        )}
        {hasLamp && (
          <button 
            onClick={handleToggleLamp}
            disabled={isLoading}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              isOn 
                ? 'bg-yellow-500 text-white' 
                : 'bg-secondary hover:bg-accent'
            }`}
          >
            {isOn ? 'An' : 'Aus'}
          </button>
        )}
        {hasActuator && (
          <button 
            onClick={handleToggleActuator}
            disabled={isLoading}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              isOn 
                ? 'bg-green-500 text-white' 
                : 'bg-secondary hover:bg-accent'
            }`}
          >
            {isOn ? 'An' : 'Aus'}
          </button>
        )}
      </div>
    </div>
  );
}
