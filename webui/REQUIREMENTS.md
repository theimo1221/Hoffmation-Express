# Hoffmation Web-UI – Requirements & Project Structure

## Goal

An interactive map view for the smart home, inspired by robot vacuum apps:
1. **Select floor** – House cross-section view
2. **Select room** – Floor plan of the level
3. **Select device** – 2D view of the room with devices

### Child-Friendly Mode (4+ years)

The floor plan route should be designed so that a 4-year-old child without reading skills can control lights and shutters:

- **Large, clear icons** - Lamp = light, window with stripes = shutter
- **Color coding** - Yellow/bright = on, gray/dark = off
- **Simple gestures** - Tap to toggle, no long press required
- **Visual feedback** - Animation when switching (e.g., lamp lights up)
- **No text dependency** - All actions recognizable by icons only
- **Large touch targets** - Minimum 60x60px for children's fingers
- **Direct control** - No detours through menus or dialogs

---

## Design Language

**Modern, rounded, minimalist (Apple-inspired):**
- Large border-radius (16-24px for cards, 12px for buttons)
- Soft shadows with blur (no hard edges)
- Generous whitespace and padding
- SF Pro-like typography (Inter or system fonts)
- Subtle animations and transitions (ease-out, 200-300ms)
- Glassmorphism effects where appropriate (backdrop-blur)
- Muted color palette with vibrant accents for active states
- Large touch targets (min 44x44px)
- Rounded icons (Lucide with rounded stroke)

---

## Tech Stack

| Category | Technology | Reasoning |
|----------|------------|-----------|
| Framework | React 18 | Large ecosystem, good Canvas/SVG libraries |
| Language | TypeScript | Consistent with backend, type-safety |
| Build Tool | Vite | Faster than CRA, good HMR |
| Styling | TailwindCSS | Utility-first, rapid development |
| UI Components | shadcn/ui | Modern, accessible, customizable |
| Icons | Lucide React | Consistent, lightweight |
| Canvas/Floor Plans | react-konva | Interactive 2D shapes for rooms |
| State Management | Zustand | Lightweight, TypeScript-friendly |
| Routing | React Router v6 | Standard for SPA navigation |
| HTTP Client | fetch / SWR | API calls to Express backend |

---

## TypeScript Configuration

Based on backend `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

---

## Project Structure

```
webui/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── floorplans/           # SVG floor plans per level
│       ├── floor-0.svg
│       ├── floor-1.svg
│       └── ...
├── src/
│   ├── main.tsx              # Entry Point
│   ├── App.tsx               # Root Component + Router
│   ├── index.css             # Tailwind imports
│   │
│   ├── api/                  # API client for Express backend
│   │   ├── client.ts         # Fetch wrapper, base URL
│   │   ├── devices.ts        # GET /devices, /devices/:id
│   │   ├── rooms.ts          # GET /rooms, /rooms/:id
│   │   └── types.ts          # API response types
│   │
│   ├── stores/               # Zustand stores
│   │   ├── deviceStore.ts    # Device states
│   │   ├── roomStore.ts      # Room data
│   │   └── uiStore.ts        # UI state (selected floor, room, etc.)
│   │
│   ├── components/           # Reusable components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── DeviceIcon.tsx    # Icon based on device type
│   │   ├── DeviceCard.tsx    # Device card with status
│   │   └── StatusBadge.tsx   # Online/Offline badge
│   │
│   ├── views/                # Main views (pages)
│   │   ├── HouseView.tsx     # Floor selection (house cross-section)
│   │   ├── FloorView.tsx     # Floor plan of a level
│   │   ├── RoomView.tsx      # 2D view of a room
│   │   └── DeviceView.tsx    # Detail view of a device
│   │
│   ├── canvas/               # Konva-specific components
│   │   ├── FloorPlanCanvas.tsx   # Interactive floor plan
│   │   ├── RoomShape.tsx         # Single room as shape
│   │   ├── RoomLayoutCanvas.tsx  # Device positions in room
│   │   └── DeviceMarker.tsx      # Device on canvas
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── useDevices.ts     # SWR/Fetch for devices
│   │   ├── useRooms.ts       # SWR/Fetch for rooms
│   │   └── useWebSocket.ts   # Optional: live updates
│   │
│   └── lib/                  # Utilities
│       ├── utils.ts          # Helper functions
│       └── cn.ts             # Tailwind class merge (shadcn)
```

---

## Data Model (based on hoffmation-base)

The frontend models should align with the existing backend structures. Reference files in `Hoffmation-Base/src/`:

### Core Interfaces
| Concept | Source File |
|---------|-------------|
| Room | `interfaces/iRoomBase.ts` |
| Device | `interfaces/baseDevices/iBaseDevice.ts` |
| DeviceInfo | `interfaces/iDeviceInfo.ts` |
| DeviceCluster | `interfaces/iDevicecluster.ts` |
| RoomInfo | `models/rooms/roomInfo.ts` |

### Enums
| Enum | Source File |
|------|-------------|
| DeviceCapability | `enums/DeviceCapability.ts` |
| DeviceType | `enums/deviceType.ts` |
| DeviceClusterType | `enums/device-cluster-type.ts` |

### Capability Interfaces
All in `interfaces/baseDevices/`:
- `iLamp.ts`, `iDimmableLamp.ts`, `iLedRgbCct.ts`
- `iShutter.ts`, `iActuator.ts`, `iHeater.ts`, `iAcDevice.ts`
- `iTemperatureSensor.ts`, `iHumiditySensor.ts`, `iMotionSensor.ts`
- `iHandle.ts`, `iCamera.ts`, `iSpeaker.ts`, `iScene.ts`
- ... (see `interfaces/baseDevices/index.ts` for full list)

### Room Coordinates (TrilaterationPoint)
Rooms already have 3D bounding boxes via `TrilaterationPoint` in `OwnRooms/`:
```typescript
// Example from 0_egbad.ts
public static startPoint: TrilaterationPoint = new TrilaterationPoint(0, 5.5, 0, 'EGBad');
public static endPoint: TrilaterationPoint = new TrilaterationPoint(2.5, 6, 2.5, 'EGBad');
```

**Coordinate system:**
- `x, y` = horizontal position (floor plan)
- `z` = height/floor level (0-2.5 = EG, 3-5.5 = 1.OG, 6-8.5 = 2.OG)

**For UI floor plan rendering:**
- Use `startPoint.x, startPoint.y` and `endPoint.x, endPoint.y` as room rectangle
- Derive floor from `z` coordinate (or use `etage` from RoomInfo)
- Some rooms have `undefined` trilateration (outdoor areas, etc.)

### UI-specific Extensions
```typescript
// Floor grouping - derived from rooms by z-coordinate or etage
interface Floor {
  level: number;           // Derived from z or etage
  name: string;            // Display name (configured)
  rooms: string[];         // Room IDs on this floor
}

