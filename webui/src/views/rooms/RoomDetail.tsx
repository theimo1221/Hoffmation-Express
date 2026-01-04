import { ChevronRight, Thermometer, Lightbulb, AirVent, Blinds } from 'lucide-react';
import { type Room, type Device, type GroupData, getRoomName, getDeviceRoom, getDeviceName, filterDevicesForExpertMode } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeviceIcon } from '@/components/DeviceIcon';
import { RoomSettingsSection } from '@/components/RoomSettingsSection';
import { DeviceStatusBadges } from './DeviceStatusBadges';

interface RoomDetailProps {
  room: Room;
  devices: Record<string, Device>;
  onBack: () => void;
  onSelectDevice: (device: Device) => void;
  onSelectGroup: (room: Room, groupType: string, group: GroupData) => void;
}

export function RoomDetail({ room, devices, onBack, onSelectDevice, onSelectGroup }: RoomDetailProps) {
  const { expertMode } = useSettingsStore();
  const groupTypes = room.groupdict ? Object.keys(room.groupdict) : [];
  const roomName = getRoomName(room);
  
  // Get devices for this room, filtered by expert mode
  const allRoomDevices = Object.values(devices).filter(
    (d) => getDeviceRoom(d).toLowerCase() === roomName.toLowerCase()
  );
  const filteredDevicesDict = filterDevicesForExpertMode(
    Object.fromEntries(allRoomDevices.map(d => [d.id ?? '', d])),
    expertMode
  );
  const roomDevices = Object.values(filteredDevicesDict);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={roomName}
        onBack={onBack}
        showMenu={false}
        bugReportContext={{
          entityType: 'room',
          entityId: room.id,
          entityData: room,
        }}
      />

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Groups - full width on top */}
          {groupTypes.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                Gruppen
              </h2>
              <div className="flex flex-wrap gap-2">
                {groupTypes.includes('3') && room.groupdict?.['3'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '3', room.groupdict!['3'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Lightbulb className="inline h-4 w-4 mr-2" />
                    Licht
                  </button>
                )}
                {groupTypes.includes('8') && room.groupdict?.['8'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '8', room.groupdict!['8'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Thermometer className="inline h-4 w-4 mr-2" />
                    Heizung
                  </button>
                )}
                {groupTypes.includes('0') && room.groupdict?.['0'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '0', room.groupdict!['0'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <Blinds className="inline h-4 w-4 mr-2" />
                    Fenster
                  </button>
                )}
                {groupTypes.includes('9') && room.groupdict?.['9'] && (
                  <button 
                    onClick={() => onSelectGroup(room, '9', room.groupdict!['9'])}
                    className="rounded-xl bg-card px-4 py-2 shadow-soft hover:bg-accent transition-all active:scale-95"
                  >
                    <AirVent className="inline h-4 w-4 mr-2" />
                    Klimaanlage
                  </button>
                )}
              </div>
            </section>
          )}

          {/* 2-column layout: Devices left (2/5), Settings right (3/5) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column: Devices (2/5 on large screens) */}
            <div className="lg:col-span-2 space-y-4">
              <section>
                <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Raum-Info
                </h2>
                <div className="rounded-2xl bg-card p-4 shadow-soft space-y-3">
                  <div className="text-muted-foreground">
                    <span className="font-medium">Etage:</span> {room.info?.etage ?? 'Unbekannt'}
                  </div>
                  
                  {/* Shutter Times */}
                  {(room.sunriseShutterCallback?.nextToDo || room.sunsetShutterCallback?.nextToDo) && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <div className="text-sm font-medium text-foreground">Rollo-Zeiten:</div>
                      {room.sunriseShutterCallback?.nextToDo && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Nächstes Öffnen:</span>
                          <span className="font-mono font-medium text-foreground">
                            {new Date(room.sunriseShutterCallback.nextToDo).toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                      {room.sunsetShutterCallback?.nextToDo && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Nächstes Schließen:</span>
                          <span className="font-mono font-medium text-foreground">
                            {new Date(room.sunsetShutterCallback.nextToDo).toLocaleTimeString('de-DE', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
                  Geräte ({roomDevices.length})
                </h2>
                <div className="space-y-3">
                  {roomDevices.map((device) => {
                    const name = getDeviceName(device, roomName);
                    return (
                      <button
                        key={device.id ?? name}
                        onClick={() => onSelectDevice(device)}
                        className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <DeviceIcon device={device} size="md" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{name}</span>
                            <DeviceStatusBadges device={device} />
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    );
                  })}
                  {roomDevices.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      Keine Geräte gefunden
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right column: Room Settings (3/5 on large screens) */}
            <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
              <RoomSettingsSection room={room} onUpdate={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
