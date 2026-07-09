import { useEffect, useState } from 'react';
import { apiGet } from '@/api/client';

export interface DenyPolicy {
  rooms?: string[];
  floors?: number[];
  deviceClasses?: string[];
}

interface DenyEditorProps {
  deny: DenyPolicy;
  onChange: (deny: DenyPolicy) => void;
}

const DEVICE_CLASSES: Array<{ label: string; value: string }> = [
  { label: 'Lampe', value: 'lamp' },
  { label: 'Klima', value: 'ac' },
  { label: 'Rolladen', value: 'shutter' },
  { label: 'Steckdose/Aktor', value: 'actuator' },
  { label: 'Dimmer', value: 'dimmer' },
  { label: 'LED', value: 'led' },
  { label: 'Szene', value: 'scene' },
  { label: 'Garagentor', value: 'garageDoor' },
];

type RoomEntry = { name: string; etage?: number };
type RoomsResponse = Record<string, { etage?: number; info?: { etage?: number } }>;

function resolveEtage(room: RoomsResponse[string]): number | undefined {
  if (typeof room?.etage === 'number') return room.etage;
  if (typeof room?.info?.etage === 'number') return room.info.etage;
  return undefined;
}

const FS = 'm-0 min-w-0 border-0 p-0';

export function DenyEditor({ deny, onChange }: DenyEditorProps) {
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [floors, setFloors] = useState<number[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiGet<RoomsResponse>('/rooms')
      .then((data) => {
        const entries: RoomEntry[] = Object.entries(data).map(([name, room]) => ({
          name,
          etage: resolveEtage(room),
        }));
        setRooms(entries);
        const floorSet = new Set<number>();
        for (const e of entries) {
          if (typeof e.etage === 'number') floorSet.add(e.etage);
        }
        setFloors([...floorSet].sort((a, b) => a - b));
      })
      .catch(() => {});
  }, []);

  const deniedClasses = new Set(deny.deviceClasses ?? []);
  const deniedRooms = new Set(deny.rooms ?? []);
  const deniedFloors = new Set(deny.floors ?? []);

  function toggleClass(value: string, checked: boolean) {
    const next = new Set(deniedClasses);
    if (checked) next.delete(value);
    else next.add(value);
    onChange({ ...deny, deviceClasses: next.size > 0 ? [...next] : undefined });
  }

  function toggleRoom(name: string, checked: boolean) {
    const next = new Set(deniedRooms);
    if (checked) next.delete(name);
    else next.add(name);
    onChange({ ...deny, rooms: next.size > 0 ? [...next] : undefined });
  }

  function toggleFloor(level: number, checked: boolean) {
    const next = new Set(deniedFloors);
    if (checked) {
      next.delete(level);
    } else {
      next.add(level);
      // auto-collapse denied floor
      setExpandedFloors((prev) => {
        const ef = new Set(prev);
        ef.delete(level);
        return ef;
      });
    }
    onChange({ ...deny, floors: next.size > 0 ? [...next] : undefined });
  }

  function toggleExpand(level: number) {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  const roomsByFloor = new Map<number | undefined, RoomEntry[]>();
  for (const room of rooms) {
    const key = room.etage;
    if (!roomsByFloor.has(key)) roomsByFloor.set(key, []);
    roomsByFloor.get(key)!.push(room);
  }

  const floorLabel = (level: number) => `Etage ${level}`;

  return (
    <div className="space-y-3">
      {/* Geräteklassen */}
      <fieldset className={FS}>
        <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Geräteklassen</legend>
        {deniedClasses.size === 0 && (
          <p className="mb-2 text-xs text-green-700 dark:text-green-400">Alle (inkl. zukünftige)</p>
        )}
        <div className="grid grid-cols-2 gap-1">
          {DEVICE_CLASSES.map(({ label, value }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                checked={!deniedClasses.has(value)}
                onChange={(e) => toggleClass(value, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Etagen */}
      {floors.length > 0 && (
        <fieldset className={FS}>
          <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Etagen</legend>
          {deniedFloors.size === 0 && (
            <p className="mb-2 text-xs text-green-700 dark:text-green-400">Alle (inkl. zukünftige)</p>
          )}
          <div className="flex flex-wrap gap-3">
            {floors.map((level) => (
              <label
                key={level}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={!deniedFloors.has(level)}
                  onChange={(e) => toggleFloor(level, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {floorLabel(level)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Räume – nach Etage gruppiert, standardmäßig eingeklappt */}
      {rooms.length > 0 && (
        <fieldset className={FS}>
          <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Räume</legend>
          {deniedRooms.size === 0 && (
            <p className="mb-2 text-xs text-green-700 dark:text-green-400">Alle (inkl. zukünftige)</p>
          )}
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {floors.map((level) => {
              const floorRooms = roomsByFloor.get(level) ?? [];
              if (floorRooms.length === 0) return null;
              const isDenied = deniedFloors.has(level);
              const isExpanded = !isDenied && expandedFloors.has(level);
              return (
                <div key={level} role="group" aria-label={floorLabel(level)}>
                  <button
                    type="button"
                    onClick={() => !isDenied && toggleExpand(level)}
                    aria-expanded={isExpanded}
                    disabled={isDenied}
                    className={[
                      'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-medium',
                      isDenied
                        ? 'cursor-not-allowed text-gray-400 line-through dark:text-gray-600'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
                    ].join(' ')}
                  >
                    <span className="w-3">{isExpanded ? '▼' : '▶'}</span>
                    {floorLabel(level)} ({floorRooms.length})
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5 py-0.5 pl-4">
                      {floorRooms.map(({ name }) => (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <input
                            type="checkbox"
                            checked={!deniedRooms.has(name)}
                            onChange={(e) => toggleRoom(name, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {(roomsByFloor.get(undefined) ?? []).map(({ name }) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={!deniedRooms.has(name)}
                  onChange={(e) => toggleRoom(name, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
