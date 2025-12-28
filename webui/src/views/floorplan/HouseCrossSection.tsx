import { cn } from '@/lib/utils';
import type { HouseCrossSectionProps } from './types';

export function HouseCrossSection({ floors, onSelectFloor }: HouseCrossSectionProps) {
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