// Device position data for room layout rendering (not yet in backend)
interface DevicePosition {
  deviceId: string;
  position: { x: number; y: number };
}
```

**Note:** Room coordinates already exist via TrilaterationPoint. Device positions within rooms are not yet defined.

---

## API Endpoints (already available)

The Express backend already provides:

### General
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/isAlive` | GET | Health check |
| `/log` | GET | Server logs |

### Devices & Rooms
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/devices` | GET | All devices |
| `/devices/:deviceId` | GET | Single device |
| `/rooms` | GET | All rooms |
| `/rooms/:roomId` | GET | Single room |
| `/groups/:groupId` | GET | Single group |

### Lamps & Lighting
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/lamps/:deviceId/:state/:duration?` | GET | Toggle lamp (state: true/false) |
| `/dimmer/:deviceId/:state/:brightness?/:forceDuration?` | GET | Control dimmer |
| `/led/:deviceId/:state/:brightness/:color/:forceDuration?` | GET | Control LED (RGB) |

### Actuators & Shutters
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/actuator/:deviceId/:state/:duration?` | GET | Toggle actuator |
| `/actuator/:deviceId/restart` | GET/POST | Restart actuator (off → wait 5s → on) |
| `/shutter/:deviceId/:level` | GET | Set shutter level (0-100) |
| `/garageDoor/:deviceId/:state` | GET | Toggle garage door |

### Climate Control
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ac/power/:state` | GET | Toggle all ACs |
| `/ac/:acId/power/:state` | GET | Toggle single AC |
| `/ac/:acId/power/:mode/:temp` | GET | Set AC mode and temperature |
| `/temperature/:deviceId/history/:startDate?/:endDate?` | GET | Temperature history |

### Cameras
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/camera/:deviceId/image` | GET | Last camera image |
| `/camera/:cameraId/lastMotionImage` | GET | Last motion-triggered image |
| `/camera/:deviceId/personDetected` | GET | Inform person detected |

### Scenes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scene/:deviceId/start/:timeout` | GET | Start scene |
| `/scene/:deviceId/end` | GET | End scene |

### Speaker
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/speak/:deviceId` | POST | Speak message (body: {message, volume}) |

### Automation Control
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/device/:deviceId/blockAutomatic/:timeout` | GET | Block automatic for duration (ms) |
| `/device/:deviceId/liftAutomaticBlock` | GET | Lift automatic block |

### Settings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/deviceSettings/:deviceId` | POST | Update device settings |
| `/roomSettings/:roomName` | POST | Update room settings |
| `/groupSettings/:groupId` | POST | Update group settings |
| `/deviceSettings/persist` | GET | Persist all settings to DB |
| `/deviceSettings/restore` | GET | Restore settings from DB |

**Available after hoffmation-base patch:**
- ✅ Room coordinates → `startPoint`/`endPoint` now public in room JSON
- ✅ Device positions → Available in device settings

**Still needed:**
- Floor names mapping (etage → display name) – could be config or derived

