import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDataStore, type Device, getDeviceRoom, getDeviceName, getRoomEtage, getRoomName, isDeviceUnreachable, isDeviceOn, isLampDevice, isShutterDevice, isActuatorDevice, isTempSensorDevice, getDeviceTemperature, getDeviceShutterLevel } from '@/stores/dataStore';
import { Star, Zap, Lightbulb, Thermometer, Blinds, Power, WifiOff, BatteryLow, ChevronRight, ChevronDown, Printer } from 'lucide-react';
import { setLamp, setActuator, setShutter } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';
import { DeviceIcon } from '@/components/DeviceIcon';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const [showUnreachable, setShowUnreachable] = useState(false);
  const [showLowBattery, setShowLowBattery] = useState(false);

  const handlePrintUnreachable = () => {
    // Group devices by floor
    const { rooms } = useDataStore.getState();
    const devicesByFloor: Record<number, Array<{ device: Device; roomName: string; floor: number }>> = {};

    unreachableDevices.forEach((device) => {
      const deviceRoomName = getDeviceRoom(device);
      
      // Find room by matching device's room name with getRoomName(room)
      // This matches the logic used throughout the app (e.g., in FloorPlan, RoomDetail)
      const room = Object.values(rooms).find((r) => {
        return getRoomName(r).toLowerCase() === deviceRoomName.toLowerCase();
      });
      
      // Use getRoomEtage() which already handles all the logic
      const floor = room ? getRoomEtage(room) : 99;

      if (!devicesByFloor[floor]) {
        devicesByFloor[floor] = [];
      }
      devicesByFloor[floor].push({ device, roomName: deviceRoomName, floor });
    });

    // Create print content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sortedFloors = Object.keys(devicesByFloor).map(Number).sort((a, b) => b - a);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Unerreichbare Geräte - Todo Liste</title>
        <style>
          @media print {
            @page { margin: 1.5cm; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.3;
            color: #333;
            font-size: 10pt;
            margin: 0;
            padding: 0;
          }
          h1 {
            color: #dc2626;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 5px;
            margin: 0 0 10px 0;
            font-size: 16pt;
          }
          .summary {
            background: #f3f4f6;
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            display: flex;
            gap: 20px;
            font-size: 9pt;
          }
          h2 {
            color: #1f2937;
            margin: 15px 0 8px 0;
            font-size: 12pt;
            font-weight: 600;
          }
          .page-break {
            page-break-before: always;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9pt;
          }
          th {
            background: #f3f4f6;
            padding: 6px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #d1d5db;
          }
          td {
            padding: 4px 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:hover {
            background: #f9fafb;
          }
          .checkbox-col {
            width: 30px;
            text-align: center;
          }
          .room-col {
            width: 25%;
          }
          .device-col {
            width: auto;
          }
          .checkbox {
            width: 12px;
            height: 12px;
            border: 1.5px solid #9ca3af;
            border-radius: 2px;
            display: inline-block;
          }
          .device-icon {
            margin-right: 4px;
          }
          .print-date {
            color: #6b7280;
            font-size: 8pt;
            margin-top: 15px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <h1>🔴 Unerreichbare Geräte</h1>
        <div class="summary">
          <span><strong>Geräte:</strong> ${unreachableDevices.length}</span>
          <span><strong>Etagen:</strong> ${sortedFloors.length}</span>
          <span><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</span>
        </div>
    `;

    sortedFloors.forEach((floor, index) => {
      const floorName = floor === 0 ? 'Erdgeschoss' : floor === 1 ? '1. Obergeschoss' : floor === 2 ? '2. Obergeschoss' : `Etage ${floor}`;
      // Add page break before each floor except the first one
      const pageBreakClass = index > 0 ? ' class="page-break"' : '';
      html += `<h2${pageBreakClass}>📍 ${floorName}</h2>`;
      html += `
        <table>
          <thead>
            <tr>
              <th class="checkbox-col">✓</th>
              <th class="room-col">Raum</th>
              <th class="device-col">Gerät</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // Sort by room name
      const sortedDevices = devicesByFloor[floor].sort((a, b) => a.roomName.localeCompare(b.roomName));
      
      sortedDevices.forEach(({ device, roomName }) => {
        const deviceName = getDeviceName(device);
        const capabilities = device.deviceCapabilities ?? [];
        
        // Determine icon based on capabilities
        let icon = '📱'; // Default
        if (capabilities.includes(10)) icon = '👤'; // Motion sensor
        else if (capabilities.includes(12)) icon = '🌡️'; // Temperature sensor
        else if (capabilities.includes(15)) icon = '🚪'; // Handle sensor
        else if (capabilities.includes(8) || capabilities.includes(9) || capabilities.includes(18)) icon = '💡'; // Lamp/LED
        else if (capabilities.includes(11)) icon = '🪟'; // Shutter
        else if (capabilities.includes(1)) icon = '🔌'; // Actuator
        else if (capabilities.includes(5)) icon = '🔥'; // Heater
        else if (capabilities.includes(0)) icon = '❄️'; // AC
        else if (capabilities.includes(14)) icon = '🔊'; // Speaker
        else if (capabilities.includes(6)) icon = '💧'; // Humidity
        else if (capabilities.includes(7)) icon = '☁️'; // CO2
        else if (capabilities.includes(103)) icon = '⚡'; // Scene
        
        html += `
          <tr>
            <td class="checkbox-col"><span class="checkbox"></span></td>
            <td class="room-col">${roomName}</td>
            <td class="device-col"><span class="device-icon">${icon}</span>${deviceName}</td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
    });

    html += `
        <div class="print-date">
          Erstellt am ${new Date().toLocaleString('de-DE')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allDevices = Object.values(devices);
  
  const favoriteDevices = allDevices.filter(
    (d) => d.id && favoriteIds.includes(d.id)
  );

  // Unreachable devices: Use central isDeviceUnreachable() function
  const unreachableDevices = allDevices.filter(isDeviceUnreachable);

  // Low battery devices: batteryLevel < 20%
  const lowBatteryDevices = allDevices.filter((d) => {
    const batteryLevel = d.battery?.level ?? d.batteryLevel;
    return batteryLevel !== undefined && batteryLevel < 20;
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
                  const batteryLevel = device.battery?.level ?? device.batteryLevel ?? 0;
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
