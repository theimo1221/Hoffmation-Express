import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDataStore, type Device, getDeviceRoom, getDeviceName, isDeviceUnreachable, isDeviceOn, isLampDevice, isShutterDevice, isActuatorDevice, isTempSensorDevice, getDeviceTemperature, getDeviceShutterLevel, getDeviceBattery } from '@/stores';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { Star, Zap, Lightbulb, Thermometer, Blinds, Power, WifiOff, BatteryLow, ChevronRight, ChevronDown, Printer } from 'lucide-react';
import { setLamp, setActuator, setShutter } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';
import { DeviceIcon } from '@/components/DeviceIcon';
import { PageHeader } from '@/components/layout/PageHeader';
import { printUnreachableDevices, LOW_BATTERY_THRESHOLD } from '@/lib/printUtils';

export function FavoritesView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { devices, rooms, fetchData, isLoading } = useDataStore();
  const { favoriteIds } = useFavoritesStore();
  const [showUnreachable, setShowUnreachable] = useState(false);
  const [showLowBattery, setShowLowBattery] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allDevices = Object.values(devices);
  
  const favoriteDevices = allDevices.filter(
    (d) => d.id && favoriteIds.includes(d.id)
  );

  // Unreachable devices: Use central isDeviceUnreachable() function
  const unreachableDevices = allDevices.filter(isDeviceUnreachable);

  // Low battery devices: Use centralized threshold
  const lowBatteryDevices = allDevices.filter((d) => {
    const batteryLevel = d.battery?.level ?? d.batteryLevel;
    return batteryLevel !== undefined && batteryLevel < LOW_BATTERY_THRESHOLD;
  });

  const handlePrintUnreachable = () => {
    printUnreachableDevices(unreachableDevices, rooms);
  };

  if (isLoading && Object.keys(devices).length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('tabs.home')}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="content-container py-4">
          {/* Unreachable Devices Section */}
        {unreachableDevices.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowUnreachable(!showUnreachable)}
                className="flex items-center gap-2 flex-1"
              >
                <h2 className="text-sm font-medium uppercase text-red-500 flex items-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  Unerreichbare Geräte ({unreachableDevices.length})
                </h2>
                {showUnreachable ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              <button
                onClick={handlePrintUnreachable}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-secondary hover:bg-accent transition-colors"
                title="Todo-Liste drucken"
              >
                <Printer className="h-4 w-4" />
                Drucken
              </button>
            </div>
            
            {showUnreachable && (
              <div className="space-y-2">
                {unreachableDevices.map((device) => (
                  <CompactDeviceCard 
                    key={device.id} 
                    device={device} 
                    onSelect={() => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
                    badge={<WifiOff className="h-4 w-4 text-red-500" />}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Low Battery Devices Section */}
        {lowBatteryDevices.length > 0 && (
          <section className="mb-6">
            <button
              onClick={() => setShowLowBattery(!showLowBattery)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h2 className="text-sm font-medium uppercase text-orange-500 flex items-center gap-2">
                <BatteryLow className="h-4 w-4" />
                Schwache Batterie ({lowBatteryDevices.length})
              </h2>
              {showLowBattery ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            
            {showLowBattery && (
              <div className="space-y-2">
                {lowBatteryDevices.map((device) => {
                  const batteryLevel = getDeviceBattery(device) ?? 0;
                  return (
                    <CompactDeviceCard 
                      key={device.id} 
                      device={device} 
                      onSelect={() => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
                      badge={<span className="text-xs font-mono text-orange-500">{batteryLevel}%</span>}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Favorites Section */}
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
    </div>
  );
}

interface CompactDeviceCardProps {
  device: Device;
  onSelect: () => void;
  badge?: React.ReactNode;
}

function CompactDeviceCard({ device, onSelect, badge }: CompactDeviceCardProps) {
  const name = getDeviceName(device);
  const room = getDeviceRoom(device);

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between rounded-xl bg-card p-3 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <DeviceIcon device={device} size="sm" />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-xs text-muted-foreground truncate">{room}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

interface DeviceQuickCardProps {
  device: Device;
  onSelect: () => void;
}

function DeviceQuickCard({ device, onSelect }: DeviceQuickCardProps) {
  const { fetchDevice } = useDataStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const name = getDeviceName(device);
  const room = getDeviceRoom(device);
  const isOn = isDeviceOn(device);
  
  const hasLamp = isLampDevice(device);
  const hasShutter = isShutterDevice(device);
  const hasActuator = isActuatorDevice(device) && !hasLamp;
  const hasTemp = isTempSensorDevice(device);
  const temp = getDeviceTemperature(device);
  const currentLevel = getDeviceShutterLevel(device);

  const handleToggleLamp = async () => {
    await executeDeviceAction(
      device,
      (id) => setLamp(id, !isOn),
      async () => { if (device.id) await fetchDevice(device.id); },
      setIsLoading
    );
  };

  const handleToggleActuator = async () => {
    await executeDeviceAction(
      device,
      (id) => setActuator(id, !isOn),
      async () => { if (device.id) await fetchDevice(device.id); },
      setIsLoading
    );
  };

  const handleShutter = async (level: number) => {
    await executeDeviceAction(
      device,
      (id) => setShutter(id, level),
      async () => { if (device.id) await fetchDevice(device.id); },
      setIsLoading
    );
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