---

## Navigation Structure

**3 Main Tabs (Bottom Navigation):**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Content Area]                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🏠 Floor Plan    │    🚪 Rooms    │    📱 Devices     │
└─────────────────────────────────────────────────────────┘
```

### Tab 1: Floor Plan (Grundriss) – 3-Level Drill-Down

**Level 1: House Cross-Section (Haus-Querschnitt)**
```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │           House Cross-Section (SVG/Canvas)      │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │  3. OG  [Dachboden]                     │ ←──┼── Tap
│  │  ├─────────────────────────────────────────┤    │   │
│  │  │  2. OG  [Schlafzimmer, Kinderzimmer]    │ ←──┼── Tap
│  │  ├─────────────────────────────────────────┤    │   │
│  │  │  1. OG  [Wohnzimmer, Küche, ...]        │ ←──┼── Tap
│  │  ├─────────────────────────────────────────┤    │   │
│  │  │  EG     [Büro, Bad, ...]                │ ←──┼── Tap
│  │  ├─────────────────────────────────────────┤    │   │
│  │  │  UG     [Keller, Bar, ...]              │ ←──┼── Tap
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Level 2: Floor Plan (Grundriss Etage)**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to House                           [1. OG]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Floor Plan (Canvas)                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │Wohnzimmer│  │  Küche   │  │   Flur   │      │   │
│  │  │  💡 22°  │  │  💡 🔌   │  │   💡     │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘      │   │
│  │                                                 │   │
│  │  Tap room → drill down to room view            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Level 3: Room View (Raum mit Geräten in 2D)**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Floor                      [Wohnzimmer]      │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Room Layout 2D (Canvas)               │   │
│  │                                                 │   │
│  │     💡 Deckenlampe        🌡️ Thermostat        │   │
│  │                                                 │   │
│  │  🪟 Rollo                 📺 TV-Steckdose      │   │
│  │                                                 │   │
│  │  Tap device → device detail/settings           │   │
│  │  Long-press device → radial quick actions      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Quick Actions: [Alles aus] [Szene: Abend]     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tab 2: Rooms (Räume)
```
┌─────────────────────────────────────────────────────────┐
│  Room List                              [Floor Filter]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🛋️ Living Room          22°C  💡3/5  🪟 Open   │   │
│  │ 🍳 Kitchen               21°C  💡1/2           │   │
│  │ 🛏️ Bedroom              20°C  💡0/2  🪟 Closed │   │
│  │ ...                                             │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼ Tap                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room Detail: Living Room                        │   │
│  │                                                 │   │
│  │ Groups:                                         │   │
│  │  [💡 Light Group] [🌡️ Heat Group] [🪟 Windows] │   │
│  │                                                 │   │
│  │ Devices:                                        │   │
│  │  💡 Ceiling Light    [On ] ████████░░ 80%      │   │
│  │  💡 Floor Lamp       [Off]                      │   │
│  │  🌡️ Thermostat       22°C → 21°C               │   │
│  │  🪟 Shutter          [Open] 100%                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tab 3: Devices (Geräte)
```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search devices...                                   │
│  [Filter: All ▼] [💡Lights] [🪟Shutters] [🌡️Climate]  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💡 Living Room - Ceiling Light     [On ] 80%   │   │
│  │ 💡 Living Room - Floor Lamp        [Off]       │   │
│  │ 💡 Kitchen - Main Light            [On ] 100%  │   │
│  │ 🪟 Bedroom - Shutter               [Open]      │   │
│  │ 🌡️ Bathroom - Thermostat           22°C       │   │
│  │ ...                                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Long-press device → radial quick actions              │
│  Tap device → device detail/settings                   │
└─────────────────────────────────────────────────────────┘
```

---

## Open Questions / Decisions

1. **Floor plan data:** ✅ Resolved
   - Room bounding boxes from `TrilaterationPoint` (startPoint/endPoint)
   - Available via `/rooms` API endpoint

2. **Device positions:** ✅ Resolved
   - Available in device settings
   - Can be set/updated via `/deviceSettings/:deviceId` POST
   - Position is within room in meters (x,y and z)
   - Position should be changed using drag&drop or numeric input

3. **Live updates:** ✅ Decided
   - [x] Polling (every X seconds) – simplest, works now
   - [ ] WebSocket – future enhancement if needed

4. **Target device:** ✅ Decided
   - [x] Tablet-first (touch-optimized, larger touch targets)
   - Responsive down to mobile, up to desktop

### Quick Actions UI Pattern
**Radial Menu (GTA-style Weapon Wheel)** for device quick actions:
- Long-press on device → radial menu appears
- Swipe/drag to select action → release to execute
- Actions based on device capabilities:
  - Lamp: On/Off, Brightness presets (25%, 50%, 75%, 100%)
  - Dimmer: On/Off, Brightness slider in center
  - Shutter: Open, Close, 50%, Stop
  - AC: On/Off, Mode (Cool/Heat/Auto), Temp +/-
  - Scene: Start/Stop
- Cancel by releasing in center or outside menu

5. **Polling interval:** ✅ Decided
   - [x] Configurable, default 30 seconds

6. **Authentication:** Later
   - [ ] Implement in future iteration

7. **Dark mode:** ✅ Decided
   - [x] System preference / toggle

8. **Language:** ✅ Decided
   - [x] i18n (German + English)

9. **House cross-section graphic:** ✅ Decided
   - [x] Auto-generated from floor/room data (z-coordinates)

10. **Settings storage:** ✅ Decided
    - [x] LocalStorage (polling interval, language, dark mode, API URL)
    - No dedicated settings page needed initially (can use simple toggles/menu)

11. **Offline handling:** ✅ Decided
    - [x] No offline support (requires network connection)

---

## Feature Parity with SwiftUI App

The WebUI should provide **full functional parity** with the existing SwiftUI iOS/macOS app.

### Navigation Structure (5 Tabs)

| Tab | SwiftUI View | WebUI View | Status |
|-----|--------------|------------|--------|
| Floor Plan | - | `FloorPlanView` | ✅ Done |
| Favorites | `HomeView` | `FavoritesView` | ✅ Done |
| Rooms | `RoomListView` → `RoomDetailView` | `RoomsView` | ✅ Done |
| Devices | `AllDevicesView` → `DeviceView` | `DevicesView` | ✅ Done |
| Settings | `SettingsView` | `SettingsView` | ✅ Done |

### Room Features

| Feature | SwiftUI | WebUI | Status |
|---------|---------|-------|--------|
| Room list with floor filter | ✅ | ✅ | Done |
| Room detail with groups | ✅ | ✅ | Done |
| Room detail with device list | ✅ | ✅ | Done |
| Room settings | ✅ `RoomSettingsView` | ⏳ | Pending |
| Group navigation | ✅ `GroupView` | ⏳ | Pending |
| Group settings | ✅ `GroupSettingsView` | ⏳ | Pending |
| Heat group settings | ✅ `HeatGroupSettingsView` | ⏳ | Pending |

### Device Features

| Feature | SwiftUI | WebUI | Status |
|---------|---------|-------|--------|
| Device list with search | ✅ | ✅ | Done |
| Device list with capability filter | ✅ | ✅ | Done |
| Device detail view | ✅ `DeviceView` | ✅ | Done |
| Favorite devices (localStorage) | ✅ | ✅ | Done |
| Device icons by capability/status | ✅ | ✅ | Done |
| Block automatic | ✅ `BlockAutomaticView` | ✅ | Done |

### Device Type Views

| Device Type | SwiftUI View | WebUI | Status |
|-------------|--------------|-------|--------|
| Light/Lamp | `LightDeviceView` | ✅ | Done (with Force Duration) |
| Dimmable Lamp | `DimmableDeviceView` | ✅ | Done (brightness slider) |
| LED RGB | `LedDeviceView` | ✅ | Done (color picker) |
| Shutter | `ShutterDeviceView` | ✅ | Done (slider + quick buttons) |
| Actuator | `ActuatorDeviceView` | ✅ | Done |
| AC | `AcDeviceView` | ✅ | Done (on/off, mode, temp display) |
| Heater | `HeaterDeviceView` | ✅ | Done (valve, temp display) |
| Temperature Sensor | `TemperatureSensorView` | ✅ | Done |
| Humidity Sensor | `HumiditySensorView` | ✅ | Done |
| Motion Sensor | `MotionSensorView` | ✅ | Done |
| Handle Sensor | `HandleSensorView` | ✅ | Done |
| Camera | `CameraDeviceView` | ✅ | Done (image display) |
| Speaker | `SpeakerDeviceView` | ✅ | Done (speak message) |
| Scene | `SceneDeviceView` | ✅ | Done (start/stop) |
| Energy Manager | `EnergyManagerDeviceView` | ✅ | Done |
| Battery | - | ✅ | Done |
| Block Automatic | `BlockAutomaticView` | ✅ | Done |

### Device Settings Views

| Settings Type | SwiftUI View | WebUI | Status |
|---------------|--------------|-------|--------|
| Actuator Settings | `ActuatorDeviceSettingsView` | ✅ | Done (basic) |
| Dimmable Settings | `DimmableDeviceSettingsView` | ⏳ | Pending (needs brightness sliders) |
| LED Settings | `LedDeviceSettingsView` | ⏳ | Pending (needs color pickers) |
| Shutter Settings | `ShutterSettingsView` | ✅ | Done (basic) |
| Heater Settings | `HeaterSettingsView` | ⏳ | Pending |
| AC Settings | `AcSettingsView` | ⏳ | Pending |
| Handle Settings | `HandleSettingsView` | ⏳ | Pending |
| Camera Settings | `CameraSettingsView` | ⏳ | Pending |
| Room Settings | `RoomSettingsView` | ⏳ | Pending |

#### SwiftUI Settings Views Details

**ActuatorDeviceSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings (calls `settings.applySettings(device)`)
- Toggle: dayOn, dawnOn, duskOn, nightOn
- Toggle: includeInAmbientLight

**DimmableDeviceSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- For each time period (day, dawn, dusk, night):
  - Toggle: on/off
  - Slider: brightness (0-100)

**LedDeviceSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Toggle: includeInAmbientLight
- For each time period (day, dawn, dusk, night):
  - Toggle: on/off
  - Slider: brightness (0-100)
  - ColorPicker: color

**ShutterSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Slider: direction (0-360°)
- Slider: heatReductionPosition (0-100%)
- Slider: heatReductionDirectionThreshold (20-35°C)
- Slider: heatReductionThreshold (20-35°C)

**HeaterSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Toggle: manualDisabled
- Slider: pidForcedMinimum (0-100%)
- Toggle: useOwnTemperatur
- Toggle: useOwnTemperatureForRoomTemperature
- Toggle: controlByPid

**AcSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Toggle: heatingAllowed
- Toggle: noCoolingOnMovement
- Toggle: useOwnTemperature
- Toggle: useAutomatic
- Toggle: manualDisabled
- TimeSelectorView: minimumTime (hours, minutes)
- TimeSelectorView: maximumTime (hours, minutes)
- Slider: minOutdoorTempForCooling (16-25°C)
- Slider: overrideCoolingTargetTemp (-1 to 22°C)

**HandleSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Toggle: informOnOpen
- Toggle: informNotHelping
- Toggle: informIsHelping

**CameraSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Toggle: alertPersonOnTelegram
- Toggle: movementDetectionOnPersonOnly
- Toggle: movementDetectionOnDogsToo

**RoomSettingsView** (SwiftUI):
- Toggle: Edit Settings mode
- Button: Apply Settings
- Slider: movementResetTimer (60-3600s)
- **Light Settings Section:**
  - Toggle: ambientLightAfterSunset
  - Toggle: lichtSonnenAufgangAus
  - Toggle: lightIfNoWindows
  - Toggle: lampenBeiBewegung
  - Toggle: roomIsAlwaysDark
  - Slider: sonnenAufgangLampenDelay (-120 to 120 min)
  - Slider: sonnenUntergangLampenDelay (-120 to 120 min)
- **Shutter Settings Section:**
  - Toggle: rolloHeatReduction
  - Toggle: sonnenAufgangRollos
  - Slider: sonnenAufgangRolloDelay (-120 to 120 min)
  - TimeSelectorView: shutterMinTime
  - Toggle: sonnenUntergangRollos
  - Slider: sonnenUntergangRolloDelay (-120 to 120 min)
  - TimeSelectorView: shutterMaxTime
  - Slider: cloudinessOffset (0-0.5 min/%)

#### API Endpoints for Settings

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/deviceSettings/:deviceId` | POST | `{ settings: {...} }` | Update device settings |
| `/roomSettings/:roomName` | POST | `{ settings: {...} }` | Update room settings |
| `/groupSettings/:groupId` | POST | `{ settings: {...} }` | Update group settings |

