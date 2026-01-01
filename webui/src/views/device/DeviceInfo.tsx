import { Zap, Clock } from 'lucide-react';
import { type Device, getCapabilityNames } from '@/stores';
import { DeviceCapability, hasCapability } from '@/stores/deviceStore';

interface BaseCommand {
  timestamp?: number | Date;
  logMessage?: string;
}

interface DeviceInfoProps {
  device: Device;
  expertMode: boolean;
  showRawJson: boolean;
  setShowRawJson: (value: boolean) => void;
}

export function DeviceInfo({
  device,
  expertMode,
  showRawJson,
  setShowRawJson,
}: DeviceInfoProps) {
  // Extract capabilities from device itself
  const capabilities = device.deviceCapabilities ?? [];
  const hasTemp = hasCapability(device, DeviceCapability.temperatureSensor);
  const hasHumidity = hasCapability(device, DeviceCapability.humiditySensor);
  const hasHeater = hasCapability(device, DeviceCapability.heater);
  const hasMotion = hasCapability(device, DeviceCapability.motionSensor);
  const hasHandle = hasCapability(device, DeviceCapability.handleSensor);
  const hasLamp = hasCapability(device, DeviceCapability.lamp);
  const hasDimmable = hasCapability(device, DeviceCapability.dimmableLamp);
  const hasLed = hasCapability(device, DeviceCapability.ledLamp);
  const hasActuator = hasCapability(device, DeviceCapability.actuator);
  const hasShutter = hasCapability(device, DeviceCapability.shutter);
  const hasBattery = hasCapability(device, DeviceCapability.batteryDriven);
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
          <span className="text-right text-xs max-w-[200px]" title={getCapabilityNames(device).join(', ')}>
            {capabilities.length > 0 ? `${capabilities.join(', ')} – ${getCapabilityNames(device).join(', ')}` : 'N/A'}
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
        {expertMode && (() => {
          const lastCommands = (device as Record<string, unknown>).lastCommands as BaseCommand[] | undefined;
          if (!lastCommands || lastCommands.length === 0) return null;
          
          return (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Letzte Aktionen</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lastCommands.map((command, idx) => {
                  const timestamp = command.timestamp;
                  let timeStr = '';
                  if (timestamp) {
                    const date = typeof timestamp === 'number' 
                      ? new Date(timestamp) 
                      : new Date(timestamp);
                    if (!isNaN(date.getTime())) {
                      timeStr = date.toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      });
                    }
                  }
                  
                  return (
                    <div key={idx} className="bg-secondary/50 rounded-lg p-2 text-xs">
                      {timeStr && (
                        <div className="text-muted-foreground font-mono mb-1">{timeStr}</div>
                      )}
                      <div className="text-foreground">{command.logMessage || 'N/A'}</div>
                    </div>
                  );
                })}
              </div>
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
