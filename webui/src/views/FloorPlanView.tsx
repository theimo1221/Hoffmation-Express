import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore, type Floor, type Room, getRoomName } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { updateRoomSettings } from '@/api/rooms';
import { cn } from '@/lib/utils';
import { Maximize2, Edit3, Save, X } from 'lucide-react';

export function FloorPlanView() {
  useTranslation();
  const navigate = useNavigate();
  const { floors, fetchData, isLoading } = useDataStore();
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);

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

  return (
    <FloorPlan
      floor={selectedFloor}
      onBack={() => setSelectedFloor(null)}
      onSelectRoom={(roomId) => navigate(`/floor/${selectedFloor.level}/room/${roomId}`)}
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
  const [dragging, setDragging] = useState<{ roomName: string; corner: 'start' | 'end' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const roomsWithCoords = floor.rooms.filter((r) => r.startPoint && r.endPoint);

  // Initialize edited coords when entering edit mode
  const enterEditMode = useCallback(() => {
    const coords: Record<string, RoomCoords> = {};
    roomsWithCoords.forEach((room) => {
      const roomName = getRoomName(room);
      coords[roomName] = {
        roomName,
        startPoint: { ...room.startPoint! },
        endPoint: { ...room.endPoint! },
      };
    });
    setEditedCoords(coords);
    setEditMode(true);
    setHasChanges(false);
  }, [roomsWithCoords]);

  const cancelEditMode = () => {
    setEditMode(false);
    setEditedCoords({});
    setHasChanges(false);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      for (const [roomName, coords] of Object.entries(editedCoords)) {
        const originalRoom = roomsWithCoords.find((r) => getRoomName(r) === roomName);
        if (!originalRoom) continue;
        
        const origStart = originalRoom.startPoint!;
        const origEnd = originalRoom.endPoint!;
        const newStart = coords.startPoint;
        const newEnd = coords.endPoint;
        
        // Only save if changed
        if (
          origStart.x !== newStart.x || origStart.y !== newStart.y ||
          origEnd.x !== newEnd.x || origEnd.y !== newEnd.y
        ) {
          await updateRoomSettings(roomName, {
            trilaterationStartPoint: newStart,
            trilaterationEndPoint: newEnd,
          });
        }
      }
      await fetchData();
      setEditMode(false);
      setEditedCoords({});
      setHasChanges(false);
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
  if (roomsWithCoords.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-4 p-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">{floor.name}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <p>Keine Raumkoordinaten verfügbar</p>
            <p className="text-sm mt-2">{floor.rooms.length} Räume auf dieser Etage</p>
          </div>
        </div>
      </div>
    );
  }

  // Get coordinates (use edited if in edit mode, otherwise original)
  const getCoords = (room: Room): { startPoint: { x: number; y: number; z: number }; endPoint: { x: number; y: number; z: number } } => {
    const roomName = getRoomName(room);
    if (editMode && editedCoords[roomName]) {
      return editedCoords[roomName];
    }
    return {
      startPoint: room.startPoint!,
      endPoint: room.endPoint!,
    };
  };

  const allCoords = roomsWithCoords.map((r) => getCoords(r));
  const minX = Math.min(...allCoords.map((c) => c.startPoint.x));
  const maxX = Math.max(...allCoords.map((c) => c.endPoint.x));
  const minY = Math.min(...allCoords.map((c) => c.startPoint.y));
  const maxY = Math.max(...allCoords.map((c) => c.endPoint.y));

  const floorWidth = maxX - minX || 1;
  const floorHeight = maxY - minY || 1;

  const scaleX = containerSize.width > 0 ? containerSize.width / floorWidth : 100;
  const scaleY = containerSize.height > 0 ? containerSize.height / floorHeight : 100;
  const scale = Math.min(scaleX, scaleY, 150);

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
      if (dragging.corner === 'start') {
        updated.startPoint = { ...updated.startPoint, x, y };
      } else {
        updated.endPoint = { ...updated.endPoint, x, y };
      }
      
      // Ensure start < end
      if (updated.startPoint.x > updated.endPoint.x) {
        [updated.startPoint.x, updated.endPoint.x] = [updated.endPoint.x, updated.startPoint.x];
      }
      if (updated.startPoint.y > updated.endPoint.y) {
        [updated.startPoint.y, updated.endPoint.y] = [updated.endPoint.y, updated.startPoint.y];
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
      <header className="flex items-center justify-between p-4">
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
            <button
              onClick={saveChanges}
              disabled={isSaving || !hasChanges}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
                hasChanges 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-secondary text-muted-foreground"
              )}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          ) : (
            <>
              {expertMode && (
                <button
                  onClick={enterEditMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm font-medium transition-all hover:bg-accent"
                >
                  <Edit3 className="h-4 w-4" />
                  Bearbeiten
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Maximize2 className="h-4 w-4" />
                <span>Auto-Skaliert</span>
              </div>
            </>
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

          {roomsWithCoords.map((room, index) => {
            const roomName = getRoomName(room);
            const coords = getCoords(room);
            const x = (coords.startPoint.x - minX) * scale;
            const y = (maxY - coords.endPoint.y) * scale;
            const w = (coords.endPoint.x - coords.startPoint.x) * scale;
            const h = (coords.endPoint.y - coords.startPoint.y) * scale;
            const roomId = room.id ?? roomName;

            return (
              <div key={room.id ?? `room-${index}`} className="absolute" style={{ left: x, top: y }}>
                {/* Room rectangle */}
                <button
                  onClick={editMode ? undefined : () => onSelectRoom(roomId)}
                  className={cn(
                    "flex items-center justify-center rounded-xl border-2 transition-all duration-200",
                    editMode 
                      ? "bg-secondary/70 border-primary/50 cursor-default" 
                      : "bg-secondary/50 border-border hover:bg-accent hover:border-primary active:scale-[0.98]"
                  )}
                  style={{
                    width: Math.max(w, 60),
                    height: Math.max(h, 40),
                  }}
                >
                  <span className="text-xs font-medium text-center px-1">
                    {roomName}
                  </span>
                </button>

                {/* Draggable corners in edit mode */}
                {editMode && (
                  <>
                    {/* Bottom-left corner (startPoint) */}
                    <div
                      className="absolute w-5 h-5 bg-primary rounded-full cursor-move border-2 border-white shadow-lg transform -translate-x-1/2 translate-y-1/2 hover:scale-125 transition-transform"
                      style={{ left: 0, bottom: 0 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDragging({ roomName, corner: 'start' });
                      }}
                      title={`Start: (${coords.startPoint.x}, ${coords.startPoint.y})`}
                    />
                    {/* Top-right corner (endPoint) */}
                    <div
                      className="absolute w-5 h-5 bg-primary rounded-full cursor-move border-2 border-white shadow-lg transform translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                      style={{ right: 0, top: 0 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setDragging({ roomName, corner: 'end' });
                      }}
                      title={`Ende: (${coords.endPoint.x}, ${coords.endPoint.y})`}
                    />
                  </>
                )}
              </div>
            );
          })}

        </div>
      </div>

      {/* Edit mode info bar */}
      {editMode && (
        <div className="p-4 bg-card border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Ziehe die blauen Punkte, um die Raumgrenzen anzupassen. 
            {hasChanges && <span className="text-primary font-medium"> Änderungen vorhanden.</span>}
          </p>
        </div>
      )}
    </div>
  );
}