#### Detailed Device Settings (from hoffmation-base)

**Base DeviceSettings** (all devices):
- `trilaterationRoomPosition` - Position im Raum (x, y, z)
- `energySettings` - Energieverbraucher-Einstellungen
- `blockAutomaticSettings` - Block-Automatik-Einstellungen
- `skipInHomebridge` - In Homebridge überspringen

**ActuatorSettings** (Lampen, Aktoren):
- `dawnOn` - Bei Morgendämmerung einschalten
- `duskOn` - Bei Abenddämmerung einschalten
- `nightOn` - Nachts einschalten
- `dayOn` - Tagsüber einschalten
- `isStromStoss` - Ist Stromstoß-Relais
- `resetToAutomaticOnForceOffAfterForceOn` - Nach Force-Off zurück zu Automatik
- `stromStossResendTime` - Stromstoß-Wiederholungszeit
- `includeInAmbientLight` - In Ambientelicht einbeziehen

**DimmerSettings** (extends ActuatorSettings):
- `nightBrightness` - Helligkeit nachts (default: 50)
- `dawnBrightness` - Helligkeit morgens (default: 75)
- `duskBrightness` - Helligkeit abends (default: 75)
- `dayBrightness` - Helligkeit tagsüber (default: 100)
- `turnOnThreshhold` - Einschalt-Schwellwert

