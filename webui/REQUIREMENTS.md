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
- **Simple gestures** - Tap to toggle, long press for advanced menu
- **Visual feedback** - Animation when switching (e.g., lamp lights up)
- **No text dependency** - All actions recognizable by icons only
- **Large touch targets** - Minimum 60x60px for children's fingers
- **Direct control** - Tap toggles immediately, hold opens radial menu
- **Room & Floor Icons/Colors** - "Dein Raum ist der gelbe mit dem Baby-Icon"

**Implemented:**
- ✅ Tap-to-Toggle for Lamps, Actuators, Shutters, AC, LEDs
- ✅ Hold-for-Menu (GTA-style Radial Menu with icons)
- ✅ Color-coded icons (green=on/secure, gray=off/insecure, orange=partial)
- ✅ Touch support for iOS devices
- ✅ LED brightness visualization with 8 rays (12.5% per ray)
- ✅ Adjacent room navigation with automatic detection
- ✅ Room coordinate editing in settings
- ✅ Device logs display in expert mode (Dec 30, 2024)
- ✅ Multi-floor room support with customizable icons & colors (Dec 31, 2024)
- ✅ IconPicker & ColorPicker components for visual room identification
- ✅ Modular store architecture with clear separation of concerns (Jan 1, 2026)
- ✅ Battery status display in radial menu (Jan 1, 2026)
- ✅ Responsive filter menu for mobile devices (Jan 2, 2026)
- ✅ iOS PWA fixes: Dialog portal rendering, z-index hierarchy (Jan 2, 2026)

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

## Floor Plan - Multi-Level Support (Dec 31, 2024)

### Architecture

**Global Floor Definitions** (`webui-settings.json`):
```typescript
interface FloorDefinition {
  id: string;          // Unique ID (e.g., "eg", "og1")
  name: string;        // Display name (e.g., "EG", "1. OG")
  level: number;       // Numeric level (-1, 0, 1, 2, ...)
  sortOrder: number;   // Display order in UI
  icon?: string;       // Lucide Icon name (e.g., "Home", "Bed")
  color?: string;      // Hex color (e.g., "#3B82F6")
}
```

**Per-Room Settings** (`room.settings.customSettingsJson`):
```typescript
interface RoomWebUISettings {
  crossSectionFloors?: string[];  // Floor IDs (e.g., ["keller", "eg", "og1"])
  icon?: string;                  // Room icon (e.g., "Baby")
  color?: string;                 // Room color (e.g., "#FBBF24")
}
```

### Features

1. **Multi-Floor Rooms**: Rooms spanning multiple floors (e.g., stairwells) can be assigned to multiple floors via `crossSectionFloors`
2. **Outdoor/Indoor Separation**: "Draußen" (level 99) separates garden from basement
3. **Graceful Degradation**: Rooms without `crossSectionFloors` fall back to `etage` → `level` mapping
4. **Child-Friendly**: Icons & colors for visual room identification ("Dein Raum ist der gelbe")
5. **Backend-Persisted**: Settings stored in `webui-settings.json` and per-room `customSettingsJson`

### Components

- **IconPicker**: Searchable Lucide icon picker with popular icons and categories
- **ColorPicker**: Interactive color picker with preset palette and custom hex input
- **Floor Editor**: (Planned) Settings UI for managing floor definitions

### API

- `GET /api/webui/settings` - Fetch global WebUI settings from `config/private/webui-settings.json`
  - Returns JSON from file if exists
  - Returns `{ "version": "0.0" }` if file doesn't exist
  - Error handling with 500 status on read failure
- `POST /api/roomSettings/:roomName` - Update room's `customSettingsJson` (existing endpoint)
  - Used to set `customSettingsJson.webui.crossSectionFloors`, `icon`, `color`

**Note:** `webui-settings.json` is stored in `config/private/` to exclude it from git
**Note:** Floor definitions are readonly - edit `config/private/webui-settings.json` manually

### Helper Functions

