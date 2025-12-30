import { X } from 'lucide-react';
import { getDeviceName, type Device } from '@/stores/dataStore';
import { DeviceIcon } from '@/components/DeviceIcon';

interface DevicePickerProps {
  isOpen: boolean;
  unplacedDevices: Device[];
  editedPositions: Record<string, { x: number; y: number; z: number }>;
  roomName: string;
  onClose: () => void;
  onSelectDevice: (device: Device) => void;
}

export function DevicePicker({
  isOpen,
  unplacedDevices,
  editedPositions,
  roomName,
  onClose,
  onSelectDevice,
}: DevicePickerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-4 max-w-sm w-full shadow-lg max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gerät platzieren</h3>
          <button
            onClick={onClose}
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
                key={device.id}
                onClick={() => {
                  onSelectDevice(device);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DeviceIcon device={device} size="sm" />
                </div>
                <span className="flex-1 font-medium">{deviceName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
