import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore, type Floor, type Room, type Device, getRoomName, getDeviceRoom, getDeviceName } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateRoomSettings } from '@/api/rooms';
import { setDevicePosition } from '@/api/devices';
import { cn } from '@/lib/utils';
import { Edit3, Save, X, ArrowLeft, Plus } from 'lucide-react';
import { DeviceIcon } from '@/components/DeviceIcon';

export function FloorPlanView() {
  useTranslation();
  const navigate = useNavigate();
  const { floors, devices, fetchData, isLoading } = useDataStore();
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading && floors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!selectedFloor) {
    return <HouseCrossSection floors={floors} onSelectFloor={setSelectedFloor} />;
  }

  if (selectedRoom) {
    return (
      <RoomFloorPlanDetail
        room={selectedRoom}
        devices={devices}
        onBack={() => setSelectedRoom(null)}
        onSelectDevice={(device) => navigate(`/devices/${encodeURIComponent(device.id ?? '')}`)}
      />
    );
  }

  return (
    <FloorPlan
      floor={selectedFloor}
      onBack={() => setSelectedFloor(null)}
      onSelectRoom={(roomId) => {
        const room = selectedFloor.rooms.find(r => (r.id ?? getRoomName(r)) === roomId);
        if (room) setSelectedRoom(room);
      }}
    />
  );
}

interface HouseCrossSectionProps {
  floors: Floor[];
  onSelectFloor: (floor: Floor) => void;
}