- `getFloorsForRoom(room, floors)` - Get all floors a room belongs to
- `getRoomWebUISettings(room)` - Parse `customSettingsJson.webui`
- `isMultiFloorRoom(room)` - Check if room spans multiple floors

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

## Architecture Principles

### Separation of Concerns - Business Logic

**Wichtig:** Geschäftslogik hat nichts in Views verloren und sollte in wiederverwendbaren Objekten/Services/Stores sein, damit mehrere Views diese nutzen können.

**Prinzipien:**
- ✅ **Views sind "dumm"** - Nur Präsentation und User Interaction
- ✅ **Business Logic in Services** - Wiederverwendbar über mehrere Views
- ✅ **State Management in Stores** - Zustand zentral verwalten (Zustand)
- ✅ **API Calls in API Layer** - `/api/` Ordner für alle Backend-Kommunikation
- ✅ **Utilities in `/lib/`** - Helper-Funktionen und gemeinsame Logik
- ✅ **Tell, Don't Ask** - Komponenten bekommen Objekte, nicht extrahierte Werte
- ✅ **Self-Contained Components** - Komponenten verwalten ihren eigenen State
- ✅ **Single Responsibility** - Jede Komponente/Service macht eine Sache
- ✅ **DRY-Prinzip** - Keine Duplikation von Business Logic (Wrapper verwenden)
- ✅ **Service Layer** - Komplexe Business Logic in `/lib/deviceActions.ts`

**Beispiel - Refactoring von DeviceDetailView (Dez 2024):**
- **Vorher:** 12 Handler-Funktionen in View, 16 State-Variablen, 400+ Zeilen
- **Nachher:** Alle Handler in Control-Komponenten, nur `device` prop, ~250 Zeilen
- **Ergebnis:** 18 self-contained Control-Komponenten, 70% weniger Props, wiederverwendbar

**Refactoring Session 31.12.2024:**
- **deviceActions.ts Deduplikation:** Alle 18 Controls verwendeten identisches Boilerplate (234 Zeilen dupliziert)
  - **Lösung:** `executeDeviceAction` Wrapper - generischer Action Handler mit Delay & Refresh
  - **Ergebnis:** -400 Zeilen Boilerplate, konsistentes Error-Handling überall
- **RadialDeviceMenu Wrapper:** Self-contained Komponente statt 13 Props
  - **Vorher:** 13 Handler-Callbacks als Props (onLampOn, onLampOff, etc.)
  - **Nachher:** Nur 6 Props (device, onClose, onDetails, position, deviceName, isOpen)
  - **Ergebnis:** -70 Zeilen in RoomFloorPlanDetail, wiederverwendbare Komponente
- **toggleDevice Service:** Business Logic aus View in Service verschoben
  - **Vorher:** 5 spezifische Toggle-Handler in View (60 Zeilen)
  - **Nachher:** 1 generische `toggleDevice()` Funktion in deviceActions.ts
  - **Ergebnis:** Architektur-Prinzip "Keine Business Logic in Views" eingehalten

**Anti-Pattern vermeiden:**
```typescript
// ❌ Schlecht: Business Logic in View
function DeviceView({ deviceId }) {
  const [brightness, setBrightness] = useState(0);
  const handleDimmer = async (value) => {
    await fetch(`/api/dimmer/${deviceId}`, { ... });
    setBrightness(value);
  };
  return <Slider onChange={handleDimmer} />;
}

// ✅ Gut: Business Logic in Service/Component (mit executeDeviceAction Wrapper)
function DimmerControls({ device, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [brightness, setBrightness] = useState(getDeviceBrightness(device));
  
  const handleDimmer = async (value) => {
    await executeDeviceAction(
      device,
      (id) => setDimmer(id, value),
      onUpdate,
      setIsLoading
    );
  };
  
  return <Slider value={brightness} onChange={handleDimmer} disabled={isLoading} />;
}

// ✅ Noch besser: Business Logic in Service Layer
// View ruft nur Service auf:
if (isToggleableDevice(device)) {
  toggleDevice(device, onUpdate, setIsLoading);
}
```

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

