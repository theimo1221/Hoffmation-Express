import { useState } from 'react';
import { Thermometer, Droplets, Snowflake, Flame } from 'lucide-react';
import type { TemperatureHistoryEntry } from '@/api/devices';
import type { Device } from '@/stores';
import { getDeviceValveLevel, getDeviceTemperature, getRoomTemperature, getDeviceDesiredTemp, getDeviceHumidity } from '@/stores/deviceStore';
import { getTemperatureHistory } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';

interface TemperatureControlsProps {
  device: Device;
}

export function TemperatureControls({ device }: TemperatureControlsProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [tempHistory, setTempHistory] = useState<TemperatureHistoryEntry[]>([]);
  
  const temperature = getDeviceTemperature(device) ?? -99;
  const humidity = getDeviceHumidity(device) ?? -1;
  
  const handleLoadHistory = async () => {
    if (!device.id) return;
    try {
      const history = await getTemperatureHistory(device.id);
      setTempHistory(history);
    } catch (e) {
      console.error('Failed to load temperature history:', e);
    }
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Thermometer className="h-4 w-4" />
        Temperatur
      </h2>
      <div className="rounded-2xl bg-card p-6 shadow-soft space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-6">
            <div>
              <span className="text-4xl font-bold">
                {temperature === -99 ? '—' : `${temperature.toFixed(1)}°C`}
              </span>
              {temperature === -99 && (
                <p className="text-sm text-muted-foreground mt-1">Kein Messwert</p>
              )}
            </div>
            {humidity >= 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Droplets className="h-5 w-5" />
                <span className="text-2xl font-semibold">{humidity.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            if (!showHistory) {
              await handleLoadHistory();
            }
            setShowHistory(!showHistory);
          }}
          className="w-full rounded-xl bg-secondary py-2 text-sm font-medium transition-all hover:bg-accent"
        >
          {showHistory ? 'Verlauf ausblenden' : 'Verlauf anzeigen (24h)'}
        </button>
        {showHistory && tempHistory.length > 0 && (
          <div className="space-y-2">
            <div className="h-32 relative">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                {(() => {
                  const validHistory = tempHistory.filter(h => h.temperature !== -99);
                  if (validHistory.length === 0) return null;
                  const temps = validHistory.map(h => h.temperature);
                  const minT = Math.min(...temps) - 1;
                  const maxT = Math.max(...temps) + 1;
                  const range = maxT - minT || 1;
                  const points = validHistory.map((h, i) => {
                    const x = (i / (validHistory.length - 1)) * 100;
                    const y = 50 - ((h.temperature - minT) / range) * 50;
                    return `${x},${y}`;
                  }).join(' ');
                  return (
                    <>
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-primary"
                        points={points}
                      />
                      <text x="2" y="8" className="text-[4px] fill-muted-foreground">{maxT.toFixed(1)}°</text>
                      <text x="2" y="48" className="text-[4px] fill-muted-foreground">{minT.toFixed(1)}°</text>
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>vor 24h</span>
              <span>jetzt</span>
            </div>
          </div>
        )}
        {showHistory && tempHistory.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">Keine Verlaufsdaten verfügbar</p>
        )}
      </div>
    </section>
  );
}

import { isDeviceOn, getAcMode } from '@/stores/deviceStore';
import { setAc } from '@/api/devices';

interface AcControlsProps {
  device: Device;
}

export function AcControls({ device }: AcControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const isOn = isDeviceOn(device);
  const acMode = getAcMode(device);
  const desiredTemp = getDeviceDesiredTemp(device);
  const roomTemp = getRoomTemperature(device) ?? -99;
  
  const handleAc = async (power: boolean, mode?: number, tempVal?: number) => {
    await executeDeviceAction(
      device,
      (id) => setAc(id, power, mode, tempVal),
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Snowflake className="h-4 w-4" />
        Klimaanlage
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOn ? 'bg-blue-500/20 text-blue-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {isOn ? 'An' : 'Aus'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Modus</span>
          <select
            value={acMode}
            onChange={(e) => handleAc(true, Number(e.target.value))}
            disabled={isLoading}
            className="rounded-lg bg-secondary px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value={0}>Auto</option>
            <option value={1}>Kühlen</option>
            <option value={2}>Entfeuchten</option>
            <option value={3}>Lüften</option>
            <option value={4}>Heizen</option>
          </select>
        </div>
        {desiredTemp !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zieltemperatur</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAc(true, undefined, Math.max(16, desiredTemp - 0.5))}
                disabled={isLoading}
                className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                -
              </button>
              <span className="font-medium w-14 text-center">{desiredTemp.toFixed(1)}°C</span>
              <button
                onClick={() => handleAc(true, undefined, Math.min(30, desiredTemp + 0.5))}
                disabled={isLoading}
                className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        )}
        {roomTemp !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Raumtemperatur</span>
            <span className="font-medium">{roomTemp.toFixed(1)}°C</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAc(true)}
            disabled={isLoading}
            className="rounded-xl bg-blue-500/20 text-blue-600 py-3 font-medium transition-all hover:bg-blue-500/30 active:scale-95 disabled:opacity-50"
          >
            Einschalten
          </button>
          <button
            onClick={() => handleAc(false)}
            disabled={isLoading}
            className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Ausschalten
          </button>
        </div>
      </div>
    </section>
  );
}

interface HeaterControlsProps {
  device: Device;
}

export function HeaterControls({ device }: HeaterControlsProps) {
  const valveLevel = getDeviceValveLevel(device);
  const roomTemp = getRoomTemperature(device) ?? -99;
  const desiredTemp = getDeviceDesiredTemp(device);
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Flame className="h-4 w-4" />
        Heizung
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
        {valveLevel >= 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ventilstellung</span>
            <span className="font-medium">{valveLevel.toFixed(0)}%</span>
          </div>
        )}
        {roomTemp !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Raumtemperatur</span>
            <span className="font-medium">{roomTemp.toFixed(1)}°C</span>
          </div>
        )}
        {desiredTemp !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zieltemperatur</span>
            <span className="font-medium">{desiredTemp.toFixed(1)}°C</span>
          </div>
        )}
      </div>
    </section>
  );
}

interface HumiditySensorControlsProps {
  device: Device;
}

export function HumiditySensorControls({ device }: HumiditySensorControlsProps) {
  const humidity = getDeviceHumidity(device) ?? -1;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Droplets className="h-4 w-4" />
        Luftfeuchtigkeit
      </h2>
      <div className="rounded-2xl bg-card p-6 shadow-soft text-center">
        <span className="text-4xl font-bold">{humidity.toFixed(1)}%</span>
      </div>
    </section>
  );
}
