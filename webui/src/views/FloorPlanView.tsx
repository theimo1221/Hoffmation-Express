import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore, type Floor, getRoomName } from '@/stores/dataStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';

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

function FloorPlan({ floor, onBack, onSelectRoom }: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { expertMode } = useSettingsStore();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const roomsWithCoords = floor.rooms.filter((r) => r.startPoint && r.endPoint);

  // Measure container size (no tabbar on floor plan - uses menu bubble)
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth - 32, // padding
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

  const minX = Math.min(...roomsWithCoords.map((r) => r.startPoint!.x));
  const maxX = Math.max(...roomsWithCoords.map((r) => r.endPoint!.x));
  const minY = Math.min(...roomsWithCoords.map((r) => r.startPoint!.y));
  const maxY = Math.max(...roomsWithCoords.map((r) => r.endPoint!.y));

  const floorWidth = maxX - minX || 1;
  const floorHeight = maxY - minY || 1;

  // Auto-scale to fit container
  const scaleX = containerSize.width > 0 ? containerSize.width / floorWidth : 100;
  const scaleY = containerSize.height > 0 ? containerSize.height / floorHeight : 100;
  const scale = Math.min(scaleX, scaleY, 150); // Cap at 150 to avoid too large rooms

  const scaledWidth = floorWidth * scale;
  const scaledHeight = floorHeight * scale;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            ←
          </button>
          <h1 className="text-xl font-semibold">{floor.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Maximize2 className="h-4 w-4" />
          <span>Auto-Skaliert</span>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-hidden p-4 flex items-center justify-center">
        <div
          className="relative rounded-2xl bg-card p-4 shadow-soft"
          style={{
            width: scaledWidth + 32,
            height: scaledHeight + 32,
          }}
        >
          {/* Expert mode: Grid/Ruler */}
          {expertMode && (
            <>
              {/* X-axis labels */}
              <div className="absolute -top-5 left-4 right-4 flex justify-between text-[10px] text-muted-foreground">
                <span>{minX.toFixed(1)}</span>
                <span>{((minX + maxX) / 2).toFixed(1)}</span>
                <span>{maxX.toFixed(1)}</span>
              </div>
              {/* Y-axis labels */}
              <div className="absolute -left-5 top-4 bottom-4 flex flex-col justify-between text-[10px] text-muted-foreground">
                <span>{maxY.toFixed(1)}</span>
                <span>{((minY + maxY) / 2).toFixed(1)}</span>
                <span>{minY.toFixed(1)}</span>
              </div>
            </>
          )}

          {roomsWithCoords.map((room, index) => {
            const x = (room.startPoint!.x - minX) * scale;
            const y = (maxY - room.endPoint!.y) * scale;
            const w = (room.endPoint!.x - room.startPoint!.x) * scale;
            const h = (room.endPoint!.y - room.startPoint!.y) * scale;
            const roomId = room.id ?? getRoomName(room);

            return (
              <button
                key={room.id ?? `room-${index}`}
                onClick={() => onSelectRoom(roomId)}
                className="absolute flex items-center justify-center rounded-xl border-2 transition-all duration-200 bg-secondary/50 border-border hover:bg-accent hover:border-primary active:scale-[0.98]"
                style={{
                  left: x,
                  top: y,
                  width: Math.max(w, 60),
                  height: Math.max(h, 40),
                }}
              >
                <span className="text-xs font-medium text-center px-1">
                  {getRoomName(room)}
                </span>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
}