### Quick Actions UI Pattern ✅ IMPLEMENTED
**Radial Menu** for device quick actions in Floor Plan view:
- **Tap** on device → Quick toggle (Lamp on/off, Shutter open/close, AC on/off)
- **Hold** (≥400ms) on device → Radial menu appears with:
  - Info button (always) → Opens device detail view
  - Device-specific quick actions (consistent positions)

**Child-Friendly Icons** (same icon, different fill/color):
- Lamp: Lightbulb - yellow filled (on), gray outline (off)
- Shutter: Blinds - green (closed < 10%), orange (10-90%), gray (open)
- AC: Wind/Snowflake - gray (off), blue (cooling), red (heating), green (auto)
- Handle: Lock - green (closed), orange (tilted), red (open)

**iOS Mobile Support** ✅ IMPLEMENTED (Dec 30, 2024):
- Touch events for device drag&drop (`onTouchStart`, `touchmove`, `touchend`)
- Radial menu screen-edge clamping (stays within viewport)
- Auto-scaling without scrollbars (`maxWidth/maxHeight: 100%`)
- Larger device icons in room view (`lg` size)
- Device icon sizing responsive to room pixel dimensions (xs/sm/md/lg)
- Device border visibility with 5px clamping (prevents overlap with canvas border)

**Floor Plan Device Display** ✅ IMPLEMENTED (Dec 30, 2024):
- Device icons shown at actual positions within room boxes
- Responsive icon size based on room pixel dimensions
- Room name positioned at bottom to avoid icon overlap
- Adjacent room navigation with automatic detection (TOLERANCE 1.0m)
- Navigation arrows positioned at canvas border with absolute pixel coordinates
- Dynamic margins: only reserve space where adjacent rooms exist (80px left/right, 40px top/bottom)
- Wrapper architecture: fixed dimensions = canvas + arrow space, canvas absolutely positioned
- **Z-Coordinate Editing:** Floor height (Z↓) and ceiling height (Z↑) editable in room edit mode
- **Settings Delta Updates:** Room settings only send changed fields, device settings removed fallback defaults
- **Battery Level Display (Dec 31, 2024):** Battery percentage shown in device status badges with color coding (red <20%, orange <50%, green ≥50%)
- **Unreachable Device Indicators (Dec 31, 2024):** Bright red background (bg-red-500) and "OFFLINE" badge for devices with available=false or lastUpdate >1 hour
- **iOS Room Display Fix (Dec 31, 2024):** Changed overflow-visible to overflow-hidden, added maxWidth/maxHeight constraints to prevent scrolling/clipping
- **Scene Toggle (Dec 31, 2024):** Scenes can be started/stopped via tap in floor plan view, matching Swift app behavior (timeout=0 for no auto-end)

**Center displays:**
- Device icon
- Device name
- Status badges (battery, link quality, temperature, brightness, level)

**Implementation:** `src/components/RadialMenu.tsx`, integrated in `RoomFloorPlanDetail.tsx`

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
| Room settings | ✅ `RoomSettingsSection` | ✅ | Done |
| Group navigation | ✅ `GroupView` | ✅ | Done |
| Group settings | ✅ `GroupSettingsView` | ✅ | Done |
| Heat group settings | ✅ `HeatGroupSettingsView` | ✅ | Done |

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
| Actuator Settings | `ActuatorDeviceSettingsView` | ✅ | Done |
| Dimmable Settings | `DimmableDeviceSettingsView` | ✅ | Done |
| LED Settings | `LedDeviceSettingsView` | ✅ | Done |
| Shutter Settings | `ShutterSettingsView` | ✅ | Done |
| Heater Settings | `HeaterSettingsView` | ✅ | Done |
| AC Settings | `AcSettingsView` | ✅ | Done |
| Handle Settings | `HandleSettingsView` | ✅ | Done |
| Camera Settings | `CameraSettingsView` | ✅ | Done |
| Room Settings | `RoomSettingsSection` | ✅ | Done |

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
| Time selector | ✅ `TimeSelectorView` | ⏳ | Pending (automation rules) |

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
- [x] **DeviceCapability Enum corrected** - Mapping now matches hoffmation-base
  - Before: Wrong mappings (e.g., 4=garageDoor instead of excessEnergyConsumer)
  - Now: All 22+ capabilities correctly mapped
