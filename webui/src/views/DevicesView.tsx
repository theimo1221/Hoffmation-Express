import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore, type Device, filterDevicesForExpertMode } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Search, Lightbulb, Blinds, Thermometer, Camera, Speaker, Zap } from 'lucide-react';
import { DeviceDetailView } from './DeviceDetailView';
import { DeviceIcon, getDeviceStatusColor } from '@/components/DeviceIcon';
import { PageHeader } from '@/components/layout/PageHeader';

export enum DeviceCapability {
  ac = 0,
  actuator = 1,
  lamp = 8,
  dimmablelamp = 9,
  shutter = 11,
  temperatureSensor = 12,
  speaker = 14,
  camera = 105,
}

const CAPABILITY_FILTERS = [
  { capability: null, label: 'Alle', icon: Zap },
  { capability: DeviceCapability.lamp, label: 'Licht', icon: Lightbulb },
  { capability: DeviceCapability.shutter, label: 'Rolladen', icon: Blinds },
  { capability: DeviceCapability.temperatureSensor, label: 'Klima', icon: Thermometer },
  { capability: DeviceCapability.camera, label: 'Kamera', icon: Camera },
  { capability: DeviceCapability.speaker, label: 'Audio', icon: Speaker },
];

export function DevicesView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deviceId } = useParams<{ deviceId?: string }>();
  const { devices, fetchData, isLoading } = useDataStore();
  const { expertMode } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState<number | null>(null);

  // Get selected device from URL param
  const selectedDevice = deviceId ? devices[decodeURIComponent(deviceId)] : null;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => navigate(-1)} />;
  }

  // Filter devices by expert mode first, then by search/capability
  const filteredByExpertMode = filterDevicesForExpertMode(Object.values(devices), expertMode);
  
  const deviceList = filteredByExpertMode.filter((device) => {
    const info = device.info ?? device._info;
    const name = info?.customName ?? info?._customName ?? info?.fullName ?? '';
    const room = info?.room ?? '';
    const capabilities = device.deviceCapabilities ?? [];

    const matchesSearch =
      search === '' ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      room.toLowerCase().includes(search.toLowerCase());

    const matchesCapability =
      capabilityFilter === null ||
      capabilities.includes(capabilityFilter);

    return matchesSearch && matchesCapability;
  });

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
        title={t('tabs.devices')}
        onRefresh={fetchData}
        isLoading={isLoading}
      >
        <div className="relative mt-3">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-secondary py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {CAPABILITY_FILTERS.map(({ capability, label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setCapabilityFilter(capability)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
                capabilityFilter === capability
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
          {deviceList.map((device) => (
            <DeviceCard key={device.id} device={device} onClick={() => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)} />
          ))}
          {deviceList.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Keine Geräte gefunden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeviceCardProps {
  device: Device;
  onClick: () => void;
}

function DeviceCard({ device, onClick }: DeviceCardProps) {
  const info = device.info ?? device._info;
  const name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = info?.room ?? '';

  return (
    <button 
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          getDeviceStatusColor(device)
        )}>
          <DeviceIcon device={device} size="md" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-medium">{name}</span>
          <span className="text-sm text-muted-foreground">{room}</span>
        </div>
      </div>
    </button>
  );
}
