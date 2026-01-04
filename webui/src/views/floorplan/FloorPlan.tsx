import { useState, useEffect, useRef, useCallback } from 'react';
import { useDataStore, getRoomName, getDeviceRoom, getRoomWebUISettings, type Room, type Device } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateRoomSettings } from '@/api/rooms';
import { cn } from '@/lib/utils';
import { Edit3, Save, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeviceIcon } from '@/components/DeviceIcon';
import { FloorPlanFilterButton } from '@/components/FloorPlanFilterButton';
import { filterDevicesByCategories } from '@/hooks/useFloorPlanFilters';
import type { FloorPlanProps, RoomCoords, FixedBounds, DraggingState } from './types';

export function FloorPlan({ floor, onBack, onSelectRoom }: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { expertMode, floorViewFilters, toggleFloorViewFilter } = useSettingsStore();
  const { fetchData, devices } = useDataStore();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [editedCoords, setEditedCoords] = useState<Record<string, RoomCoords>>({});
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [fixedBounds, setFixedBounds] = useState<FixedBounds | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Helper to get room coordinates - check both direct properties and settings
  const getRoomCoords = (room: Room) => {
    const startPoint = room.startPoint ?? room.settings?.trilaterationStartPoint;
    const endPoint = room.endPoint ?? room.settings?.trilaterationEndPoint;
    return { startPoint, endPoint, hasCoords: !!(startPoint && endPoint) };
  };

  // Helper to get placed devices for a room
  const getPlacedDevicesForRoom = (roomName: string): Device[] => {
    const allDevices = Object.values(devices).filter((d) => {
      if (getDeviceRoom(d).toLowerCase() !== roomName.toLowerCase()) return false;
      const pos = d.trilaterationRoomPosition ?? d._trilaterationRoomPosition ?? 
                  d.settings?.trilaterationRoomPosition;
      // Filter out default (0,0,0) positions
      if (!pos || (pos.x === 0 && pos.y === 0 && pos.z === 0)) return false;
      return true;
    });
    // Apply floor view filters
    return filterDevicesByCategories(allDevices, floorViewFilters);
  };

  const roomsWithCoords = floor.rooms.filter((r) => getRoomCoords(r).hasCoords);
  const roomsWithoutCoords = floor.rooms.filter((r) => !getRoomCoords(r).hasCoords);

  // Initialize edited coords when entering edit mode
  const enterEditMode = useCallback(() => {
    const coords: Record<string, RoomCoords> = {};
    roomsWithCoords.forEach((room) => {
      const roomName = getRoomName(room);
      const { startPoint, endPoint } = getRoomCoords(room);
      coords[roomName] = {
        roomName,
        startPoint: { ...startPoint! },
        endPoint: { ...endPoint! },
      };
    });
    roomsWithoutCoords.forEach((room) => {
      const roomName = getRoomName(room);
      coords[roomName] = {
        roomName,
        startPoint: { x: 0, y: 0, z: 0 },
        endPoint: { x: 2, y: 2, z: 0 },
      };
    });
    setEditedCoords(coords);
    
    // Calculate and fix bounds at edit mode entry
    const allCoordsForBounds = Object.values(coords);
    const boundsMinX = Math.min(...allCoordsForBounds.map((c) => c.startPoint.x));
    const boundsMaxX = Math.max(...allCoordsForBounds.map((c) => c.endPoint.x));
    const boundsMinY = Math.min(...allCoordsForBounds.map((c) => c.startPoint.y));
    const boundsMaxY = Math.max(...allCoordsForBounds.map((c) => c.endPoint.y));
    const boundsWidth = boundsMaxX - boundsMinX || 1;
    const boundsHeight = boundsMaxY - boundsMinY || 1;
    const boundsScaleX = containerSize.width > 0 ? containerSize.width / boundsWidth : 100;
    const boundsScaleY = containerSize.height > 0 ? containerSize.height / boundsHeight : 100;
    const boundsScale = Math.min(boundsScaleX, boundsScaleY, 150);
    
    setFixedBounds({ minX: boundsMinX, maxX: boundsMaxX, minY: boundsMinY, maxY: boundsMaxY, scale: boundsScale });
    setEditMode(true);
    setHasChanges(false);
    
    const tutorialShown = localStorage.getItem('hoffmation-floorplan-tutorial-shown');
    if (!tutorialShown) {
      setShowTutorial(true);
    }
  }, [roomsWithCoords, roomsWithoutCoords, containerSize]);

  const cancelEditMode = () => {
    setEditMode(false);
    setEditedCoords({});
    setFixedBounds(null);
    setHasChanges(false);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const saveOperations: Promise<void>[] = [];
      
      for (const [roomName, coords] of Object.entries(editedCoords)) {
        const originalRoom = roomsWithCoords.find((r) => getRoomName(r) === roomName);
        const isNewRoom = !originalRoom;
        
        const newStart = coords.startPoint;
        const newEnd = coords.endPoint;
        
        if (isNewRoom) {
          const isDefaultPos = newStart.x === 0 && newStart.y === 0 && newEnd.x === 2 && newEnd.y === 2;
          if (!isDefaultPos) {
            saveOperations.push(updateRoomSettings(roomName, {
              trilaterationStartPoint: newStart,
              trilaterationEndPoint: newEnd,
            }));
          }
        } else {
          const origStart = originalRoom.startPoint!;
          const origEnd = originalRoom.endPoint!;
          if (
            origStart.x !== newStart.x || origStart.y !== newStart.y || origStart.z !== newStart.z ||
            origEnd.x !== newEnd.x || origEnd.y !== newEnd.y || origEnd.z !== newEnd.z
          ) {
            saveOperations.push(updateRoomSettings(roomName, {
              trilaterationStartPoint: newStart,
              trilaterationEndPoint: newEnd,
            }));
          }
        }
      }
      
      if (saveOperations.length > 0) {
        await Promise.all(saveOperations);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchData();
      setFixedBounds(null);
      setEditedCoords({});
      setHasChanges(false);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save room coordinates:', error);
      alert('Fehler beim Speichern der Koordinaten');
    } finally {
      setIsSaving(false);
    }
  };

  // Measure container size
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

  // Handle case when no rooms have coordinates
  if (roomsWithCoords.length === 0 && !editMode) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={floor.name}
          onBack={onBack}
          rightContent={
            expertMode && floor.rooms.length > 0 ? (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium transition-all hover:bg-accent"
              >
                <Edit3 className="h-4 w-4" />
                Räume platzieren
              </button>
            ) : undefined
          }
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p>Keine Raumkoordinaten verfügbar</p>
            <p className="text-sm mt-2">{floor.rooms.length} Räume auf dieser Etage</p>
            {expertMode && floor.rooms.length > 0 && (
              <p className="text-sm mt-2 text-primary">Klicke "Räume platzieren" um Koordinaten zu setzen</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Get coordinates
  const getCoords = (room: Room): { startPoint: { x: number; y: number; z: number }; endPoint: { x: number; y: number; z: number } } => {
    const roomName = getRoomName(room);
    if (editMode && editedCoords[roomName]) {
      return editedCoords[roomName];
    }
    const { startPoint, endPoint } = getRoomCoords(room);
    return {
      startPoint: startPoint!,
      endPoint: endPoint!,
    };
  };

  const allCoords = editMode 
    ? Object.values(editedCoords)
    : roomsWithCoords.map((r) => getCoords(r));
  
  const minX = fixedBounds ? fixedBounds.minX : Math.min(...allCoords.map((c) => c.startPoint.x));
  const maxX = fixedBounds ? fixedBounds.maxX : Math.max(...allCoords.map((c) => c.endPoint.x));
  const minY = fixedBounds ? fixedBounds.minY : Math.min(...allCoords.map((c) => c.startPoint.y));
  const maxY = fixedBounds ? fixedBounds.maxY : Math.max(...allCoords.map((c) => c.endPoint.y));
  const scale = fixedBounds ? fixedBounds.scale : (() => {
    const floorWidth = maxX - minX || 1;
    const floorHeight = maxY - minY || 1;
    const scaleX = containerSize.width > 0 ? containerSize.width / floorWidth : 100;
    const scaleY = containerSize.height > 0 ? containerSize.height / floorHeight : 100;
    return Math.min(scaleX, scaleY, 150);
  })();

  const floorWidth = maxX - minX || 1;
  const floorHeight = maxY - minY || 1;
  const scaledWidth = floorWidth * scale;
  const scaledHeight = floorHeight * scale;

  const screenToRoom = (screenX: number, screenY: number) => {
    const roomX = screenX / scale + minX;
    const roomY = maxY - screenY / scale;
    return { x: Math.round(roomX * 10) / 10, y: Math.round(roomY * 10) / 10 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const container = containerRef.current.querySelector('.floor-plan-canvas');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left - 16;
    const screenY = e.clientY - rect.top - 16;
    
    const { x, y } = screenToRoom(screenX, screenY);
    
    setEditedCoords((prev) => {
      const roomCoords = prev[dragging.roomName];
      if (!roomCoords) return prev;
      
      const updated = { ...roomCoords };
      
      if (dragging.corner === 'move') {
        const width = updated.endPoint.x - updated.startPoint.x;
        const height = updated.endPoint.y - updated.startPoint.y;
        const newStartX = x - (dragging.offsetX ?? 0);
        const newStartY = y - (dragging.offsetY ?? 0);
        updated.startPoint = { ...updated.startPoint, x: Math.round(newStartX * 10) / 10, y: Math.round(newStartY * 10) / 10 };
        updated.endPoint = { ...updated.endPoint, x: Math.round((newStartX + width) * 10) / 10, y: Math.round((newStartY + height) * 10) / 10 };
      } else if (dragging.corner === 'start') {
        updated.startPoint = { ...updated.startPoint, x, y };
        if (updated.startPoint.x > updated.endPoint.x) {
          [updated.startPoint.x, updated.endPoint.x] = [updated.endPoint.x, updated.startPoint.x];
        }
        if (updated.startPoint.y > updated.endPoint.y) {
          [updated.startPoint.y, updated.endPoint.y] = [updated.endPoint.y, updated.startPoint.y];
        }
      } else {
        updated.endPoint = { ...updated.endPoint, x, y };
        if (updated.startPoint.x > updated.endPoint.x) {
          [updated.startPoint.x, updated.endPoint.x] = [updated.endPoint.x, updated.startPoint.x];
        }
        if (updated.startPoint.y > updated.endPoint.y) {
          [updated.startPoint.y, updated.endPoint.y] = [updated.endPoint.y, updated.startPoint.y];
        }
      }
      
      return { ...prev, [dragging.roomName]: updated };
    });
    setHasChanges(true);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div 
      className="flex h-full flex-col"
      onMouseMove={editMode ? handleMouseMove : undefined}
      onMouseUp={editMode ? handleMouseUp : undefined}
      onMouseLeave={editMode ? handleMouseUp : undefined}
    >
      <PageHeader
        title={editMode ? `${floor.name} (Bearbeiten)` : floor.name}
        onBack={editMode ? cancelEditMode : onBack}
        backIcon={editMode ? <X className="h-5 w-5" /> : undefined}
        rightContent={
          editMode ? (
            hasChanges ? (
              <button
                onClick={saveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            ) : undefined
          ) : (
            <div className="flex items-center gap-1">
              <FloorPlanFilterButton icon="Lightbulb" label="Schaltbar" active={floorViewFilters.switchable} activeColor="#F59E0B" onClick={() => toggleFloorViewFilter('switchable')} />
              <FloorPlanFilterButton icon="Shield" label="Sicherheit" active={floorViewFilters.security} activeColor="#8B4513" onClick={() => toggleFloorViewFilter('security')} />
              <FloorPlanFilterButton icon="Thermometer" label="Klima" active={floorViewFilters.climate} activeColor="#3B82F6" onClick={() => toggleFloorViewFilter('climate')} />
              <FloorPlanFilterButton icon="MoreHorizontal" label="Sonstiges" active={floorViewFilters.other} activeColor="#6B7280" onClick={() => toggleFloorViewFilter('other')} />
              {expertMode && (
                <button
                  onClick={enterEditMode}
                  className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium transition-all hover:bg-accent"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        }
      />

      <div ref={containerRef} className="flex-1 overflow-hidden p-4 flex items-center justify-center">
        <div
          className="floor-plan-canvas relative rounded-2xl bg-card p-4 shadow-soft"
          style={{
            width: scaledWidth + 32,
            height: scaledHeight + 32,
          }}
        >
          {/* Grid/Ruler */}
          {(expertMode || editMode) && (
            <>
              <div className="absolute -top-5 left-4 right-4 flex justify-between text-[10px] text-muted-foreground">
                <span>{minX.toFixed(1)}</span>
                <span>{((minX + maxX) / 2).toFixed(1)}</span>
                <span>{maxX.toFixed(1)}</span>
              </div>
              <div className="absolute -left-10 top-4 bottom-4 flex flex-col justify-between text-[10px] text-muted-foreground text-right w-8">
                <span>{maxY.toFixed(1)}</span>
                <span>{((minY + maxY) / 2).toFixed(1)}</span>
                <span>{minY.toFixed(1)}</span>
              </div>
            </>
          )}

          {/* Render rooms */}
          {(editMode ? floor.rooms : roomsWithCoords).map((room, index) => {
            const roomName = getRoomName(room);
            const roomCoordsData = getRoomCoords(room);
            const coords = editMode && editedCoords[roomName] 
              ? editedCoords[roomName] 
              : (roomCoordsData.hasCoords ? { startPoint: roomCoordsData.startPoint!, endPoint: roomCoordsData.endPoint! } : null);
            
            if (!coords) return null;
            
            const x = (coords.startPoint.x - minX) * scale;
            const y = (maxY - coords.endPoint.y) * scale;
            const w = (coords.endPoint.x - coords.startPoint.x) * scale;
            const h = (coords.endPoint.y - coords.startPoint.y) * scale;
            const roomId = room.id ?? roomName;
            const isUnplaced = !roomCoordsData.hasCoords;
            
            const origStart = roomCoordsData.startPoint;
            const origEnd = roomCoordsData.endPoint;
            const isModified = editMode && (
              isUnplaced 
                ? (coords.startPoint.x !== 0 || coords.startPoint.y !== 0 || coords.endPoint.x !== 2 || coords.endPoint.y !== 2)
                : (origStart && origEnd && (
                    origStart.x !== coords.startPoint.x || origStart.y !== coords.startPoint.y || origStart.z !== coords.startPoint.z ||
                    origEnd.x !== coords.endPoint.x || origEnd.y !== coords.endPoint.y || origEnd.z !== coords.endPoint.z
                  ))
            );

            return (
              <div key={room.id ?? `room-${index}`} className="absolute" style={{ left: x, top: y }}>
                <div
                  onClick={editMode ? undefined : () => onSelectRoom(roomId)}
                  onMouseDown={editMode ? (e) => {
                    e.preventDefault();
                    const container = containerRef.current?.querySelector('.floor-plan-canvas');
                    if (!container) return;
                    const rect = container.getBoundingClientRect();
                    const screenX = e.clientX - rect.left - 16;
                    const screenY = e.clientY - rect.top - 16;
                    const clickPos = screenToRoom(screenX, screenY);
                    const offsetX = clickPos.x - coords.startPoint.x;
                    const offsetY = clickPos.y - coords.startPoint.y;
                    setDragging({ roomName, corner: 'move', offsetX, offsetY });
                  } : undefined}
                  className={cn(
                    "relative rounded-xl border-2",
                    editMode 
                      ? isUnplaced
                        ? "bg-orange-500/30 border-orange-500 cursor-move"
                        : isModified
                          ? "bg-primary/20 border-primary cursor-move"
                          : "bg-secondary/70 border-primary/50 cursor-move" 
                      : "bg-secondary/50 border-border hover:bg-accent hover:border-primary active:scale-[0.98] cursor-pointer transition-all duration-200"
                  )}
                  style={{
                    width: Math.max(w, 60),
                    height: Math.max(h, 40),
                    backgroundColor: (() => {
                      const webui = getRoomWebUISettings(room);
                      if (webui?.color && !editMode) {
                        // Convert hex to rgba with 20% opacity
                        const hex = webui.color.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        return `rgba(${r}, ${g}, ${b}, 0.2)`;
                      }
                      return undefined;
                    })(),
                  }}
                >
                  {/* Room icon - positioned at top center */}
                  {!editMode && (() => {
                    const webui = getRoomWebUISettings(room);
                    if (webui?.icon) {
                      const IconComponent = (LucideIcons as any)[webui.icon];
                      if (IconComponent) {
                        return (
                          <div className="absolute top-1 left-0 right-0 flex justify-center pointer-events-none z-10">
                            <IconComponent 
                              size={Math.min(w, h) >= 80 ? 20 : 16} 
                              style={{ color: webui.color }}
                              className="drop-shadow-sm"
                            />
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {/* Room name and Z-coordinate input - positioned at bottom */}
                  <div className="absolute bottom-0.5 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-10">
                    <span className={cn(
                      "text-[10px] sm:text-xs font-medium text-center px-1.5 py-0.5 flex items-center gap-1 leading-tight bg-secondary/90 rounded shadow-sm",
                      isUnplaced && editMode && "text-orange-700",
                      isModified && "italic"
                    )}>
                      {isModified && <Edit3 className="h-2.5 w-2.5 inline-block" />}
                      {roomName}
                    </span>
                    {editMode && (
                      <div className="flex items-center gap-1.5 bg-secondary/95 rounded px-1.5 py-0.5 shadow-sm pointer-events-auto">
                        <div className="flex items-center gap-0.5">
                          <label className="text-[9px] text-muted-foreground">Z↓:</label>
                          <input
                            type="number"
                            step="0.1"
                            value={coords.startPoint.z ?? 0}
                            onChange={(e) => {
                              const newZ = parseFloat(e.target.value) || 0;
                              setEditedCoords(prev => ({
                                ...prev,
                                [roomName]: {
                                  roomName,
                                  startPoint: { ...coords.startPoint, z: newZ },
                                  endPoint: coords.endPoint
                                }
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-11 text-[10px] px-1 py-0.5 bg-background border border-border rounded text-center"
                            title="Bodenhöhe (Start Z)"
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <label className="text-[9px] text-muted-foreground">Z↑:</label>
                          <input
                            type="number"
                            step="0.1"
                            value={coords.endPoint.z ?? 0}
                            onChange={(e) => {
                              const newZ = parseFloat(e.target.value) || 0;
                              setEditedCoords(prev => ({
                                ...prev,
                                [roomName]: {
                                  roomName,
                                  startPoint: coords.startPoint,
                                  endPoint: { ...coords.endPoint, z: newZ }
                                }
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="w-11 text-[10px] px-1 py-0.5 bg-background border border-border rounded text-center"
                            title="Deckenhöhe (End Z)"
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground">m</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Device icons at their actual positions (only in view mode) */}
                  {!editMode && (() => {
                    const placedDevices = getPlacedDevicesForRoom(roomName);
                    if (placedDevices.length === 0) return null;
                    
                    // Room dimensions in meters
                    const roomWidth = coords.endPoint.x - coords.startPoint.x;
                    const roomHeight = coords.endPoint.y - coords.startPoint.y;
                    const roomW = Math.max(w, 60);
                    const roomH = Math.max(h, 40);
                    
                    // Determine icon size based on room pixel size
                    const minDim = Math.min(roomW, roomH);
                    const iconSize = minDim >= 120 ? 24 : minDim >= 80 ? 20 : 16; // lg/md/sm
                    const sizeClass = minDim >= 120 ? 'lg' : minDim >= 80 ? 'md' : 'sm';
                    const sizeClassName = minDim >= 120 ? 'h-6 w-6' : minDim >= 80 ? 'h-5 w-5' : 'h-4 w-4';
                    
                    return placedDevices.map((device) => {
                      const pos = device.trilaterationRoomPosition ?? device._trilaterationRoomPosition ?? 
                                  device.settings?.trilaterationRoomPosition;
                      if (!pos) return null;
                      
                      // Calculate position within room (0-1 normalized)
                      const normX = roomWidth > 0 ? Math.max(0, Math.min(1, pos.x / roomWidth)) : 0.5;
                      const normY = roomHeight > 0 ? Math.max(0, Math.min(1, pos.y / roomHeight)) : 0.5;
                      
                      // Convert to pixel position within room box (with padding to keep icons inside)
                      const padding = 4;
                      const pixelX = padding + normX * (roomW - iconSize - padding * 2);
                      const pixelY = padding + (1 - normY) * (roomH - iconSize - padding * 2); // Invert Y (0 = bottom)
                      
                      return (
                        <div 
                          key={device.id}
                          className={`absolute ${sizeClassName} flex items-center justify-center pointer-events-none`}
                          style={{ 
                            left: pixelX,
                            top: pixelY,
                          }}
                          title={device.info?.customName ?? device.info?.fullName}
                        >
                          <DeviceIcon device={device} size={sizeClass as 'sm' | 'md' | 'lg'} />
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Draggable corners in edit mode */}
                {editMode && (
                  <>
                    <div
                      className={cn(
                        "absolute w-5 h-5 rounded-full cursor-nwse-resize border-2 border-white shadow-lg transform -translate-x-1/2 translate-y-1/2",
                        isUnplaced ? "bg-orange-500" : "bg-primary",
                        dragging?.roomName === roomName && dragging?.corner === 'start' ? "ring-2 ring-white" : ""
                      )}
                      style={{ left: 0, bottom: 0 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragging({ roomName, corner: 'start' });
                      }}
                      title={`Start: (${coords.startPoint.x}, ${coords.startPoint.y})`}
                    >
                      {dragging?.roomName === roomName && dragging?.corner === 'start' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap z-50">
                          ({coords.startPoint.x}, {coords.startPoint.y})
                        </div>
                      )}
                    </div>
                    <div
                      className={cn(
                        "absolute w-5 h-5 rounded-full cursor-nwse-resize border-2 border-white shadow-lg transform translate-x-1/2 -translate-y-1/2",
                        isUnplaced ? "bg-orange-500" : "bg-primary",
                        dragging?.roomName === roomName && dragging?.corner === 'end' ? "ring-2 ring-white" : ""
                      )}
                      style={{ right: 0, top: 0 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragging({ roomName, corner: 'end' });
                      }}
                      title={`Ende: (${coords.endPoint.x}, ${coords.endPoint.y})`}
                    >
                      {dragging?.roomName === roomName && dragging?.corner === 'end' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap z-50">
                          ({coords.endPoint.x}, {coords.endPoint.y})
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tutorial popup */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Grundriss bearbeiten</h3>
            <ul className="text-sm text-muted-foreground space-y-2 mb-6">
              <li>• <strong>Raum verschieben:</strong> Auf den Raum klicken und ziehen</li>
              <li>• <strong>Größe ändern:</strong> Die Eckpunkte ziehen</li>
              <li>• <strong>Orange Räume:</strong> Noch nicht platziert</li>
              <li>• <strong>Koordinaten:</strong> Werden beim Ziehen angezeigt</li>
            </ul>
            <button
              onClick={() => {
                localStorage.setItem('hoffmation-floorplan-tutorial-shown', 'true');
                setShowTutorial(false);
              }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