- [x] **Last Signal/Update Display** - In Device Info section
  - Relative time display (e.g., "5 min ago", "2 hrs ago")
  - Capability-based warning thresholds:
    - Zigbee without battery: 10 minutes
    - Temperature/humidity sensor: 15 minutes
    - Heater: 30 minutes
    - Motion sensor/handle sensor: 24 hours
    - Lamps/actuators/shutters: 1 hour
  - Orange warning when threshold exceeded
- [x] **Link Quality Display** - For Zigbee devices
  - Shows link quality value
  - Color coding: Red at ≤5 (critical), Orange at ≤20 (weak)
- [x] **Floor Plan Edit Mode** - Edit room coordinates
  - Edit mode button in Expert Mode
  - Draggable corners (startPoint/endPoint) for each room
  - Real-time preview of changes
  - Save via `POST /roomSettings/:roomName` with `trilaterationStartPoint`/`trilaterationEndPoint`
  - Coordinate display (ruler) in edit mode
- [x] **Group Settings** - Heat group settings
  - Automatic mode toggle
  - Fallback temperature slider (15-25°C)
  - Manual temperature slider (15-25°C)
  - Save via `POST /groupSettings/:groupId`
- [x] **Comfort Favorites** - Automatic device lists
  - Unreachable devices (available=false or lastUpdate > 1h)
  - Low battery devices (<20%)
  - Collapsible sections with device count
  - Click opens device detail

- [x] **Device Position Editing** - Place devices in rooms
  - Click on room in floor plan opens room detail view
  - Shows placed devices at their positions (trilaterationRoomPosition)
  - Edit mode (Expert Mode): Move devices via drag&drop
  - Plus button opens popup with unplaced devices
  - Click on device in popup places it in room center
  - Coordinate display while dragging
  - Save via `POST /deviceSettings/:deviceId` with `trilaterationRoomPosition`
  - Default position {0,0,0} treated as "not placed"

### Recently Completed ✅ (2025-12-29)
- [x] **DeviceStatusBadges Component** - Detailed device status in lists
  - Motion sensor: Count today + active motion ("Motion!" green)
  - Heater: Current/target temperature + valve level
  - Dimmer/LED: Brightness % + color (LED)
  - Shutter: Position % (normalized to 0-100)
  - Window handle: Status with color coding (open=red, tilted=orange, closed=green)
  - Lamp: On/Off status
- [x] **DeviceIcon Extensions**
  - Speaker icon
  - CO2 Sensor icon (CloudFog)
  - Motion sensor green when movement actively detected
- [x] **LED/Dimmer Status Fix**
  - `lightOn ?? _lightOn ?? on ?? _on` fallback chain (like DeviceIcon)
  - Brightness alone doesn't mean "on" (stored value for next turn-on)
- [x] **Layout Improvements**
  - RoomDetail Header with max-w-6xl constraint
  - DeviceDetailView Header with max-w-6xl constraint
  - MenuButton component (inline variant for headers)
- [x] **Device Repositioning Fix**
  - Bug: New devices were placed with absolute instead of relative coordinates
  - Fix: `roomWidth / 2` instead of `(startPoint.x + endPoint.x) / 2`
- [x] **Expert Mode Device Filtering** (like SwiftUI)
  - Complex devices only visible in expert mode
  - Based on `isCapabilityComplex` from SwiftUI
  - Complex capabilities: vibrationSensor, speaker, tv, smokeSensor, loadMetering, buttonSwitch, energyManager, excessEnergyConsumer, bluetoothDetector, trackableDevice, camera
  - New functions: `isDeviceComplex()`, `filterDevicesForExpertMode()`
  - Applied in: RoomsView (RoomDetail), DevicesView

### Pending ⏳