**LedSettings** (extends DimmerSettings):
- `defaultColor` - Standardfarbe
- `dayColor`, `dawnColor`, `duskColor`, `nightColor` - Farben pro Tageszeit
- `dayColorTemp`, `dawnColorTemp`, `duskColorTemp`, `nightColorTemp` - Farbtemperaturen

**ShutterSettings**:
- `msTilTop` - Zeit bis oben (ms)
- `msTilBot` - Zeit bis unten (ms)
- `direction` - Himmelsrichtung (0=Nord, 180=Süd)
- `heatReductionPosition` - Hitzeschutz-Position (default: 40)
- `heatReductionThreshold` - Hitzeschutz-Schwelle global
- `heatReductionDirectionThreshold` - Hitzeschutz-Schwelle richtungsabhängig
- `triggerPositionUpdateByTime` - Position per Zeit berechnen

**HeaterSettings**:
- `automaticMode` - Automatik-Modus
- `useOwnTemperatur` - Eigene Temperatur verwenden
- `useOwnTemperatureForRoomTemperature` - Eigene Temp für Raumtemperatur
- `controlByPid` - PID-Steuerung
- `controlByTempDiff` - Steuerung per Temperaturdifferenz
- `seasonalTurnOffActive` - Saisonale Abschaltung aktiv
- `seasonTurnOffDay` - Tag der Abschaltung (default: 99)
- `seasonTurnOnDay` - Tag der Einschaltung (default: 267)
- `pidForcedMinimum` - PID-Mindestventilstellung
- `manualDisabled` - Manuell deaktiviert

