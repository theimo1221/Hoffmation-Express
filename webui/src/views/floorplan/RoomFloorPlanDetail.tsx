import { useState, useEffect, useRef, useCallback } from 'react';
import { useDataStore, getRoomName, getDeviceRoom, getDeviceName, type Device } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { setDevicePosition, setLamp, setDimmer, setShutter, setAc } from '@/api/devices';
import { cn } from '@/lib/utils';
import { Edit3, Save, X, Plus } from 'lucide-react';
import { DeviceIcon, DeviceCapability } from '@/components/DeviceIcon';
import { PageHeader } from '@/components/layout/PageHeader';
import { RadialMenu, getDeviceMenuItems, getDeviceStatus } from '@/components/RadialMenu';
import type { RoomFloorPlanDetailProps } from './types';

export function RoomFloorPlanDetail({ room, devices, onBack, onSelectDevice }: RoomFloorPlanDetailProps) {
  const roomName = getRoomName(room);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPositions, setEditedPositions] = useState<Record<string, { x: number; y: number; z: number }>>({});
  const [draggingDevice, setDraggingDevice] = useState<string | null>(null);
  const [fixedScale, setFixedScale] = useState<number | null>(null);
  const [radialMenu, setRadialMenu] = useState<{ device: Device; position: { x: number; y: number } } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const { expertMode } = useSettingsStore();
  const { fetchData, fetchDevice } = useDataStore();

  const LONG_PRESS_DURATION = 400; // ms

  const startPoint = room.startPoint ?? room.settings?.trilaterationStartPoint;
  const endPoint = room.endPoint ?? room.settings?.trilaterationEndPoint;
  
  // Helper to get device position from various sources
  const getDevicePos = (d: Device) => {
    const pos = d.trilaterationRoomPosition ?? d._trilaterationRoomPosition ?? 
           d.settings?.trilaterationRoomPosition ?? (d.settings as Record<string, unknown>)?._trilaterationRoomPosition as { x: number; y: number; z: number } | undefined;
    if (pos && pos.x === 0 && pos.y === 0 && pos.z === 0) return undefined;
    return pos;
  };

  const allRoomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  const placedDevices = allRoomDevices.filter((d) => getDevicePos(d));
  const unplacedDevices = allRoomDevices.filter((d) => !getDevicePos(d));
  const locallyPlacedDeviceIds = Object.keys(editedPositions);
  const locallyPlacedDevices = allRoomDevices.filter(d => d.id && locallyPlacedDeviceIds.includes(d.id));
  const roomDevices = editMode ? [...placedDevices, ...locallyPlacedDevices] : placedDevices;
  const hasChanges = locallyPlacedDeviceIds.length > 0;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth - 32,
          height: containerRef.current.clientHeight - 32,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const roomWidth = startPoint && endPoint ? endPoint.x - startPoint.x : 5;
  const roomHeight = startPoint && endPoint ? endPoint.y - startPoint.y : 5;
  const calculatedScaleX = containerSize.width > 0 ? containerSize.width / roomWidth : 100;
  const calculatedScaleY = containerSize.height > 0 ? containerSize.height / roomHeight : 100;
  const calculatedScale = Math.min(calculatedScaleX, calculatedScaleY, 150);
  const scale = fixedScale ?? calculatedScale;
  const scaledWidth = roomWidth * scale;
  const scaledHeight = roomHeight * scale;

  const screenToRoom = (screenX: number, screenY: number) => {
    if (!startPoint || !endPoint) return { x: 0, y: 0 };
    // Position is relative to room (0,0 = bottom-left corner of room)
    let roomX = screenX / scale;
    let roomY = roomHeight - screenY / scale;
    // Clamp to room bounds (0 to roomWidth/Height, edge positions allowed)
    roomX = Math.max(0, Math.min(roomWidth, roomX));
    roomY = Math.max(0, Math.min(roomHeight, roomY));
    return { x: Math.round(roomX * 10) / 10, y: Math.round(roomY * 10) / 10 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingDevice || !containerRef.current || !startPoint || !endPoint) return;
    
    const canvas = containerRef.current.querySelector('.room-canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left - 16;
    const screenY = e.clientY - rect.top - 16;
    
    const { x, y } = screenToRoom(screenX, screenY);
    const z = startPoint.z ?? 0;
    
    setEditedPositions(prev => ({
      ...prev,
      [draggingDevice]: { x, y, z }
    }));
  };

  const handleMouseUp = () => {
    setDraggingDevice(null);
  };

  // Check if device is a lamp (can be toggled)
  const isLampDevice = (device: Device) => {
    const caps = device.deviceCapabilities ?? [];
    return caps.includes(DeviceCapability.lamp) || 
           caps.includes(DeviceCapability.dimmableLamp) || 
           caps.includes(DeviceCapability.ledLamp);
  };

  // Check if device is a shutter (can be toggled)
  const isShutterDevice = (device: Device) => {
    const caps = device.deviceCapabilities ?? [];
    return caps.includes(DeviceCapability.shutter);
  };

  // Check if device is AC (can be toggled)
  const isAcDevice = (device: Device) => {
    const caps = device.deviceCapabilities ?? [];
    return caps.includes(DeviceCapability.ac);
  };

  const isAcOn = (device: Device) => {
    return (device as Record<string, unknown>).acOn ?? (device as Record<string, unknown>)._acOn ?? device.on ?? device._on ?? false;
  };

  const isLampOn = (device: Device) => {
    return device.lightOn ?? device._lightOn ?? device.on ?? device._on ?? false;
  };

  const getShutterLevel = (device: Device) => {
    let level = device._currentLevel ?? -1;
    // Normalize to 0-100
    if (level >= 0 && level <= 1) level = level * 100;
    return level;
  };

  // Toggle lamp on/off - LED/Dimmer/Lamp all extend Actuator, so setLamp works for all
  const handleToggleLamp = async (device: Device) => {
    if (!device.id) return;
    const currentState = isLampOn(device);
    console.log('Toggle lamp:', device.id, 'currentState:', currentState, '-> newState:', !currentState);
    console.log('Device props:', { lightOn: device.lightOn, _lightOn: device._lightOn, on: device.on, _on: device._on });
    
    try {
      await setLamp(device.id, !currentState);
      // Refresh device data after short delay
      setTimeout(() => fetchDevice(device.id!), 300);
    } catch (error) {
      console.error('Failed to toggle lamp:', error);
    }
  };

  // Toggle shutter open/closed (0 = open, 100 = closed)
  const handleToggleShutter = async (device: Device) => {
    if (!device.id) return;
    const currentLevel = getShutterLevel(device);
    // If mostly open (< 50%), close it. Otherwise open it.
    const newLevel = currentLevel < 50 ? 100 : 0;
    
    try {
      await setShutter(device.id, newLevel);
      // Refresh device data after short delay
      setTimeout(() => fetchDevice(device.id!), 500);
    } catch (error) {
      console.error('Failed to toggle shutter:', error);
    }
  };

  // Toggle AC on/off
  const handleToggleAc = async (device: Device) => {
    if (!device.id) return;
    const currentState = isAcOn(device);
    
    try {
      await setAc(device.id, !currentState);
      // Refresh device data after short delay
      setTimeout(() => fetchDevice(device.id!), 500);
    } catch (error) {
      console.error('Failed to toggle AC:', error);
    }
  };

  // Handle device interaction (tap vs hold)
  const handleDevicePointerDown = (device: Device, e: React.PointerEvent) => {
    if (editMode) return;
    
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setIsLongPress(false);
    
    const timer = setTimeout(() => {
      setIsLongPress(true);
      // Open radial menu on long press
      setRadialMenu({ device, position });
    }, LONG_PRESS_DURATION);
    
    setLongPressTimer(timer);
  };

  const handleDevicePointerUp = (device: Device) => {
    if (editMode) return;
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // If it wasn't a long press, handle as tap
    if (!isLongPress) {
      if (isLampDevice(device)) {
        // Quick tap on lamp = toggle
        handleToggleLamp(device);
      } else if (isShutterDevice(device)) {
        // Quick tap on shutter = toggle open/closed
        handleToggleShutter(device);
      } else if (isAcDevice(device)) {
        // Quick tap on AC = toggle on/off
        handleToggleAc(device);
      } else {
        // Other devices go to detail view
        onSelectDevice(device);
      }
    }
    
    setIsLongPress(false);
  };

  const handleDevicePointerLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Lamp control handlers for radial menu
  const handleLampOn = async (device: Device) => {
    if (!device.id) return;
    setRadialMenu(null); // Close menu immediately
    const caps = device.deviceCapabilities ?? [];
    try {
      if (caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp)) {
        await setDimmer(device.id, true, 100);
      } else {
        await setLamp(device.id, true);
      }
      setTimeout(() => fetchDevice(device.id!), 300);
    } catch (error) {
      console.error('Failed to turn lamp on:', error);
    }
  };

  const handleLampOff = async (device: Device) => {
    if (!device.id) return;
    setRadialMenu(null); // Close menu immediately
    try {
      await setLamp(device.id, false);
      setTimeout(() => fetchDevice(device.id!), 300);
    } catch (error) {
      console.error('Failed to turn lamp off:', error);
    }
  };

  const handleLamp50 = async (device: Device) => {
    if (!device.id) return;
    setRadialMenu(null); // Close menu immediately
    try {
      await setDimmer(device.id, true, 50);
      setTimeout(() => fetchDevice(device.id!), 300);
    } catch (error) {
      console.error('Failed to set lamp to 50%:', error);
    }
  };

  // Shutter control handlers for radial menu
  const handleShutterLevel = async (device: Device, level: number) => {
    if (!device.id) return;
    setRadialMenu(null); // Close menu immediately
    try {
      await setShutter(device.id, level);
      setTimeout(() => fetchDevice(device.id!), 500);
    } catch (error) {
      console.error('Failed to set shutter level:', error);
    }
  };

  // AC control handlers for radial menu
  const handleAcPower = async (device: Device, power: boolean) => {
    if (!device.id) return;
    setRadialMenu(null); // Close menu immediately
    try {
      await setAc(device.id, power);
      setTimeout(() => fetchDevice(device.id!), 500);
    } catch (error) {
      console.error('Failed to set AC power:', error);
    }
  };

  // Get radial menu items for current device
  const getRadialMenuItems = useCallback(() => {
    if (!radialMenu) return [];
    const device = radialMenu.device;
    
    return getDeviceMenuItems(device, {
      onDetails: () => {
        setRadialMenu(null);
        onSelectDevice(device);
      },
      onLampOn: () => handleLampOn(device),
      onLampOff: () => handleLampOff(device),
      onLamp50: () => handleLamp50(device),
      onShutterUp: () => handleShutterLevel(device, 0),
      onShutter50: () => handleShutterLevel(device, 50),
      onShutterDown: () => handleShutterLevel(device, 100),
      onAcOn: () => handleAcPower(device, true),
      onAcOff: () => handleAcPower(device, false),
    });
  }, [radialMenu, onSelectDevice]);

  return (
    <div 
      className="flex h-full flex-col"
      onMouseMove={editMode ? handleMouseMove : undefined}
      onMouseUp={editMode ? handleMouseUp : undefined}
      onMouseLeave={editMode ? handleMouseUp : undefined}
    >
      <PageHeader
        title={editMode ? `${roomName} (Bearbeiten)` : roomName}
        subtitle={`${placedDevices.length} platziert${unplacedDevices.length > 0 && editMode ? ` • ${unplacedDevices.length} unplatziert` : ''}`}
        onBack={editMode ? () => {
          setEditMode(false);
          setFixedScale(null);
          setEditedPositions({});
        } : onBack}
        backIcon={editMode ? <X className="h-5 w-5" /> : undefined}
        rightContent={
          editMode ? (
            hasChanges ? (
              <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    for (const [deviceId, position] of Object.entries(editedPositions)) {
                      await setDevicePosition(deviceId, position);
                    }
                    await fetchData();
                    setEditedPositions({});
                    setFixedScale(null);
                    setEditMode(false);
                  } catch (error) {
                    console.error('Failed to save device positions:', error);
                    alert('Fehler beim Speichern der Gerätepositionen');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            ) : undefined
          ) : (
            expertMode ? (
              <button
                onClick={() => {
                  setFixedScale(calculatedScale);
                  setEditMode(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium transition-all hover:bg-accent"
              >
                <Edit3 className="h-4 w-4" />
                Bearbeiten
              </button>
            ) : undefined
          )
        }
      />

      <div ref={containerRef} className="flex-1 overflow-hidden p-4 flex items-center justify-center">
        <div
          className="room-canvas relative rounded-2xl bg-card p-4 shadow-soft border-2 border-primary/30"
          style={{
            width: scaledWidth + 32,
            height: scaledHeight + 32,
          }}
        >
          <div className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-lg" />

          {roomDevices.map((device) => {
            const deviceName = getDeviceName(device, roomName);
            const localPos = device.id ? editedPositions[device.id] : undefined;
            const rawDevicePos = localPos ?? getDevicePos(device);
            const isUnplaced = !rawDevicePos;
            
            // Clamp device position to room bounds
            const devicePos = rawDevicePos ? {
              x: Math.max(0, Math.min(roomWidth, rawDevicePos.x)),
              y: Math.max(0, Math.min(roomHeight, rawDevicePos.y)),
              z: rawDevicePos.z
            } : undefined;
            
            let x = 0, y = 0;
            
            if (devicePos && startPoint && endPoint) {
              // Position is relative to room (0,0 = bottom-left corner)
              x = (devicePos.x / roomWidth) * scaledWidth;
              y = ((roomHeight - devicePos.y) / roomHeight) * scaledHeight;
              // Clamp screen position to stay within canvas
              x = Math.max(0, Math.min(scaledWidth - 40, x));
              y = Math.max(0, Math.min(scaledHeight - 40, y));
            } else if (editMode) {
              const unplacedIdx = unplacedDevices.indexOf(device);
              const spacing = scaledWidth / (unplacedDevices.length + 1);
              x = spacing * (unplacedIdx + 1);
              y = scaledHeight - 20;
            }

            const isDragging = draggingDevice === device.id;
            const isLocallyEdited = device.id ? !!editedPositions[device.id] : false;

            return (
              <div
                key={device.id ?? deviceName}
                onPointerDown={editMode ? undefined : (e) => handleDevicePointerDown(device, e)}
                onPointerUp={editMode ? undefined : () => handleDevicePointerUp(device)}
                onPointerLeave={editMode ? undefined : handleDevicePointerLeave}
                onMouseDown={editMode && device.id ? (e) => {
                  e.preventDefault();
                  setDraggingDevice(device.id!);
                } : undefined}
                className={cn(
                  "absolute flex flex-col items-center justify-center p-2 rounded-xl shadow-soft select-none touch-none",
                  editMode
                    ? isDragging
                      ? "cursor-grabbing bg-primary/40 border-2 border-primary z-50"
                      : isLocallyEdited
                        ? "cursor-grab bg-orange-500/30 border-2 border-orange-500"
                        : "cursor-grab bg-primary/20 border-2 border-primary"
                    : "bg-secondary/80 hover:bg-accent hover:scale-110 cursor-pointer transition-all"
                )}
                style={{
                  left: x + 16 - 20,
                  top: y + 16 - 20,
                }}
                title={deviceName}
              >
                <div className={cn(
                  "flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-lg",
                  isUnplaced && editMode ? "bg-orange-500/20" : "bg-primary/10"
                )}>
                  <DeviceIcon device={device} size="md" />
                </div>
                {isDragging && devicePos && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-white text-[10px] rounded whitespace-nowrap z-50">
                    ({devicePos.x}, {devicePos.y})
                  </div>
                )}
              </div>
            );
          })}

          {roomDevices.length === 0 && !editMode && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Keine platzierten Geräte
            </div>
          )}

          {editMode && unplacedDevices.length > 0 && (
            <button
              onClick={() => setShowDevicePicker(true)}
              className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
              title="Gerät platzieren"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {showDevicePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Gerät platzieren</h3>
              <button
                onClick={() => setShowDevicePicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle ein Gerät zum Platzieren ({unplacedDevices.length} verfügbar)
            </p>
            <div className="flex-1 overflow-auto space-y-2">
              {unplacedDevices.filter(d => !editedPositions[d.id ?? '']).map((device) => {
                const deviceName = getDeviceName(device, roomName);
                return (
                  <button
                    key={device.id ?? deviceName}
                    onClick={() => {
                      if (!device.id || !startPoint || !endPoint) return;
                      // Position is relative to room (0,0 = bottom-left corner)
                      const centerX = roomWidth / 2;
                      const centerY = roomHeight / 2;
                      const centerZ = startPoint.z ?? 0;
                      setEditedPositions(prev => ({
                        ...prev,
                        [device.id!]: { x: centerX, y: centerY, z: centerZ }
                      }));
                      setShowDevicePicker(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <DeviceIcon device={device} size="sm" />
                    </div>
                    <span className="font-medium">{deviceName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Radial Menu for device quick actions */}
      <RadialMenu
        items={getRadialMenuItems()}
        isOpen={radialMenu !== null}
        onClose={() => setRadialMenu(null)}
        position={radialMenu?.position ?? { x: 0, y: 0 }}
        centerIcon={radialMenu ? <DeviceIcon device={radialMenu.device} size="md" /> : undefined}
        deviceStatus={radialMenu ? getDeviceStatus(radialMenu.device) : undefined}
        deviceName={radialMenu ? getDeviceName(radialMenu.device, roomName) : undefined}
      />
    </div>
  );
}