**Component Refactoring:**
- [ ] DeviceDetailView.tsx refactoring (1387 lines → split into components)
- [ ] RadialMenu.tsx refactoring - Extract Device-specific logic
  - **Problem:** `RadialMenu.tsx` (626 lines) contains Device-specific logic (`DeviceStatus`, `getDeviceStatus()`, `getDeviceMenuItems()`)
  - **Goal:** Make RadialMenu generic, move Device logic to `RadialDeviceMenu.tsx`
  - **Benefits:** Enables future `RadialRoomMenu`, `RadialGroupMenu` without polluting RadialMenu
  - **Migration:** Move `DeviceStatus`, `getDeviceStatus()`, `getDeviceMenuItems()` to RadialDeviceMenu.tsx

**Feature Additions:**
- [ ] Floor Editor UI (Settings page for managing floor definitions)
- [ ] Time selector component for automation rules

**Code Quality:**
- [ ] Refactor direct device property access to use deviceStore functions
  - Many files still access `device.lightOn`, `device.brightness`, etc. directly
  - Should use `isDeviceOn()`, `getDeviceBrightness()`, etc. from deviceStore
  - Ensures consistent fallback logic (`lightOn ?? _lightOn ?? on ?? _on`)
  - Affected: DeviceCard, DeviceStatusBadges, various Control components

---

## PWA (Progressive Web App) Features

### ✅ Implemented (Jan 1, 2026)

#### Basic PWA Setup
- [x] **Web App Manifest** (`public/manifest.json`)
  - Name, short name, description
  - Start URL (`/ui/`)
  - Display mode: `standalone`
  - Theme color: `#3B82F6`
  - Background color: `#000000`
  - Icons: 192px, 512px (from Swift app)
  
- [x] **HTML Meta Tags** (`index.html`)
  - Viewport (mobile-optimized, `user-scalable=no`, `viewport-fit=cover`)
  - Apple Mobile Web App Capable: `yes`
  - Apple Mobile Web App Status Bar Style: `black-translucent`
  - Theme Color (light/dark media queries)
  - Manifest link
  
- [x] **App Icons**
  - Favicon: `/icon.png`
  - Apple Touch Icon: `/icon.png`
  - PWA Icons: `/icon-192.png`, `/icon-512.png`
  - Source: Copied from Swift app (`Hoffmation/Shared/Assets.xcassets/AppIcon.appiconset/`)

### ✅ PWA Features (IMPLEMENTED - 01.01.2026)

#### 1. Service Worker & Offline Support ✅
- ✅ Vite PWA Plugin installed
- ✅ Service Worker configured (`vite.config.ts`)
  - Auto-update strategy (`registerType: 'autoUpdate'`)
  - Hybrid caching strategy:
    - **CacheFirst** for static assets (30 days)
    - **NetworkFirst** for API calls (30s cache, 5s timeout)
    - **StaleWhileRevalidate** for settings (24h)
    - **NetworkOnly** for camera images
- ✅ Offline detection (`useOnlineStatus` hook)
- ✅ Offline banner (orange warning when offline)

#### 2. Install Prompt ✅
- ✅ `useInstallPrompt` hook created
  - Listens for `beforeinstallprompt` event
  - Provides `promptInstall()` function
  - Detects if already installed
- ✅ Install button in Settings
  - Shows only when prompt available
  - "Als App installieren" button
  - Shows "App ist installiert" status when installed

#### 3. Manifest Enhancements ✅
- ✅ Extended manifest properties
  - `scope: "/ui/"`
  - `orientation: "portrait-primary"`
  - `categories: ["lifestyle", "utilities"]`
- ✅ App shortcuts implemented
  - Grundriss: `/ui/floor/0`
  - Favoriten: `/ui/favorites`
  - Räume: `/ui/rooms`

#### 4. iOS Support ✅
- ✅ Splash screens generated (5 sizes)
  - iPhone X/XS/11 Pro: 1125x2436
  - iPhone XR/11: 828x1792
  - iPhone XS Max/11 Pro Max: 1242x2688
  - iPhone 12/13/14: 1170x2532
  - iPad Pro 12.9": 2048x2732