**AcSettings**:
- `minimumHours`, `minimumMinutes` - Früheste Einschaltzeit
- `maximumHours`, `maximumMinutes` - Späteste Einschaltzeit
- `heatingAllowed` - Heizen erlaubt
- `useOwnTemperature` - Eigene Temperatur verwenden
- `useAutomatic` - Automatik-Modus
- `noCoolingOnMovement` - Kein Kühlen bei Bewegung
- `manualDisabled` - Manuell deaktiviert
- `minOutdoorTempForCooling` - Min. Außentemperatur für Kühlung
- `overrideCoolingTargetTemp` - Kühlziel überschreiben

**HandleSettings**:
- `informOnOpen` - Bei Öffnung informieren
- `informNotHelping` - Informieren wenn nicht hilfreich
- `informIsHelping` - Informieren wenn hilfreich

**CameraSettings** (extends MotionSensorSettings):
- `alertPersonOnTelegram` - Person per Telegram melden
- `movementDetectionOnPersonOnly` - Nur Personen erkennen
- `movementDetectionOnDogsToo` - Auch Hunde erkennen
- `hasAudio` - Hat Audio
- `hasSpeaker` - Hat Lautsprecher

**MotionSensorSettings**:
- `seesWindow` - Sieht Fenster
- `excludeFromNightAlarm` - Von Nachtalarm ausschließen

**SceneSettings**:
- `defaultTurnOffTimeout` - Standard-Ausschalt-Timeout

**SonosDeviceSettings** (Speaker):
- `maxPlayOnAllVolume` - Max. Lautstärke bei "Alle abspielen"
- `defaultDayAnounceVolume` - Standard-Lautstärke tagsüber
- `defaultNightAnounceVolume` - Standard-Lautstärke nachts

#### Room Settings (iRoomSettings)

API Endpoint: `POST /roomSettings/:roomName`

| Setting | Type | Description |
|---------|------|-------------|
| `ambientLightAfterSunset` | boolean | Ambientelicht nach Sonnenuntergang |
| `lichtSonnenAufgangAus` | boolean | Licht bei Sonnenaufgang ausschalten |
| `rolloHeatReduction` | boolean | Rollo-Hitzeschutz aktivieren |
| `lampenBeiBewegung` | boolean | Lampen bei Bewegung einschalten |
| `lightIfNoWindows` | boolean | Licht wenn keine Fenster vorhanden |
| `movementResetTimer` | number | Bewegungs-Reset-Timer (Sekunden) |
| `roomIsAlwaysDark` | boolean | Raum ist immer dunkel |
| `sonnenAufgangRollos` | boolean | Rollos bei Sonnenaufgang öffnen |
| `sonnenAufgangRolloDelay` | number | Verzögerung Sonnenaufgang (Minuten) |
| `sonnenAufgangRolloMinTime` | TimePair | Früheste Zeit für Rollos |
| `sonnenAufgangLampenDelay` | number | Verzögerung Lampen bei Sonnenaufgang |
| `sonnenUntergangRollos` | boolean | Rollos bei Sonnenuntergang schließen |
| `sonnenUntergangRolloDelay` | number | Verzögerung Sonnenuntergang (Minuten) |
| `sonnenUntergangRolloMaxTime` | TimePair | Späteste Zeit für Rollos |
| `sonnenUntergangLampenDelay` | number | Verzögerung Lampen bei Sonnenuntergang |
| `sonnenUntergangRolloAdditionalOffsetPerCloudiness` | number | Zusätzliche Verzögerung pro Bewölkungsgrad |
| `includeLampsInNormalMovementLightning` | boolean | Lampen bei normaler Bewegungsbeleuchtung |
| `radioUrl` | string | Radio-URL für Lautsprecher |

#### Group Settings

API Endpoint: `POST /groupSettings/:groupId`

