import { Zap } from 'lucide-react';
import { type Device, getCapabilityNames } from '@/stores/dataStore';

interface DeviceInfoProps {
  device: Device;
  expertMode: boolean;
  showRawJson: boolean;
  setShowRawJson: (value: boolean) => void;
  capabilities: number[];
  hasTemp: boolean;
  hasHumidity: boolean;
  hasHeater: boolean;
  hasMotion: boolean;
  hasHandle: boolean;
  hasLamp: boolean;
  hasDimmable: boolean;
  hasLed: boolean;
  hasActuator: boolean;
  hasShutter: boolean;
  hasBattery: boolean;
}

export function DeviceInfo({
  device,
  expertMode,
  showRawJson,
  setShowRawJson,
  capabilities,
  hasTemp,
  hasHumidity,
  hasHeater,
  hasMotion,
  hasHandle,
  hasLamp,
  hasDimmable,
  hasLed,
  hasActuator,
  hasShutter,
  hasBattery,
}: DeviceInfoProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Zap className="h-4 w-4" />
        Info
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ID</span>
          <span className="font-mono">{device.id ?? 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Typ</span>
          <span>{device.deviceType ?? 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Capabilities</span>
          <span className="text-right text-xs max-w-[200px]" title={getCapabilityNames(capabilities)}>
            {capabilities.length > 0 ? `${capabilities.join(', ')} – ${getCapabilityNames(capabilities)}` : 'N/A'}
          </span>
        </div>
        {(() => {
          const lastUpdateRaw = device.lastUpdate ?? device._lastUpdate;
          if (!lastUpdateRaw) return null;
          const lastUpdateDate = new Date(lastUpdateRaw);
          const isValid = !isNaN(lastUpdateDate.getTime()) && lastUpdateDate.getTime() > 0;
          if (!isValid) return null;
          const now = new Date();
          const diffMs = now.getTime() - lastUpdateDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          let relativeTime: string;
          if (diffMins < 1) relativeTime = 'gerade eben';
          else if (diffMins < 60) relativeTime = `vor ${diffMins} Min.`;
          else if (diffHours < 24) relativeTime = `vor ${diffHours} Std.`;
          else relativeTime = `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
          
          const linkQuality = device.linkQuality ?? device._linkQuality;
          const isZigbee = linkQuality !== undefined;
          const batteryLevel = device.battery?.level ?? device.batteryLevel;
          const isBatteryDevice = hasBattery || batteryLevel !== undefined;
          
          let staleThresholdMins = 60;
          if (isZigbee && !isBatteryDevice) {
            staleThresholdMins = 10;
          } else if (hasTemp || hasHumidity) {
            staleThresholdMins = 15;
          } else if (hasHeater) {
            staleThresholdMins = 30;
          } else if (hasMotion || hasHandle) {
            staleThresholdMins = 24 * 60;
          } else if (hasLamp || hasDimmable || hasLed || hasActuator) {
            staleThresholdMins = 60;
          } else if (hasShutter) {
            staleThresholdMins = 60;
          }
          
          const isStale = diffMins >= staleThresholdMins;
          return (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Letztes Signal</span>
                <span className={`text-right ${isStale ? 'text-orange-500' : ''}`} title={lastUpdateDate.toLocaleString('de-DE')}>
                  {relativeTime}
                </span>
              </div>
              {linkQuality !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Link-Qualität</span>
                  <span className={`text-right ${linkQuality <= 5 ? 'text-red-500' : linkQuality <= 20 ? 'text-orange-500' : ''}`}>
                    {linkQuality}
                  </span>
                </div>
              )}
            </>
          );
        })()}
        {expertMode && (() => {
          const pos = (device as Record<string, unknown>).position as { x?: number; y?: number; z?: number; roomName?: string } | undefined;
          const trilaterationPos = (device.settings as Record<string, unknown> | undefined)?.trilaterationRoomPosition as { x?: number; y?: number; z?: number } | undefined;
          const displayPos = pos ?? trilaterationPos;
          if (!displayPos) return null;
          return (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position (X/Y/Z)</span>
              <span className="font-mono text-xs">
                {displayPos.x?.toFixed(2) ?? '?'} / {displayPos.y?.toFixed(2) ?? '?'} / {displayPos.z?.toFixed(2) ?? '?'}
                {pos?.roomName && <span className="text-muted-foreground ml-1">({pos.roomName})</span>}
              </span>
            </div>
          );
        })()}
        {expertMode && (
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full mt-2 rounded-xl bg-secondary py-2 text-sm font-medium transition-all hover:bg-accent"
          >
            {showRawJson ? 'Raw JSON ausblenden' : 'Raw JSON anzeigen'}
          </button>
        )}
        {showRawJson && (
          <div className="mt-2">
            <div className="flex justify-end mb-1">
              <button
                onClick={() => {
                  const text = JSON.stringify(device, null, 2);
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text);
                  } else {
                    // Fallback for non-HTTPS
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                  }
                }}
                className="text-xs text-primary hover:underline"
              >
                Kopieren
              </button>
            </div>
            <pre className="bg-secondary rounded-xl p-3 text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
              {JSON.stringify(device, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
