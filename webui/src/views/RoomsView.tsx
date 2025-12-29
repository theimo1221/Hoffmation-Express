import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataStore, type Room, type Device, type GroupData, getRoomName, getRoomEtage, getRoomStats, getDeviceRoom, getDeviceName, filterDevicesForExpertMode } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateGroupSettings, type HeatGroupSettings } from '@/api/rooms';
import { cn } from '@/lib/utils';
import { ChevronRight, Thermometer, Lightbulb, AirVent, ArrowLeft, Blinds, Search, Settings } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MenuButton } from '@/components/layout/MenuBubble';
import { DeviceDetailView } from './DeviceDetailView';
import { DeviceIcon } from '@/components/DeviceIcon';
import { RoomSettingsSection } from '@/components/RoomSettingsSection';

export function RoomsView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const { rooms, devices, floors, fetchData, isLoading } = useDataStore();
  const { excludedLevels } = useSettingsStore();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ room: Room; groupType: string; group: GroupData } | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Get selected room from URL param
  const selectedRoom = roomId ? Object.values(rooms).find(r => (r.id ?? getRoomName(r)) === decodeURIComponent(roomId)) : null;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => setSelectedDevice(null)} />;
  }

  if (selectedGroup && selectedRoom) {
    return (
      <GroupDetailView 
        room={selectedGroup.room}
        groupType={selectedGroup.groupType}
        group={selectedGroup.group}
        devices={devices}
        onBack={() => setSelectedGroup(null)}
        onSelectDevice={setSelectedDevice}
      />
    );
  }

  const roomList = Object.values(rooms).filter(
    (room) => {
      const level = getRoomEtage(room);
      if (excludedLevels.includes(level)) return false;
      if (floorFilter !== null && level !== floorFilter) return false;
      if (search) {
        const roomName = getRoomName(room).toLowerCase();
        return roomName.includes(search.toLowerCase());
      }
      return true;
    }
  );

  // Filter floors to exclude hidden levels
  const visibleFloors = floors.filter(f => !excludedLevels.includes(f.level));

  if (isLoading && Object.keys(rooms).length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (selectedRoom) {
    return (
      <RoomDetail 
        room={selectedRoom} 
        devices={devices} 
        onBack={() => navigate(-1)} 
        onSelectDevice={setSelectedDevice}
        onSelectGroup={(room, groupType, group) => setSelectedGroup({ room, groupType, group })}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('tabs.rooms')}
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
          <button
            onClick={() => setFloorFilter(null)}
            className={cn(
              'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
              floorFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            Alle
          </button>
          {visibleFloors.map((floor) => (
            <button
              key={floor.level}
              onClick={() => setFloorFilter(floor.level)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
                floorFilter === floor.level
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
          {roomList.map((room) => (
            <button
              key={room.id ?? getRoomName(room)}
              onClick={() => navigate(`/rooms/${encodeURIComponent(room.id ?? getRoomName(room))}`)}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all duration-200 hover:shadow-soft-lg active:scale-[0.98]"
            >
              <RoomCardContent room={room} devices={devices} />
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RoomDetailProps {
  room: Room;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
  onSelectGroup: (room: Room, groupType: string, group: GroupData) => void;
}

interface RoomCardContentProps {
  room: Room;
  devices: Record<string, import('@/stores/dataStore').Device>;
}

function RoomCardContent({ room, devices }: RoomCardContentProps) {
  const stats = getRoomStats(room, devices);

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-lg font-semibold">
        {getRoomName(room)}
      </span>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {stats.temperature !== undefined && (
          <span className="flex items-center gap-1">
            <Thermometer className="h-4 w-4" />
            {stats.temperature.toFixed(1)}°C
          </span>
        )}
        {stats.lampsTotal > 0 && (
          <span className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            {stats.lampsOn}/{stats.lampsTotal}
          </span>
        )}
        {stats.acTotal > 0 && (
          <span className="flex items-center gap-1">
            <AirVent className="h-4 w-4" />
            {stats.acOn}/{stats.acTotal}
          </span>
        )}
      </div>
    </div>
  );
}

function RoomDetail({ room, devices, onBack, onSelectDevice, onSelectGroup }: RoomDetailProps) {
  const { expertMode } = useSettingsStore();
  const groupTypes = room.groupdict ? Object.keys(room.groupdict) : [];
  const roomName = getRoomName(room);
  
  // Get devices for this room, filtered by expert mode
  const allRoomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  const roomDevices = filterDevicesForExpertMode(allRoomDevices, expertMode);

  return (
    <div className="flex h-full flex-col">
      <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl flex items-center gap-4 p-4">
          <MenuButton />
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{roomName}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Groups - full width on top */}
          {groupTypes.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                Gruppen
              </h2>
              <div className="flex flex-wrap gap-2">
                {groupTypes.includes('3') && room.groupdict?.['3'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '3', room.groupdict!['3'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Lightbulb className="inline h-4 w-4 mr-2" />
                    Licht
                  </button>
                )}
                {groupTypes.includes('8') && room.groupdict?.['8'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '8', room.groupdict!['8'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Thermometer className="inline h-4 w-4 mr-2" />
                    Heizung
                  </button>
                )}
                {groupTypes.includes('0') && room.groupdict?.['0'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '0', room.groupdict!['0'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Blinds className="inline h-4 w-4 mr-2" />
                    Fenster
                  </button>
                )}
                {groupTypes.includes('9') && room.groupdict?.['9'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '9', room.groupdict!['9'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <AirVent className="inline h-4 w-4 mr-2" />
                    Klimaanlage
                  </button>
                )}
              </div>
            </section>
          )}

          {/* 2-column layout: Devices left (2/5), Settings right (3/5) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column: Devices (2/5 on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              <section>
                <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Raum-Info
                </h2>
                <div className="rounded-2xl bg-card p-4 shadow-soft text-muted-foreground">
                  <p>Etage: {room.info?.etage ?? 'Unbekannt'}</p>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Geräte ({roomDevices.length})
                </h2>
                <div className="space-y-3">
                  {roomDevices.map((device) => {
                    const name = getDeviceName(device, roomName);
                    return (
                      <button
                        key={device.id ?? name}
                        onClick={() => onSelectDevice(device)}
                        className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <DeviceIcon device={device} size="md" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{name}</span>
                            <DeviceStatusBadges device={device} />
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    );
                  })}
                  {roomDevices.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Keine Geräte gefunden
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right column: Room Settings (3/5 on large screens) */}
            <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
              <RoomSettingsSection room={room} onUpdate={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GroupDetailViewProps {
  room: Room;
  groupType: string;
  group: GroupData;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
}

function GroupDetailView({ room, groupType, group, devices, onBack, onSelectDevice }: GroupDetailViewProps) {
  const roomName = getRoomName(room);
  const { fetchData } = useDataStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Heat group settings state
  const heatSettings = (group.settings as HeatGroupSettings | undefined) ?? {};
  const [localHeatSettings, setLocalHeatSettings] = useState<HeatGroupSettings>({
    automaticMode: heatSettings.automaticMode ?? true,
    automaticFallBackTemperatur: heatSettings.automaticFallBackTemperatur ?? 20,
    manualTemperature: heatSettings.manualTemperature ?? 20,
  });
  
  const groupTypeNames: Record<string, string> = {
    '0': 'Fenster',
    '1': 'Fenster',
    '2': 'Präsenz',
    '3': 'Licht',
    '4': 'Schalter',
    '5': 'Lautsprecher',
    '6': 'Rauchmelder',
    '7': 'Wasser',
    '8': 'Heizung',
    '9': 'Klimaanlage',
  };
  
  const groupName = groupTypeNames[groupType] || `Gruppe ${groupType}`;
  const isHeatGroup = groupType === '8';
  
  // Get devices for this room that match the group type
  const roomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  
  // Filter devices by group type capability
  const groupCapabilities: Record<string, number[]> = {
    '0': [11], // Shutter
    '3': [8, 9, 18], // Lamp, Dimmable, LED
    '8': [5], // Heater
    '9': [0], // AC
  };
  
  const relevantCaps = groupCapabilities[groupType] || [];
  const groupDevices = relevantCaps.length > 0 
    ? roomDevices.filter(d => {
        const caps = d.deviceCapabilities ?? [];
        return relevantCaps.some(c => caps.includes(c));
      })
    : roomDevices;

  const handleSaveSettings = async () => {
    if (!group.id) return;
    setIsSaving(true);
    try {
      await updateGroupSettings(group.id, localHeatSettings);
      await fetchData();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save group settings:', error);
      alert('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{groupName}</h1>
          <p className="text-sm text-muted-foreground">{roomName}</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 pb-tabbar">
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Gruppen-Info
          </h2>
          <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gruppen-ID</span>
              <span className="font-mono">{group.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typ</span>
              <span>{groupName}</span>
            </div>
          </div>
        </section>

        {/* Heat Group Settings */}
        {isHeatGroup && (
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Heizgruppen-Einstellungen
            </h2>
            <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Bearbeiten</span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    isEditing ? "bg-primary" : "bg-secondary"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    isEditing ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className={`space-y-4 ${!isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <span>Automatik-Modus</span>
                  <button
                    onClick={() => setLocalHeatSettings(s => ({ ...s, automaticMode: !s.automaticMode }))}
                    disabled={!isEditing}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-colors",
                      localHeatSettings.automaticMode ? "bg-primary" : "bg-secondary"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      localHeatSettings.automaticMode ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Fallback-Temperatur (Automatik)</span>
                    <span className="font-mono">{localHeatSettings.automaticFallBackTemperatur}°C</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={25}
                    step={0.5}
                    value={localHeatSettings.automaticFallBackTemperatur}
                    onChange={(e) => setLocalHeatSettings(s => ({ ...s, automaticFallBackTemperatur: parseFloat(e.target.value) }))}
                    disabled={!isEditing}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Manuelle Temperatur</span>
                    <span className="font-mono">{localHeatSettings.manualTemperature}°C</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={25}
                    step={0.5}
                    value={localHeatSettings.manualTemperature}
                    onChange={(e) => setLocalHeatSettings(s => ({ ...s, manualTemperature: parseFloat(e.target.value) }))}
                    disabled={!isEditing}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              {isEditing && (
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Speichern...' : 'Einstellungen speichern'}
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Geräte ({groupDevices.length})
          </h2>
          <div className="space-y-3">
            {groupDevices.map((device) => {
              const name = getDeviceName(device, roomName);
              return (
                <button
                  key={device.id ?? name}
                  onClick={() => onSelectDevice(device)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <DeviceIcon device={device} size="md" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
            {groupDevices.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Keine Geräte in dieser Gruppe
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DeviceStatusBadges({ device }: { device: Device }) {
  const capabilities = device.deviceCapabilities ?? [];
  const badges: React.ReactNode[] = [];

  // Capability constants
  const CAP_MOTION_SENSOR = 10;
  const CAP_HEATER = 5;
  const CAP_DIMMABLE = 9;
  const CAP_LED = 18;
  const CAP_LAMP = 8;
  const CAP_SHUTTER = 11;
  const CAP_TEMP_SENSOR = 12;
  const CAP_ACTUATOR = 1;
  const CAP_HANDLE_SENSOR = 15;

  // Window handle sensor: show position (priority over temp)
  if (capabilities.includes(CAP_HANDLE_SENSOR)) {
    const position = device.handleSensor?.position ?? device.position ?? -1;
    if (position >= 0) {
      const positionText = position === 0 ? 'Geschlossen' : position === 1 ? 'Gekippt' : 'Offen';
      const positionColor = position === 0 ? 'text-green-500' : position === 1 ? 'text-orange-500' : 'text-red-500';
      badges.push(
        <span key="handle" className={`text-xs ${positionColor}`}>
          {positionText}
        </span>
      );
    }
  }

  // Motion sensor: show active status and detections today
  if (capabilities.includes(CAP_MOTION_SENSOR)) {
    const movementDetected = device.movementDetected ?? device._movementDetected ?? false;
    const detectionsToday = device._detectionsToday ?? device.detectionsToday ?? -1;
    
    if (movementDetected) {
      badges.push(
        <span key="motion-active" className="text-xs text-green-500 font-medium">
          Bewegung!
        </span>
      );
    }
    if (detectionsToday >= 0) {
      badges.push(
        <span key="motion" className="text-xs text-muted-foreground">
          {detectionsToday}x heute
        </span>
      );
    }
  }

  // Heater: show ist/soll temps and valve level
  if (capabilities.includes(CAP_HEATER)) {
    const istTemp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
    const sollTemp = device.desiredTemp ?? device._desiredTemperatur ?? -99;
    const valveLevel = (device._level ?? -0.01) * 100;
    
    const parts: string[] = [];
    if (istTemp !== undefined && istTemp !== -99) {
      parts.push(`${istTemp.toFixed(1)}°`);
    }
    if (sollTemp !== -99) {
      parts.push(`→${sollTemp.toFixed(1)}°`);
    }
    if (valveLevel >= 0 && valveLevel <= 100) {
      parts.push(`${Math.round(valveLevel)}%`);
    }
    
    if (parts.length > 0) {
      badges.push(
        <span key="heater" className="text-xs text-muted-foreground">
          {parts.join(' ')}
        </span>
      );
    }
  }

  // Temperature sensor (only if not a heater - heater already shows temp)
  if (capabilities.includes(CAP_TEMP_SENSOR) && !capabilities.includes(CAP_HEATER) && !capabilities.includes(CAP_HANDLE_SENSOR)) {
    const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
    if (temp !== undefined && temp !== -99) {
      badges.push(
        <span key="temp" className="text-xs text-muted-foreground">
          {temp.toFixed(1)}°C
        </span>
      );
    }
  }

  // Dimmable lamp: show brightness
  if (capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED)) {
    const brightness = device.brightness ?? device._brightness ?? -1;
    const isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
    if (isOn) {
      badges.push(
        <span key="dimmer" className="text-xs text-green-500">
          {brightness >= 0 ? `${brightness}%` : 'An'}
        </span>
      );
    } else {
      badges.push(
        <span key="dimmer-off" className="text-xs text-gray-400">
          Aus
        </span>
      );
    }
  }

  // LED: show color and brightness
  if (capabilities.includes(CAP_LED)) {
    const brightness = device.brightness ?? device._brightness ?? -1;
    const color = device._color ?? '';
    const isOn = device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
    if (isOn) {
      badges.push(
        <span key="led" className="flex items-center gap-1 text-xs text-green-500">
          {color && (
            <span 
              className="inline-block w-3 h-3 rounded-full border border-border" 
              style={{ backgroundColor: color.startsWith('#') ? color : `#${color}` }}
            />
          )}
          {brightness >= 0 ? `${brightness}%` : 'An'}
        </span>
      );
    } else {
      badges.push(
        <span key="led-off" className="text-xs text-gray-400">
          Aus
        </span>
      );
    }
  }

  // Simple lamp: show on/off
  if (capabilities.includes(CAP_LAMP) && !capabilities.includes(CAP_DIMMABLE) && !capabilities.includes(CAP_LED)) {
    const isOn = device.lightOn ?? device._lightOn ?? false;
    badges.push(
      <span key="lamp" className={`text-xs ${isOn ? 'text-green-500' : 'text-gray-400'}`}>
        {isOn ? 'An' : 'Aus'}
      </span>
    );
  }

  // Shutter: show level (0-100 or 0-1 depending on device)
  if (capabilities.includes(CAP_SHUTTER)) {
    let level = device._currentLevel ?? -1;
    // Normalize level to 0-100 range
    if (level > 1 && level <= 100) {
      // Already in 0-100 range
    } else if (level >= 0 && level <= 1) {
      level = level * 100;
    } else {
      level = -1; // Invalid
    }
    
    if (level >= 0 && level <= 100) {
      badges.push(
        <span key="shutter" className="text-xs text-muted-foreground">
          {Math.round(level)}%
        </span>
      );
    }
  }

  // Actuator (not lamp): show on/off
  if (capabilities.includes(CAP_ACTUATOR) && !capabilities.includes(CAP_LAMP)) {
    const isOn = device.actuatorOn ?? device._actuatorOn ?? false;
    badges.push(
      <span key="actuator" className={`text-xs ${isOn ? 'text-green-500' : 'text-gray-400'}`}>
        {isOn ? 'An' : 'Aus'}
      </span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-0.5">
      {badges}
    </div>
  );
}
