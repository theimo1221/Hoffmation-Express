import { type Device, getDeviceName, getDeviceRoom, getRoomName, getRoomEtage, type Room } from '@/stores';
import { DeviceCapability, hasCapability } from '@/stores/deviceStore';

export const FLOOR_NAMES: Record<number, string> = {
  [-1]: 'Keller',
  0: 'Erdgeschoss',
  1: '1. Obergeschoss',
  2: '2. Obergeschoss',
  3: 'Dachboden',
  99: 'Außen',
};

export function getFloorName(level: number): string {
  return FLOOR_NAMES[level] ?? `Etage ${level}`;
}

export const LOW_BATTERY_THRESHOLD = 20;

export function getDeviceEmoji(device: Device): string {
  if (hasCapability(device, DeviceCapability.motionSensor)) return '👁️';
  if (hasCapability(device, DeviceCapability.temperatureSensor)) return '🌡️';
  if (hasCapability(device, DeviceCapability.handleSensor)) return '🚪';
  if (hasCapability(device, DeviceCapability.lamp) || hasCapability(device, DeviceCapability.dimmableLamp) || hasCapability(device, DeviceCapability.ledLamp)) return '💡';
  if (hasCapability(device, DeviceCapability.shutter)) return '🪟';
  if (hasCapability(device, DeviceCapability.actuator)) return '🔌';
  if (hasCapability(device, DeviceCapability.heater)) return '🔥';
  if (hasCapability(device, DeviceCapability.ac)) return '❄️';
  if (hasCapability(device, DeviceCapability.speaker)) return '🔊';
  if (hasCapability(device, DeviceCapability.humiditySensor)) return '💧';
  if (hasCapability(device, DeviceCapability.illuminationSensor)) return '☁️';
  return '📱';
}

interface PrintableDevice {
  device: Device;
  roomName: string;
  floor: number;
}

export function printUnreachableDevices(
  devices: Device[],
  rooms: Record<string, Room>
): void {
  // Group devices by floor
  const devicesByFloor: Record<number, PrintableDevice[]> = {};

  devices.forEach((device) => {
    const deviceRoomName = getDeviceRoom(device);
    
    // Find room by matching device's room name with getRoomName(room)
    const room = Object.values(rooms).find((r) => {
      return getRoomName(r).toLowerCase() === deviceRoomName.toLowerCase();
    });
    
    const floor = room ? getRoomEtage(room) : 99;

    if (!devicesByFloor[floor]) {
      devicesByFloor[floor] = [];
    }
    devicesByFloor[floor].push({ device, roomName: deviceRoomName, floor });
  });

  // Create print content
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const sortedFloors = Object.keys(devicesByFloor).map(Number).sort((a, b) => b - a);
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Unerreichbare Geräte - Todo Liste</title>
      <style>
        @media print {
          @page { margin: 1.5cm; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.3;
          color: #333;
          font-size: 10pt;
          margin: 0;
          padding: 0;
        }
        h1 {
          color: #dc2626;
          border-bottom: 2px solid #dc2626;
          padding-bottom: 5px;
          margin: 0 0 10px 0;
          font-size: 16pt;
        }
        .summary {
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 12px;
          display: flex;
          gap: 20px;
          font-size: 9pt;
        }
        h2 {
          color: #1f2937;
          margin: 15px 0 8px 0;
          font-size: 12pt;
          font-weight: 600;
        }
        .page-break {
          page-break-before: always;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 9pt;
        }
        th {
          background: #f3f4f6;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #d1d5db;
        }
        td {
          padding: 4px 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
          background: #f9fafb;
        }
        .checkbox-col {
          width: 30px;
          text-align: center;
        }
        .room-col {
          width: 25%;
        }
        .device-col {
          width: auto;
        }
        .checkbox {
          width: 12px;
          height: 12px;
          border: 1.5px solid #9ca3af;
          border-radius: 2px;
          display: inline-block;
        }
        .device-icon {
          margin-right: 4px;
        }
        .print-date {
          color: #6b7280;
          font-size: 8pt;
          margin-top: 15px;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <h1>🔴 Unerreichbare Geräte</h1>
      <div class="summary">
        <span><strong>Geräte:</strong> ${devices.length}</span>
        <span><strong>Etagen:</strong> ${sortedFloors.length}</span>
        <span><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</span>
      </div>
  `;

  sortedFloors.forEach((floor, index) => {
    const floorName = getFloorName(floor);
    const pageBreakClass = index > 0 ? ' class="page-break"' : '';
    html += `<h2${pageBreakClass}>📍 ${floorName}</h2>`;
    html += `
      <table>
        <thead>
          <tr>
            <th class="checkbox-col">✓</th>
            <th class="room-col">Raum</th>
            <th class="device-col">Gerät</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Sort by room name
    const sortedDevices = devicesByFloor[floor].sort((a, b) => a.roomName.localeCompare(b.roomName));
    
    sortedDevices.forEach(({ device, roomName }) => {
      const deviceName = getDeviceName(device);
      const icon = getDeviceEmoji(device);
      
      html += `
        <tr>
          <td class="checkbox-col"><span class="checkbox"></span></td>
          <td class="room-col">${roomName}</td>
          <td class="device-col"><span class="device-icon">${icon}</span>${deviceName}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
  });

  html += `
      <div class="print-date">
        Erstellt am ${new Date().toLocaleString('de-DE')}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