Groups inherit settings from their devices but can have group-wide controls.

### Device Control Actions

| Action | API Endpoint | WebUI | Status |
|--------|--------------|-------|--------|
| Toggle lamp | `GET /lamps/:id/:state/:duration?` | ✅ | Done |
| Set dimmer | `GET /dimmer/:id/:state/:brightness?/:duration?` | ✅ | Done |
| Set LED color | `GET /led/:id/:state/:brightness/:color/:duration?` | ✅ | Done |
| Set shutter position | `GET /shutter/:id/:level` | ✅ | Done |
| Toggle actuator | `GET /actuator/:id/:state/:duration?` | ✅ | Done |
| Control AC | `GET /ac/:id/power/:mode/:temp` | ✅ | Done |
| Start/End scene | `GET /scene/:id/start/:timeout` | ✅ | Done |
| Speak on device | `POST /speak/:id` | ✅ | Done |
| Block automatic | `GET /device/:id/blockAutomatic/:timeout` | ✅ | Done |
| Lift automatic block | `GET /device/:id/liftAutomaticBlock` | ✅ | Done |

### Settings Features

| Feature | SwiftUI | WebUI | Status |
|---------|---------|-------|--------|
| Server URL | ✅ | ✅ | Done |
| Refresh interval | ✅ | ✅ | Done |
| Expert mode | ✅ | ✅ | Done |
| Exclude levels | ✅ | ✅ | Done |
| Dark mode toggle | - | ✅ | Done |
| Language selection | - | ✅ | Done |

### Home View (Favorites)

| Feature | SwiftUI | WebUI | Status |
|---------|---------|-------|--------|
| Favorite devices list | ✅ | ✅ | Done (from localStorage) |
| Quick device controls | ✅ | ✅ | Done (lamp, shutter, actuator toggle) |

### Additional Features

| Feature | SwiftUI | WebUI | Status |
|---------|---------|-------|--------|
| Temperature history chart | ✅ `TemperatureHistoryView` | ✅ | Done (24h SVG chart) |
| Camera live view | ✅ `LiveView` | ✅ | Done (stream links) |
| Pull-to-refresh | ✅ | ✅ | Done (refresh button in header) |
| Time selector | ✅ `TimeSelectorView` | ⏳ | Pending |

---

## Implementation Progress

### Completed ✅
- [x] Project setup (Vite, React, TypeScript, TailwindCSS)
- [x] 5-tab navigation (Floor Plan, Favorites, Rooms, Devices, Settings)
- [x] Room list with floor filter (respects excluded levels)
- [x] Room detail with groups and device list
- [x] Device list with search and capability filter
- [x] Device detail view with full controls for all device types
- [x] Device icons based on capability and status (like SwiftUI DeviceShortInfoView)
- [x] Favorite devices (localStorage based)
- [x] API client for rooms, devices, and all control endpoints
- [x] Single-device refresh after control actions (like Swift fetchUpdate)
- [x] Polling for live updates (configurable interval)
- [x] Dark mode (light/dark/system)
- [x] i18n setup (German + English)
- [x] Settings view (Server URL, polling interval, dark mode, language, expert mode, exclude levels)
- [x] Dimmable lamp controls (brightness slider, force duration)
- [x] LED RGB controls (color picker, brightness slider)
- [x] AC controls (on/off, mode display, temperature display)
- [x] Heater controls (valve level, room temp, desired temp display)
- [x] Actuator controls (on/off with force duration)
- [x] Scene controls (start/stop with timeout)
- [x] Speaker controls (speak message)
- [x] Block automatic controls (block/lift block)
- [x] Camera view (current image display)
- [x] Motion sensor view (detections today, time since last motion)
- [x] Handle sensor view (open/closed/tilted)
- [x] Humidity sensor view
- [x] Battery level display
- [x] Energy Manager view (battery, excess energy, self-consuming wattage)
- [x] Expert mode setting
- [x] Exclude levels setting (filters rooms by floor)
- [x] Quick device controls in favorites (lamp, shutter, actuator toggle)
- [x] Refresh button in all views
- [x] Temperature history chart (24h SVG chart)
- [x] Camera live stream links (h264/mpeg stream links)
- [x] Device settings views (Actuator, Dimmer, LED, Shutter settings)
- [x] Group detail view with filtered devices
- [x] Clickable groups in room detail
- [x] Favorites click opens device detail view
- [x] Fixed: Capability constants to match hoffmation-base enum
- [x] Fixed: Polling interval seconds/milliseconds consistency
- [x] Fixed: LED Force An/Aus uses setLed instead of setLamp
- [x] Fixed: API client uses dynamic base URL
- [x] Fixed: automaticBlockedUntil parsing (Date/string/number formats)

