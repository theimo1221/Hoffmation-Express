import { Blinds } from 'lucide-react';

interface ShutterControlsProps {
  isLoading: boolean;
  currentLevel: number;
  desiredPosition: number;
  setDesiredPosition: (value: number) => void;
  onSetShutter: (level: number) => Promise<void>;
}

export function ShutterQuickControls({
  isLoading,
  onSetShutter,
}: Pick<ShutterControlsProps, 'isLoading' | 'onSetShutter'>) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Blinds className="h-4 w-4" />
        Rolladen
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSetShutter(0)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            Zu
          </button>
          <button
            onClick={() => onSetShutter(50)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            50%
          </button>
          <button
            onClick={() => onSetShutter(100)}
            disabled={isLoading}
            className="rounded-xl bg-secondary py-3 font-medium transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
          >
            Auf
          </button>
        </div>
      </div>
    </section>
  );
}

export function ShutterPositionControls({
  isLoading,
  currentLevel,
  desiredPosition,
  setDesiredPosition,
  onSetShutter,
}: ShutterControlsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Blinds className="h-4 w-4" />
        Position
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Aktuelle Position</span>
          <span className="font-medium">{currentLevel.toFixed(0)}%</span>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Gewünschte Position</span>
            <span className="font-medium">{desiredPosition}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={desiredPosition}
            onChange={(e) => setDesiredPosition(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <button
          onClick={() => onSetShutter(desiredPosition)}
          disabled={isLoading}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
        >
          Anwenden
        </button>
      </div>
    </section>
  );
}
