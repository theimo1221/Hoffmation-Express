import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { Device } from '@/stores/dataStore';
import { blockAutomatic, liftAutomaticBlock } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';

interface BlockAutomaticControlsProps {
  device: Device;
  onUpdate: () => Promise<void>;
}

function formatBlockedUntil(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return 'Nicht blockiert';
  if (timestamp <= Date.now()) return 'Abgelaufen';
  return new Date(timestamp).toLocaleString('de-DE');
}

export function BlockAutomaticControls({ device, onUpdate }: BlockAutomaticControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [blockHours, setBlockHours] = useState(1);
  const [blockUntilDate, setBlockUntilDate] = useState('');
  
  const getBlockedUntil = (): number => {
    const handler = device.blockAutomationHandler ?? (device as Record<string, unknown>)._blockAutomationHandler as typeof device.blockAutomationHandler;
    const value = handler?.automaticBlockedUntil ?? (handler as Record<string, unknown>)?._automaticBlockedUntil;
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    if (typeof value === 'number') return value;
    return 0;
  };
  const automaticBlockedUntil = getBlockedUntil();
  
  const handleBlockAutomatic = async (hours: number) => {
    await executeDeviceAction(
      device,
      (id) => blockAutomatic(id, hours * 3600),
      onUpdate,
      setIsLoading
    );
  };
  
  const handleLiftBlock = async () => {
    await executeDeviceAction(
      device,
      (id) => liftAutomaticBlock(id),
      onUpdate,
      setIsLoading
    );
  };
  
  const handleBlockUntilDate = async (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const nowMs = Date.now();
    const targetMs = targetDate.getTime();
    const diffSeconds = Math.floor((targetMs - nowMs) / 1000);
    if (diffSeconds > 0) {
      await executeDeviceAction(
        device,
        (id) => blockAutomatic(id, diffSeconds),
        onUpdate,
        setIsLoading
      );
    }
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Automatik blockieren
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Blockiert bis</span>
          <span className="font-medium">{formatBlockedUntil(automaticBlockedUntil)}</span>
        </div>
        
        {automaticBlockedUntil > Date.now() && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleLiftBlock}
              disabled={isLoading}
              className="rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
            >
              Aufheben
            </button>
            <button
              onClick={() => handleBlockAutomatic(blockHours)}
              disabled={isLoading}
              className="rounded-xl bg-orange-500/20 text-orange-600 py-3 font-medium transition-all hover:bg-orange-500/30 active:scale-95 disabled:opacity-50"
            >
              +{blockHours}h verlängern
            </button>
          </div>
        )}

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Blockieren für</span>
            <span className="font-medium">{blockHours} Stunden</span>
          </div>
          <input
            type="range"
            min="1"
            max="48"
            step="1"
            value={blockHours}
            onChange={(e) => setBlockHours(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1h</span>
            <span>24h</span>
            <span>48h</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Oder blockieren bis</span>
          </div>
          <input
            type="datetime-local"
            value={blockUntilDate}
            onChange={(e) => setBlockUntilDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {automaticBlockedUntil <= Date.now() && (
          <button
            onClick={() => handleBlockAutomatic(blockHours)}
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-500/20 text-orange-600 py-3 font-medium transition-all hover:bg-orange-500/30 active:scale-95 disabled:opacity-50"
          >
            Für {blockHours} Stunden blockieren
          </button>
        )}

        {blockUntilDate && (
          <button
            onClick={() => handleBlockUntilDate(blockUntilDate)}
            disabled={isLoading || !blockUntilDate}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
          >
            Bis {blockUntilDate ? new Date(blockUntilDate).toLocaleString('de-DE') : '...'} blockieren
          </button>
        )}
      </div>
    </section>
  );
}
