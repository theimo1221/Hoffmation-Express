import { useState, useEffect, useRef, useCallback } from 'react';
import { useDataStore, getRoomName, getDeviceRoom, getDeviceName, isDeviceOn, type Device } from '@/stores';
import { DeviceCapability, isToggleableDevice, getDeviceColor, getDeviceBrightness } from '@/stores/deviceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { setDevicePosition } from '@/api/devices';
import { toggleDevice } from '@/lib/deviceActions';
import { cn } from '@/lib/utils';
import { Edit3, Save, X, Plus, Settings } from 'lucide-react';
import { DeviceIcon } from '@/components/DeviceIcon';
import { PageHeader } from '@/components/layout/PageHeader';
import { RadialDeviceMenu } from '@/components/RadialDeviceMenu';
import { AdjacentRoomButtons } from './AdjacentRoomButtons';
import { DevicePicker } from './DevicePicker';
import { FloorPlanFilterButton } from '@/components/FloorPlanFilterButton';
import { filterDevicesByCategories } from '@/hooks/useFloorPlanFilters';
import type { RoomFloorPlanDetailProps, AdjacentRoom } from './types';

export function RoomFloorPlanDetail({ room, devices, allRooms = [], onBack, onSelectDevice, onNavigateToRoom, onRoomSettings }: RoomFloorPlanDetailProps) {
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
  const { expertMode, floorPlanFilters, toggleFloorPlanFilter } = useSettingsStore();
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
  const allPlacedDevices = allRoomDevices.filter((d) => getDevicePos(d));
  const placedDevices = filterDevicesByCategories(allPlacedDevices, floorPlanFilters);
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

  // Find adjacent rooms based on shared boundaries
  const getAdjacentRooms = () => {
    if (!startPoint || !endPoint || !onNavigateToRoom) {
      console.log('[Adjacent] Missing requirements:', { hasStartPoint: !!startPoint, hasEndPoint: !!endPoint, hasNavigateCallback: !!onNavigateToRoom });
      return [];
    }
    
    console.log('[Adjacent] Searching for adjacent rooms to', roomName);
    console.log('[Adjacent] Current room bounds:', { start: startPoint, end: endPoint });
    console.log('[Adjacent] All rooms count:', allRooms.length);
    
    const adjacent: AdjacentRoom[] = [];
    const TOLERANCE = 1.0; // Allow small gaps/overlaps (increased for real-world room layouts)
    
    for (const otherRoom of allRooms) {
      const otherName = getRoomName(otherRoom);
      
      // Skip if same room (compare by name since IDs might not be unique)
      if (otherName.toLowerCase() === roomName.toLowerCase()) {
        console.log(`[Adjacent] Skipping ${otherName}: same room`);
        continue;
      }
      
      const otherStart = otherRoom.startPoint ?? otherRoom.settings?.trilaterationStartPoint;
      const otherEnd = otherRoom.endPoint ?? otherRoom.settings?.trilaterationEndPoint;
      
      console.log(`[Adjacent] Checking ${otherName}:`, { start: otherStart, end: otherEnd });
      
      if (!otherStart || !otherEnd) {
        console.log(`[Adjacent] Skipping ${otherName}: no coordinates`);
        continue;
      }
      
      // Check if rooms overlap in z-coordinate (same floor/level)
      const ourZMin = Math.min(startPoint.z ?? 0, endPoint.z ?? 0);
      const ourZMax = Math.max(startPoint.z ?? 0, endPoint.z ?? 0);
      const theirZMin = Math.min(otherStart.z ?? 0, otherEnd.z ?? 0);
      const theirZMax = Math.max(otherStart.z ?? 0, otherEnd.z ?? 0);
      
      // Check if z-ranges overlap (rooms on same floor)
      const zOverlap = Math.min(ourZMax, theirZMax) - Math.max(ourZMin, theirZMin);
      console.log(`[Adjacent] ${otherName} z-check:`, { ourZ: [ourZMin, ourZMax], theirZ: [theirZMin, theirZMax], overlap: zOverlap });
      if (zOverlap < -TOLERANCE) {
        console.log(`[Adjacent] Skipping ${otherName}: different floor (z-overlap: ${zOverlap})`);
        continue;
      }
      
      // Check for shared boundaries
      // Calculate overlap ranges
      const overlapYStart = Math.max(startPoint.y, otherStart.y);
      const overlapYEnd = Math.min(endPoint.y, otherEnd.y);
      const overlapY = overlapYEnd - overlapYStart;
      const overlapXStart = Math.max(startPoint.x, otherStart.x);
      const overlapXEnd = Math.min(endPoint.x, otherEnd.x);
      const overlapX = overlapXEnd - overlapXStart;
      
      // Left: other room's right edge touches our left edge
      const leftEdgeDiff = Math.abs(otherEnd.x - startPoint.x);
      if (leftEdgeDiff < TOLERANCE && overlapY > 0) {
        console.log(`[Adjacent] ✓ ${otherName} is LEFT adjacent (overlap: ${overlapY.toFixed(2)}m)`);
        adjacent.push({ room: otherRoom, direction: 'left', sharedLength: overlapY, overlapStart: overlapYStart, overlapEnd: overlapYEnd });
      }
      // Right: other room's left edge touches our right edge
      const rightEdgeDiff = Math.abs(otherStart.x - endPoint.x);
      if (rightEdgeDiff < TOLERANCE && overlapY > 0) {
        console.log(`[Adjacent] ✓ ${otherName} is RIGHT adjacent (overlap: ${overlapY.toFixed(2)}m)`);
        adjacent.push({ room: otherRoom, direction: 'right', sharedLength: overlapY, overlapStart: overlapYStart, overlapEnd: overlapYEnd });
      }
      // Bottom: other room's top edge touches our bottom edge (Y increases upward)
      const bottomEdgeDiff = Math.abs(otherEnd.y - startPoint.y);
      if (bottomEdgeDiff < TOLERANCE && overlapX > 0) {
        console.log(`[Adjacent] ✓ ${otherName} is BOTTOM adjacent (overlap: ${overlapX.toFixed(2)}m)`);
        adjacent.push({ room: otherRoom, direction: 'bottom', sharedLength: overlapX, overlapStart: overlapXStart, overlapEnd: overlapXEnd });
      }
      // Top: other room's bottom edge touches our top edge
      const topEdgeDiff = Math.abs(otherStart.y - endPoint.y);
      if (topEdgeDiff < TOLERANCE && overlapX > 0) {
        console.log(`[Adjacent] ✓ ${otherName} is TOP adjacent (overlap: ${overlapX.toFixed(2)}m)`);
        adjacent.push({ room: otherRoom, direction: 'top', sharedLength: overlapX, overlapStart: overlapXStart, overlapEnd: overlapXEnd });
      }
    }
    
    console.log(`[Adjacent] Found ${adjacent.length} adjacent rooms:`, adjacent.map(a => ({ room: getRoomName(a.room), direction: a.direction })));
    return adjacent;
  };

  const adjacentRooms = getAdjacentRooms();
  console.log('[Adjacent] Final adjacent rooms:', adjacentRooms.length);

  // Calculate margins based on which sides have adjacent rooms
  const hasLeft = adjacentRooms.some(r => r.direction === 'left');
  const hasRight = adjacentRooms.some(r => r.direction === 'right');
  const hasTop = adjacentRooms.some(r => r.direction === 'top');
  const hasBottom = adjacentRooms.some(r => r.direction === 'bottom');
  const marginLeft = hasLeft ? 80 : 0;
  const marginRight = hasRight ? 80 : 0;
  const marginTop = hasTop ? 80 : 0;
  const marginBottom = hasBottom ? 80 : 0;
  const totalMarginX = marginLeft + marginRight;
  const totalMarginY = marginTop + marginBottom;

  // Calculate scale with dynamic margins
  const availableWidth = Math.max(100, containerSize.width - totalMarginX);
  const availableHeight = Math.max(100, containerSize.height - totalMarginY);
  const calculatedScaleX = availableWidth > 0 ? availableWidth / roomWidth : 100;
  const calculatedScaleY = availableHeight > 0 ? availableHeight / roomHeight : 100;
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

  // Unified move handler for mouse and touch
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingDevice || !containerRef.current || !startPoint || !endPoint) return;
    
    const canvas = containerRef.current.querySelector('.room-canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left - 16;
    const screenY = clientY - rect.top - 16;
    
    const { x, y } = screenToRoom(screenX, screenY);
    const z = startPoint.z ?? 0;
    
    setEditedPositions(prev => ({
      ...prev,
      [draggingDevice]: { x, y, z }
    }));
  }, [draggingDevice, startPoint, endPoint, screenToRoom]);

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingDevice) return;
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    if (touch) {
      handleMove(touch.clientX, touch.clientY);
    }
  }, [draggingDevice, handleMove]);

  const handleMouseUp = () => {
    setDraggingDevice(null);
  };

  const handleTouchEnd = useCallback(() => {
    setDraggingDevice(null);
  }, []);

  // Add touch event listeners for iOS drag support
  useEffect(() => {
    if (editMode && draggingDevice) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [editMode, draggingDevice, handleTouchMove, handleTouchEnd]);

  // Device type checkers now imported from dataStore

  // Use central isDeviceOn from dataStore (matches Swift logic)


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
      if (isToggleableDevice(device)) {
        // Quick tap on toggleable device = toggle
        toggleDevice(
          device,
          async () => { if (device.id) await fetchDevice(device.id); },
          () => {}
        );
      } else {
        // Sensors and other devices: open radial menu on tap (child-friendly)
        // This includes handle sensors, motion sensors, temperature sensors
        const rect = (document.querySelector('.room-canvas') as HTMLElement)?.getBoundingClientRect();
        if (rect) {
          setRadialMenu({ 
            device, 
            position: { 
              x: rect.left + rect.width / 2, 
              y: rect.top + rect.height / 2 
            } 
          });
        } else {
          onSelectDevice(device);
        }
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
            <div className="flex items-center gap-1">
              <FloorPlanFilterButton icon="Lightbulb" label="Schaltbar" active={floorPlanFilters.switchable} activeColor="#F59E0B" onClick={() => toggleFloorPlanFilter('switchable')} />
              <FloorPlanFilterButton icon="Shield" label="Sicherheit" active={floorPlanFilters.security} activeColor="#8B4513" onClick={() => toggleFloorPlanFilter('security')} />
              <FloorPlanFilterButton icon="Thermometer" label="Klima" active={floorPlanFilters.climate} activeColor="#3B82F6" onClick={() => toggleFloorPlanFilter('climate')} />
              <FloorPlanFilterButton icon="MoreHorizontal" label="Sonstiges" active={floorPlanFilters.other} activeColor="#6B7280" onClick={() => toggleFloorPlanFilter('other')} />
              {onRoomSettings && (
                <button
                  onClick={onRoomSettings}
                  className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium transition-all hover:bg-accent"
                  title="Raumeinstellungen"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
              {expertMode && (
                <button
                  onClick={() => {
                    setFixedScale(calculatedScale);
                    setEditMode(true);
                  }}
                  className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium transition-all hover:bg-accent"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        }
      />

      <div ref={containerRef} className="flex-1 overflow-hidden px-4 py-6 flex items-center justify-center">
        {/* Wrapper with fixed size including space for arrows */}
        <div 
          className="relative"
          style={{
            width: scaledWidth + 32 + (hasLeft ? 80 : 0) + (hasRight ? 80 : 0) + (!hasRight ? 20 : 0),
            height: scaledHeight + 32 + (hasTop ? 40 : 0) + (hasBottom ? 40 : 0) + (!hasBottom ? 20 : 0),
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
        <div
          className="room-canvas absolute rounded-2xl bg-card p-4 shadow-soft border-2 border-primary/30"
          style={{
            width: scaledWidth + 32,
            height: scaledHeight + 32,
            left: hasLeft ? '80px' : '0',
            top: hasTop ? '40px' : '0',
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
              // Device is positioned at x+16-20 (so -4px offset), need to account for this
              // Min: 5px (so device at -4+5=1px from border)
              // Max: scaledWidth - 40 (device bubble is ~40px wide)
              x = Math.max(5, Math.min(scaledWidth - 40, x));
              y = Math.max(5, Math.min(scaledHeight - 40, y));
            } else if (editMode) {
              const unplacedIdx = unplacedDevices.indexOf(device);
              const spacing = scaledWidth / (unplacedDevices.length + 1);
              x = spacing * (unplacedIdx + 1);
              y = scaledHeight - 20;
            }

            const isDragging = draggingDevice === device.id;
            const isLocallyEdited = device.id ? !!editedPositions[device.id] : false;
            
            // Get LED color for border
            const caps = device.deviceCapabilities ?? [];
            const isLed = caps.includes(DeviceCapability.ledLamp);
            const isOn = isDeviceOn(device);
            let ledBorderColor = '';
            const deviceColor = getDeviceColor(device);
            if (isLed && isOn && deviceColor) {
              let color = deviceColor;
              // Expand shorthand hex notation
              if (color.length === 5 && color.startsWith('#')) {
                color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + color[4] + color[4];
              } else if (color.length === 4 && color.startsWith('#')) {
                color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
              }
              // Only show color border if not white
              if (color.toUpperCase() !== '#FFFFFF' && color.toUpperCase() !== '#FFF') {
                ledBorderColor = color;
              }
            }

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
                onTouchStart={editMode && device.id ? (e) => {
                  e.preventDefault();
                  setDraggingDevice(device.id!);
                } : undefined}
                className={cn(
                  "absolute flex flex-col items-center justify-center rounded-xl select-none touch-none",
                  editMode
                    ? isDragging
                      ? "cursor-grabbing bg-primary/40 border-2 border-primary z-50 p-2 shadow-md"
                      : isLocallyEdited
                        ? "cursor-grab bg-orange-500/30 border-2 border-orange-500 p-2 shadow-md"
                        : "cursor-grab bg-primary/20 border-2 border-primary p-2 shadow-md"
                    : "hover:scale-110 cursor-pointer transition-all"
                )}
                style={{
                  left: x + 16 - 20,
                  top: y + 16 - 20,
                }}
                title={deviceName}
              >
                <div className={cn(
                  "relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl shadow-lg",
                  isUnplaced && editMode ? "bg-orange-500/20" : "bg-card dark:bg-card",
                  ledBorderColor && !editMode ? "border-2" : ""
                )}
                style={{
                  ...(ledBorderColor && !editMode ? { borderColor: ledBorderColor } : {})
                }}
                >
                  {/* Brightness rays for dimmable lamps/LEDs - only upper half (8 o'clock to 4 o'clock) */}
                  {(caps.includes(DeviceCapability.dimmableLamp) || caps.includes(DeviceCapability.ledLamp)) && isOn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
                        const brightness = getDeviceBrightness(device);
                        const threshold = (index + 1) * 12.5; // 100/8 = 12.5% per ray
                        // Always show at least one ray when lamp is on
                        const isActive = index === 0 ? true : brightness >= threshold;
                        // Start at -120° (8 o'clock) and spread 240° to 120° (4 o'clock)
                        const angle = -120 + (index * 240 / 7); // Distribute 8 rays across upper 240°
                        return (
                          <div
                            key={index}
                            className="absolute w-0.5 h-3 origin-center transition-colors rounded-full"
                            style={{
                              backgroundColor: isActive ? '#eab308' : '#6b7280',
                              transform: `rotate(${angle}deg) translateY(-22px)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                  <DeviceIcon device={device} size="lg" />
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

        {/* Adjacent room navigation buttons */}
        {!editMode && startPoint && (
          <AdjacentRoomButtons
            adjacentRooms={adjacentRooms}
            roomWidth={roomWidth}
            roomHeight={roomHeight}
            startPoint={startPoint}
            canvasLeft={hasLeft ? 80 : 0}
            canvasTop={hasTop ? 40 : 0}
            canvasWidth={scaledWidth + 32}
            canvasHeight={scaledHeight + 32}
            onNavigateToRoom={onNavigateToRoom}
          />
        )}
        </div>
      </div>

      <DevicePicker
        isOpen={showDevicePicker}
        unplacedDevices={unplacedDevices}
        editedPositions={editedPositions}
        roomName={roomName}
        onClose={() => setShowDevicePicker(false)}
        onSelectDevice={(device) => {
          if (!device.id || !startPoint || !endPoint) return;
          const centerX = roomWidth / 2;
          const centerY = roomHeight / 2;
          const centerZ = startPoint.z ?? 0;
          setEditedPositions(prev => ({
            ...prev,
            [device.id!]: { x: centerX, y: centerY, z: centerZ }
          }));
        }}
      />

      {/* Radial Menu for device quick actions */}
      <RadialDeviceMenu
        device={radialMenu?.device ?? null}
        isOpen={radialMenu !== null}
        onClose={() => setRadialMenu(null)}
        position={radialMenu?.position ?? { x: 0, y: 0 }}
        deviceName={radialMenu ? getDeviceName(radialMenu.device, roomName) : undefined}
        onDetails={() => {
          if (!radialMenu) return;
          setRadialMenu(null);
          onSelectDevice(radialMenu.device);
        }}
      />
    </div>
  );
}