function HouseCrossSection({ floors, onSelectFloor }: HouseCrossSectionProps) {
  const sortedFloors = [...floors].sort((a, b) => b.level - a.level);

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-card shadow-soft-lg">
          {sortedFloors.map((floor, index) => (
            <button
              key={floor.level}
              onClick={() => onSelectFloor(floor)}
              className={cn(
                'flex w-full items-center justify-between px-6 py-5 transition-all duration-200 ease-out-expo',
                'hover:bg-accent active:scale-[0.98]',
                index !== sortedFloors.length - 1 && 'border-b border-border'
              )}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-lg font-semibold">{floor.name}</span>
                <span className="text-sm text-muted-foreground">
                  {floor.rooms.length} {floor.rooms.length === 1 ? 'Raum' : 'Räume'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-2xl">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FloorPlanProps {
  floor: Floor;
  onBack: () => void;
  onSelectRoom: (roomId: string) => void;
}

interface RoomCoords {
  roomName: string;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

function FloorPlan({ floor, onBack, onSelectRoom }: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { expertMode } = useSettingsStore();
  const { fetchData } = useDataStore();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [editedCoords, setEditedCoords] = useState<Record<string, RoomCoords>>({});
  const [dragging, setDragging] = useState<{ roomName: string; corner: 'start' | 'end' | 'move'; offsetX?: number; offsetY?: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Fixed scale/bounds when entering edit mode (prevents re-scaling while dragging)
  const [fixedBounds, setFixedBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number; scale: number } | null>(null);
  // Show tutorial popup only once
  const [showTutorial, setShowTutorial] = useState(false);

  // Helper to get room coordinates - check both direct properties and settings
  const getRoomCoords = (room: Room) => {
    const startPoint = room.startPoint ?? room.settings?.trilaterationStartPoint;
    const endPoint = room.endPoint ?? room.settings?.trilaterationEndPoint;
    return { startPoint, endPoint, hasCoords: !!(startPoint && endPoint) };
  };

  const roomsWithCoords = floor.rooms.filter((r) => getRoomCoords(r).hasCoords);
  const roomsWithoutCoords = floor.rooms.filter((r) => !getRoomCoords(r).hasCoords);

  // Initialize edited coords when entering edit mode (including unplaced rooms with default coords)
  const enterEditMode = useCallback(() => {
    const coords: Record<string, RoomCoords> = {};
    // Add rooms with existing coords
    roomsWithCoords.forEach((room) => {
      const roomName = getRoomName(room);
      const { startPoint, endPoint } = getRoomCoords(room);
      coords[roomName] = {
        roomName,
        startPoint: { ...startPoint! },
        endPoint: { ...endPoint! },
      };
    });
    // Add unplaced rooms with default coords (will appear at origin)
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
    
    // Show tutorial popup only once (check localStorage)
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
      // Collect all save operations
      const saveOperations: Promise<void>[] = [];
      
      for (const [roomName, coords] of Object.entries(editedCoords)) {
        const originalRoom = roomsWithCoords.find((r) => getRoomName(r) === roomName);
        const isNewRoom = !originalRoom;
        
        const newStart = coords.startPoint;
        const newEnd = coords.endPoint;
        
        if (isNewRoom) {
          // New room - always save if it has been moved from default position
          const isDefaultPos = newStart.x === 0 && newStart.y === 0 && newEnd.x === 2 && newEnd.y === 2;
          if (!isDefaultPos) {
            saveOperations.push(updateRoomSettings(roomName, {
              trilaterationStartPoint: newStart,
              trilaterationEndPoint: newEnd,
            }));
          }
        } else {
          // Existing room - only save if changed
          const origStart = originalRoom.startPoint!;
          const origEnd = originalRoom.endPoint!;
          if (
            origStart.x !== newStart.x || origStart.y !== newStart.y ||
            origEnd.x !== newEnd.x || origEnd.y !== newEnd.y
          ) {
            saveOperations.push(updateRoomSettings(roomName, {
              trilaterationStartPoint: newStart,
              trilaterationEndPoint: newEnd,
            }));
          }
        }
      }
      
      // Execute all save operations in parallel
      if (saveOperations.length > 0) {
        await Promise.all(saveOperations);
      }
      
      // Small delay to ensure backend has processed the changes
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

  // Handle case when no rooms have coordinates - still allow editing if there are rooms
  if (roomsWithCoords.length === 0 && !editMode) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
            >
              ←
            </button>
            <h1 className="text-xl font-semibold">{floor.name}</h1>
          </div>
          {expertMode && floor.rooms.length > 0 && (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium transition-all hover:bg-accent"
            >
              <Edit3 className="h-4 w-4" />
              Räume platzieren
            </button>
          )}
        </header>
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

  // Get coordinates (use edited if in edit mode, otherwise from room or settings)
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

  // In edit mode with fixed bounds, use those; otherwise calculate dynamically
  const allCoords = editMode 
    ? Object.values(editedCoords)
    : roomsWithCoords.map((r) => getCoords(r));
  
  // Use fixed bounds in edit mode to prevent re-scaling while dragging
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

  // Convert screen coords to room coords
  const screenToRoom = (screenX: number, screenY: number) => {
    const roomX = screenX / scale + minX;
    const roomY = maxY - screenY / scale;
    return { x: Math.round(roomX * 10) / 10, y: Math.round(roomY * 10) / 10 };
  };

  // Handle drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const container = containerRef.current.querySelector('.floor-plan-canvas');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left - 16; // account for padding
    const screenY = e.clientY - rect.top - 16;
    
    const { x, y } = screenToRoom(screenX, screenY);
    
    setEditedCoords((prev) => {
      const roomCoords = prev[dragging.roomName];
      if (!roomCoords) return prev;
      
      const updated = { ...roomCoords };
      
      if (dragging.corner === 'move') {
        // Move entire room - maintain size, shift position
        const width = updated.endPoint.x - updated.startPoint.x;
        const height = updated.endPoint.y - updated.startPoint.y;
        const newStartX = x - (dragging.offsetX ?? 0);
        const newStartY = y - (dragging.offsetY ?? 0);
        updated.startPoint = { ...updated.startPoint, x: Math.round(newStartX * 10) / 10, y: Math.round(newStartY * 10) / 10 };
        updated.endPoint = { ...updated.endPoint, x: Math.round((newStartX + width) * 10) / 10, y: Math.round((newStartY + height) * 10) / 10 };
      } else if (dragging.corner === 'start') {
        updated.startPoint = { ...updated.startPoint, x, y };
        // Ensure start < end
        if (updated.startPoint.x > updated.endPoint.x) {
          [updated.startPoint.x, updated.endPoint.x] = [updated.endPoint.x, updated.startPoint.x];
        }
        if (updated.startPoint.y > updated.endPoint.y) {
          [updated.startPoint.y, updated.endPoint.y] = [updated.endPoint.y, updated.startPoint.y];
        }
      } else {
        updated.endPoint = { ...updated.endPoint, x, y };
        // Ensure start < end
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
      <header className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={editMode ? cancelEditMode : onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            {editMode ? <X className="h-5 w-5" /> : '←'}
          </button>
          <h1 className="text-xl font-semibold">
            {floor.name}
            {editMode && <span className="text-primary ml-2">(Bearbeiten)</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            hasChanges && (
              <button
                onClick={saveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            )
          ) : (
            expertMode && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium transition-all hover:bg-accent"
              >
                <Edit3 className="h-4 w-4" />
                Bearbeiten
              </button>
            )
          )}
        </div>
      </header>

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
              <div className="absolute -left-5 top-4 bottom-4 flex flex-col justify-between text-[10px] text-muted-foreground">
                <span>{maxY.toFixed(1)}</span>
                <span>{((minY + maxY) / 2).toFixed(1)}</span>
                <span>{minY.toFixed(1)}</span>
              </div>
            </>
          )}

          {/* Render rooms - in edit mode include all rooms, otherwise only those with coords */}
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
            
            // Check if room has been modified
            const origStart = roomCoordsData.startPoint;
            const origEnd = roomCoordsData.endPoint;
            const isModified = editMode && (
              isUnplaced 
                ? (coords.startPoint.x !== 0 || coords.startPoint.y !== 0 || coords.endPoint.x !== 2 || coords.endPoint.y !== 2)
                : (origStart && origEnd && (
                    origStart.x !== coords.startPoint.x || origStart.y !== coords.startPoint.y ||
                    origEnd.x !== coords.endPoint.x || origEnd.y !== coords.endPoint.y
                  ))
            );

            return (
              <div key={room.id ?? `room-${index}`} className="absolute" style={{ left: x, top: y }}>
                {/* Room rectangle - draggable in edit mode to move entire room */}
                <div
                  onClick={editMode ? undefined : () => onSelectRoom(roomId)}
                  onMouseDown={editMode ? (e) => {
                    e.preventDefault();
                    // Calculate offset from click position to room start point
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
                    "flex items-center justify-center rounded-xl border-2",
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
                  }}
                >
                  <span className={cn(
                    "text-xs font-medium text-center px-1 flex items-center gap-1",
                    isUnplaced && editMode && "text-orange-700",
                    isModified && "italic"
                  )}>
                    {isModified && <Edit3 className="h-3 w-3 inline-block" />}
                    {roomName}
                  </span>
                </div>

                {/* Draggable corners in edit mode */}
                {editMode && (
                  <>
                    {/* Bottom-left corner (startPoint) */}
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
                      {/* Show coordinates while dragging this corner */}
                      {dragging?.roomName === roomName && dragging?.corner === 'start' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-[10px] rounded whitespace-nowrap z-50">
                          ({coords.startPoint.x}, {coords.startPoint.y})
                        </div>
                      )}
                    </div>
                    {/* Top-right corner (endPoint) */}
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
                      {/* Show coordinates while dragging this corner */}
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

      {/* Tutorial popup - shown only once */}
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

interface RoomFloorPlanDetailProps {
  room: Room;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
}

function RoomFloorPlanDetail({ room, devices, onBack, onSelectDevice }: RoomFloorPlanDetailProps) {
  const roomName = getRoomName(room);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Local edited positions - deviceId -> position
  const [editedPositions, setEditedPositions] = useState<Record<string, { x: number; y: number; z: number }>>({});
  // Dragging state for devices
  const [draggingDevice, setDraggingDevice] = useState<string | null>(null);
  // Fixed scale when entering edit mode
  const [fixedScale, setFixedScale] = useState<number | null>(null);
  const { expertMode } = useSettingsStore();
  const { fetchData } = useDataStore();

  // Get room coordinates
  const startPoint = room.startPoint ?? room.settings?.trilaterationStartPoint;
  const endPoint = room.endPoint ?? room.settings?.trilaterationEndPoint;
  
  // Helper to get device position from various sources
  const getDevicePos = (d: Device) => {
    return d.trilaterationRoomPosition ?? d._trilaterationRoomPosition ?? 
           d.settings?.trilaterationRoomPosition ?? (d.settings as Record<string, unknown>)?._trilaterationRoomPosition as { x: number; y: number; z: number } | undefined;
  };

  // Get devices in this room - only show placed devices (with trilaterationRoomPosition)
  const allRoomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  const placedDevices = allRoomDevices.filter((d) => getDevicePos(d));
  const unplacedDevices = allRoomDevices.filter((d) => !getDevicePos(d));
  // In edit mode show placed + locally edited devices
  const locallyPlacedDeviceIds = Object.keys(editedPositions);
  const locallyPlacedDevices = allRoomDevices.filter(d => d.id && locallyPlacedDeviceIds.includes(d.id));
  const roomDevices = editMode ? [...placedDevices, ...locallyPlacedDevices] : placedDevices;
  const hasChanges = locallyPlacedDeviceIds.length > 0;

  // Measure container
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

  // Calculate scale - use fixed scale in edit mode to prevent jumps while dragging
  const roomWidth = startPoint && endPoint ? endPoint.x - startPoint.x : 5;
  const roomHeight = startPoint && endPoint ? endPoint.y - startPoint.y : 5;
  const calculatedScaleX = containerSize.width > 0 ? containerSize.width / roomWidth : 100;
  const calculatedScaleY = containerSize.height > 0 ? containerSize.height / roomHeight : 100;
  const calculatedScale = Math.min(calculatedScaleX, calculatedScaleY, 150);
  const scale = fixedScale ?? calculatedScale;
  const scaledWidth = roomWidth * scale;
  const scaledHeight = roomHeight * scale;

  // Convert screen coords to room coords
  const screenToRoom = (screenX: number, screenY: number) => {
    if (!startPoint || !endPoint) return { x: 0, y: 0 };
    const roomX = screenX / scale + startPoint.x;
    const roomY = endPoint.y - screenY / scale;
    return { x: Math.round(roomX * 10) / 10, y: Math.round(roomY * 10) / 10 };
  };

  // Handle device drag
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

  return (
    <div 
      className="flex h-full flex-col"
      onMouseMove={editMode ? handleMouseMove : undefined}
      onMouseUp={editMode ? handleMouseUp : undefined}
      onMouseLeave={editMode ? handleMouseUp : undefined}
    >
      <header className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={editMode ? () => {
              setEditMode(false);
              setFixedScale(null);
              setEditedPositions({});
            } : onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            {editMode ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <div>
            <h1 className="text-xl font-semibold">
              {roomName}
              {editMode && <span className="text-primary ml-2">(Bearbeiten)</span>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {placedDevices.length} platziert
              {unplacedDevices.length > 0 && editMode && (
                <span className="text-orange-500"> • {unplacedDevices.length} unplatziert</span>
              )}
            </p>
          </div>
        </div>
        {editMode ? (
          hasChanges && (
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
          )
        ) : (
          expertMode && (
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
          )
        )}
      </header>

      <div ref={containerRef} className="flex-1 overflow-hidden p-4 flex items-center justify-center">
        <div
          className="room-canvas relative rounded-2xl bg-card p-4 shadow-soft border-2 border-primary/30"
          style={{
            width: scaledWidth + 32,
            height: scaledHeight + 32,
          }}
        >
          {/* Room outline */}
          <div 
            className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-lg"
          />

          {/* Devices */}
          {roomDevices.map((device) => {
            const deviceName = getDeviceName(device, roomName);
            // Get device position - check local edits first, then device data
            const localPos = device.id ? editedPositions[device.id] : undefined;
            const devicePos = localPos ?? device.trilaterationRoomPosition ?? device._trilaterationRoomPosition;
            const isUnplaced = !devicePos;
            let x = 0, y = 0;
            
            if (devicePos && startPoint && endPoint) {
              // Use actual device position
              x = ((devicePos.x - startPoint.x) / roomWidth) * scaledWidth;
              y = ((endPoint.y - devicePos.y) / roomHeight) * scaledHeight;
            } else if (editMode) {
              // In edit mode, distribute unplaced devices at bottom
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
                onClick={editMode ? undefined : () => onSelectDevice(device)}
                onMouseDown={editMode && device.id ? (e) => {
                  e.preventDefault();
                  setDraggingDevice(device.id!);
                } : undefined}
                className={cn(
                  "absolute flex flex-col items-center justify-center p-2 rounded-xl shadow-soft",
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
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  isUnplaced && editMode ? "bg-orange-500/20" : "bg-primary/10"
                )}>
                  <DeviceIcon device={device} size="sm" />
                </div>
                {/* Show coordinates while dragging */}
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

          {/* Plus button to add device in edit mode */}
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

      {/* Device picker popup */}
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
                      // Place device in center of room locally
                      const centerX = (startPoint.x + endPoint.x) / 2;
                      const centerY = (startPoint.y + endPoint.y) / 2;
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
    </div>
  );
}