- ✅ iOS meta tags
  - `apple-mobile-web-app-title`
  - Dark mode theme color
  - `<link rel="apple-touch-startup-image">` tags

#### 5. Push Notifications ✅
- ✅ VAPID keys generated and secured
  - Public key in `webui-settings.json` (API-accessible)
  - Private key in `vapid-keys.json` (NOT API-accessible)
- ✅ Backend endpoints
  - `POST /webui/push/subscribe` - Save subscription
  - `POST /webui/push/unsubscribe` - Remove subscription
  - `GET /webui/push/vapid-public-key` - Get public key
- ✅ Frontend implementation
  - `usePushNotifications` hook
  - Subscribe/Unsubscribe UI in Settings
  - Permission handling
- ✅ Service Worker push handler (`sw-push.js`)
  - Receives push notifications
  - Shows notifications
  - Handles notification clicks
- ✅ `PushNotificationService` (Backend)
  - `sendToAll(title, body, url)` - Send to all subscriptions
  - `sendToSubscription(sub, title, body, url)` - Send to specific subscription
  - Automatic cleanup of invalid subscriptions

### 📊 Caching Strategy Details

**Static Assets (CacheFirst - 30 days):**
- Icons, CSS, JS bundles
- Instant load, no network needed
- Auto-update on new app version

**API Data (NetworkFirst - 5 min):**
- `/rooms`, `/devices` endpoints
- Always fresh when online
- Fallback to cache when offline/slow
- 3s network timeout

**Settings (StaleWhileRevalidate - 24h):**
- `/webui/settings`, floor definitions
- Instant response from cache
- Background update for next request

**Camera Images (NetworkFirst - 1 min):**
- `/camera/*` endpoints
- Short cache (images change frequently)
- 2s network timeout

### 🎯 Priority Order

1. **🔴 HIGH:** Service Worker (offline support, caching)
2. **🟡 MEDIUM:** Install Prompt (better UX)
3. **🟢 LOW:** Manifest enhancements, more icons, iOS splash screens

### 📝 Implementation Notes

- Service Worker managed by Vite PWA Plugin (no manual SW code)
- Cache automatically cleared on app updates
- Offline mode shows last known device states (read-only)
- Install prompt only shows on HTTPS (or localhost)

### Implementation Notes 📝

1. **Settings are partial:** API accepts partial settings objects - only send changed fields
2. **Settings in response:** Device/Room settings are included in GET responses (no separate fetch needed)
3. **Use Pickers:** Prefer picker/dropdown components for time selection (hours/minutes)
4. **Capability check:** Always verify device capabilities before showing settings section
5. **SwiftUI reference:** See `/Users/thiemo/0_dev/Github/Hoffmation/Shared/Views/Devices/Settings/`
6. **Context file:** See `CONTEXT.md` for detailed implementation notes and session continuity

---

## Future Features / Backlog

### 📊 Grafana Integration (Planned)

**Goal:** Embed existing Grafana dashboards/panels directly into the WebUI to visualize historical device data.

**Approach:**
- **iframe-Embedding** of Grafana panels with kiosk mode
- **Dynamic Parameters:** Pass device ID and time range via URL parameters
- **No Data Duplication:** Leverage existing Grafana infrastructure instead of rebuilding charts
- **Responsive Design:** Collapsible sections to avoid clutter

**Use Cases:**
- Historical temperature/humidity trends per room
- Energy consumption graphs per device
- System-wide statistics and analytics

**Integration Points (TBD):**
- Room detail view (per-room graphs)
- Device detail view (per-device graphs)
- Dedicated "Analytics" page (system-wide overview)

**Technical Considerations:**
- Grafana URL structure: `https://grafana.local/d-solo/dashboard-id/panel-id?orgId=1&theme=dark&kiosk&var-device_id=XXX&from=now-24h&to=now`
- Authentication: Token-based or public dashboards
- CORS: May require Grafana configuration
- Responsive: iframe height/width management

**Status:** 🟡 Interest confirmed, implementation details pending
