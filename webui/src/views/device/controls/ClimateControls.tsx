import { useState } from 'react';
import { Thermometer, Droplets, Snowflake, Flame } from 'lucide-react';
import type { TemperatureHistoryEntry } from '@/api/devices';
import type { Device } from '@/stores';
import { getDeviceValveLevel, getDeviceTemperature, getRoomTemperature, getDeviceDesiredTemp, getDeviceHumidity } from '@/stores/deviceStore';
import { updateDeviceSettings, getTemperatureHistory } from '@/api/devices';
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

import { isAcOn, getAcMode } from '@/stores/deviceStore';
import { setAc } from '@/api/devices';
import { useSettingsStore } from '@/stores/settingsStore';

interface AcControlsProps {
  device: Device;
}

export function AcControls({ device }: AcControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { expertMode } = useSettingsStore();

  const isOn = isAcOn(device);
  const acMode = getAcMode(device);
  const desiredTemp = getDeviceDesiredTemp(device);
  const roomTemp = getRoomTemperature(device) ?? -99;

  // Mode and temperature are staged locally and only leave with an explicit apply,
  // mirroring hoffmation-ios. Firing on every click sent a manual override per
  // keypress - each one switching the unit on and imposing a fresh automatic block -
  // while the reading snapped back to whatever the device last reported.
  // The temperature that automatic operation targets is a device setting, not a
  // manual command, and lives in the settings section.
  const [stagedMode, setStagedMode] = useState<number>(acMode === 0 ? 1 : acMode);
  const [stagedTemp, setStagedTemp] = useState<number>(desiredTemp !== -99 ? desiredTemp : 22);

  const force = async (power: boolean) => {
    await executeDeviceAction(device, (id) => setAc(id, power), setIsLoading);
  };

  const applyManual = async () => {
    await executeDeviceAction(device, (id) => setAc(id, true, stagedMode, stagedTemp), setIsLoading);
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
        {desiredTemp !== -99 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Zieltemperatur (Gerät)</span>
            <span className="font-medium">{desiredTemp.toFixed(1)}°C</span>
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
            onClick={() => force(true)}
            disabled={isLoading}
            className="rounded-xl bg-blue-500/20 text-blue-600 py-3 font-medium transition-all hover:bg-blue-500/30 active:scale-95 disabled:opacity-50"
          >
            Einschalten
          </button>
          <button
            onClick={() => force(false)}
            disabled={isLoading}
            className="rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            Ausschalten
          </button>
        </div>

        {expertMode && (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Manueller Steuerbefehl
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Modus</span>
              <select
                value={stagedMode}
                onChange={(e) => setStagedMode(Number(e.target.value))}
                disabled={isLoading}
                className="rounded-lg bg-secondary px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value={1}>Auto</option>
                <option value={2}>Kühlen</option>
                <option value={3}>Heizen</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Temperatur</span>
                <span className="font-medium">{stagedTemp.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="16"
                max="30"
                step="0.5"
                value={stagedTemp}
                onChange={(e) => setStagedTemp(Number(e.target.value))}
                disabled={isLoading}
                className="w-full accent-primary"
              />
            </div>
            <button
              onClick={() => void applyManual()}
              disabled={isLoading}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Senden…' : 'Befehl anwenden'}
            </button>
            <p className="text-xs text-muted-foreground">
              Schaltet die Anlage ein und blockiert die Automatik für eine Stunde. Die
              Zieltemperatur der Automatik wird in den Einstellungen gesetzt.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface HeaterControlsProps {
  device: Device;
}

export function HeaterControls({ device }: HeaterControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const valveLevel = getDeviceValveLevel(device);
  const roomTemp = getRoomTemperature(device) ?? -99;
  const desiredTemp = getDeviceDesiredTemp(device);

  const adjustTemp = (delta: number) => {
    if (desiredTemp === -99) return;
    const next = Math.round((desiredTemp + delta) * 10) / 10;
    if (next < 4 || next > 30) return;
    executeDeviceAction(device, (id) => updateDeviceSettings(id, { desiredTemperature: next }), setIsLoading);
  };

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustTemp(-0.5)}
                disabled={isLoading}
                className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                -
              </button>
              <span className="font-medium w-14 text-center">{desiredTemp.toFixed(1)}°C</span>
              <button
                onClick={() => adjustTemp(0.5)}
                disabled={isLoading}
                className="rounded-lg bg-secondary px-2 py-1 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                +
              </button>
            </div>
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