### Recently Completed ✅ (2025-12-28)
- [x] **All Device Settings views** - Complete implementation
  - [x] DimmerSettings: Brightness sliders per time period (day, dawn, dusk, night)
  - [x] LedSettings: Color pickers per time period
  - [x] HeaterSettings: manualDisabled, automaticMode, useOwnTemperatur, controlByPid, pidForcedMinimum, seasonalTurnOff
  - [x] AcSettings: heatingAllowed, time pickers, temp sliders, noCoolingOnMovement, useAutomatic
  - [x] HandleSettings: informOnOpen, informNotHelping, informIsHelping
  - [x] CameraSettings: alertPersonOnTelegram, movementDetectionOnPersonOnly, movementDetectionOnDogsToo
  - [x] MotionSensorSettings: seesWindow, excludeFromNightAlarm
  - [x] SceneSettings: defaultTurnOffTimeout
  - [x] SpeakerSettings: maxPlayOnAllVolume, defaultDayAnounceVolume, defaultNightAnounceVolume
- [x] **Room Settings view** (in RoomDetail)
  - [x] Light settings: ambientLightAfterSunset, lichtSonnenAufgangAus, lampenBeiBewegung, etc.
  - [x] Shutter settings: rolloHeatReduction, sonnenAufgangRollos, sonnenUntergangRollos, time pickers
  - [x] Other: movementResetTimer
- [x] **DeviceCapability Enum korrigiert** - Mapping stimmt jetzt mit hoffmation-base überein
  - Vorher: Falsche Zuordnungen (z.B. 4=Garagentor statt excessEnergyConsumer)
  - Jetzt: Alle 22+ Capabilities korrekt gemappt
- [x] **Letztes Signal/Update Anzeige** - In Device-Info Sektion
  - Relative Zeitanzeige (z.B. "vor 5 Min.", "vor 2 Std.")
  - Capability-basierte Warnschwellen:
    - Zigbee ohne Batterie: 10 Minuten
    - Temperatursensor/Feuchtigkeitssensor: 15 Minuten
    - Heizung: 30 Minuten
    - Bewegungsmelder/Griffsensor: 24 Stunden
    - Lampen/Aktoren/Rollläden: 1 Stunde
  - Orange Warnung wenn Schwelle überschritten
- [x] **Link Quality Anzeige** - Für Zigbee-Geräte
  - Zeigt Link-Qualität Wert an
  - Farbcodierung: Rot bei ≤5 (kritisch), Orange bei ≤20 (schwach)
- [x] **Grundriss Editiermodus** - Raum-Koordinaten bearbeiten
  - Editiermodus-Button im Expert-Modus
  - Ziehbare Ecken (startPoint/endPoint) für jeden Raum
  - Echtzeit-Vorschau der Änderungen
  - Speichern über `POST /roomSettings/:roomName` mit `trilaterationStartPoint`/`trilaterationEndPoint`
  - Koordinaten-Anzeige (Ruler) im Editiermodus
- [x] **Group Settings** - Heizgruppen-Einstellungen
  - Automatik-Modus Toggle
  - Fallback-Temperatur Slider (15-25°C)
  - Manuelle Temperatur Slider (15-25°C)
  - Speichern über `POST /groupSettings/:groupId`
- [x] **Komfort-Favoriten** - Automatische Geräte-Listen
  - Unerreichbare Geräte (available=false oder lastUpdate > 1h)
  - Geräte mit schwacher Batterie (<20%)
  - Einklappbare Sektionen mit Geräte-Anzahl
  - Klick öffnet Geräte-Detail

- [x] **Device Position Editing** - Geräte im Raum platzieren
  - Klick auf Raum im Grundriss öffnet Raum-Detailansicht
  - Zeigt platzierte Geräte an ihren Positionen (trilaterationRoomPosition)
  - Editiermodus (Expert Mode): Geräte per Drag&Drop verschieben
  - Plus-Button öffnet Popup mit unplatzierten Geräten
  - Klick auf Gerät im Popup platziert es mittig im Raum
  - Koordinaten-Anzeige beim Ziehen
  - Speichern über `POST /deviceSettings/:deviceId` mit `trilaterationRoomPosition`
  - Default-Position {0,0,0} wird als "nicht platziert" behandelt

### Pending ⏳
- [ ] Radial quick action menu (long-press - nice-to-have)
- [ ] Child-Friendly Mode for floor plan (lights & shutters control for 4+ year olds)
- [ ] DeviceDetailView.tsx refactoring (1387 lines → split into components)
- [ ] RoomsView.tsx refactoring (546 lines → split into components)

### Implementation Notes 📝

1. **Settings are partial:** API accepts partial settings objects - only send changed fields
2. **Settings in response:** Device/Room settings are included in GET responses (no separate fetch needed)
3. **Use Pickers:** Prefer picker/dropdown components for time selection (hours/minutes)
4. **Capability check:** Always verify device capabilities before showing settings section
5. **SwiftUI reference:** See `/Users/thiemo/0_dev/Github/Hoffmation/Shared/Views/Devices/Settings/`
6. **Context file:** See `CONTEXT.md` for detailed implementation notes and session continuity
