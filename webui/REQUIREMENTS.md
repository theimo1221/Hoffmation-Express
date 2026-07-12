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
- ✅ Automatic device refresh after actions (Jan 5, 2026)
- ✅ Centralized property access via getter functions (Jan 5, 2026)
- ✅ Temperature logic fix: device vs room temperature (Jan 5, 2026)

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

**Separation of Concerns:**
- Views are "dumb" - presentation only
- Business logic in services (`/lib/deviceActions.ts`)
- State management in stores (Zustand)
- API calls in `/api/` layer
- Self-contained components with single responsibility

**Key Refactorings:**
- DeviceDetailView: 1387 → 204 lines (18 control components)
- FloorPlanView: 949 → 51 lines (3 view components)
- `executeDeviceAction` wrapper: -400 lines boilerplate, automatic refresh
- Property access standardization: Getter functions instead of direct access
- Temperature logic: Separate sensor vs room average functions

---


## Navigation Structure

**5 Tabs:** Floor Plan (3-level drill-down: House → Floor → Room), Favorites, Rooms, Devices, Settings

**Floor Plan:**
1. House cross-section (tap floor)
2. Floor plan with rooms (tap room)
3. Room with devices (tap/hold device)

**Interactions:**
- Tap device → Quick toggle
- Hold device (≥400ms) → Radial menu
- Tap room/floor → Navigate deeper

---

## UI Patterns ✅

**Radial Menu (GTA-style):**
- Tap device → Quick toggle
- Hold (≥400ms) → Radial menu with actions
- 150px radius, clock positions, hover sectors
- Child-friendly icons with color coding

**Floor Plan Features:**
- Device icons at actual positions
- Responsive icon sizing (xs/sm/md/lg)
- Adjacent room navigation (auto-detection)
- Z-coordinate editing in edit mode
- Battery/offline indicators
- Touch support for iOS

**Settings:**
- Polling: 30s default (configurable)
- Dark mode: System preference
- Language: i18n (DE/EN)
- Storage: LocalStorage

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
| Temperature history | ✅ | ✅ | 24h SVG chart |
| Camera live view | ✅ | ✅ | Stream links |
| Pull-to-refresh | ✅ | ✅ | Header button |
| Device Settings | ✅ | ✅ | All types (531 lines) |
| Room Settings | ✅ | ✅ | Complete (641 lines) |
| Time selector | ✅ | ⏳ | Pending |

---

## Implementation Status

### Complete ✅
- 5-tab navigation, floor plan (3-level drill-down)
- Device/Room controls, settings, and editing
- PWA (offline, install, push notifications)
- Expert mode, drag&drop positioning
- Multi-floor support, icon/color pickers
- Temperature history, camera live view
- Automatic refresh, property standardization
- Component refactoring (DeviceDetailView, FloorPlanView)
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

### Recently Completed ✅
- DeviceStatusBadges with detailed status per device type
- DeviceIcon extensions (Speaker, CO2, Motion)
- LED/Dimmer status fix with fallback chain
- Layout improvements (max-w-6xl constraints)
- Device repositioning fix (relative coordinates)
- Expert mode filtering for complex devices

### Completed Refactoring ✅

- ✅ DeviceDetailView.tsx (1387 → 204 lines) - Split into 11 control components
- ✅ FloorPlanView.tsx (949 → 51 lines) - Split into HouseCrossSection, FloorPlan, RoomFloorPlanDetail
- ✅ Property access standardization - All device properties use getter functions
- ✅ Automatic device refresh - executeDeviceAction handles refresh automatically

### Pending ⏳

- [ ] Time Selector for Automation Rules
- [ ] Group settings view
- [ ] Heat group settings  
- [ ] Floor Editor UI

---

## PWA (Progressive Web App) ✅

**Implemented (Jan 1, 2026):**
- ✅ Service Worker with hybrid caching (CacheFirst/NetworkFirst/StaleWhileRevalidate)
- ✅ Install prompt with `useInstallPrompt` hook
- ✅ Offline detection and banner
- ✅ Push notifications (VAPID keys, backend endpoints, frontend UI)
- ✅ iOS support (splash screens, meta tags)
- ✅ App shortcuts (Grundriss, Favoriten, Räume)

**Caching Strategy:**
- Static assets: CacheFirst (30 days)
- API data: NetworkFirst (5 min cache, 3s timeout)
- Settings: StaleWhileRevalidate (24h)
- Camera images: NetworkFirst (1 min)

### Implementation Notes 📝

1. **Settings are partial:** API accepts partial settings objects - only send changed fields
2. **Settings in response:** Device/Room settings are included in GET responses (no separate fetch needed)
3. **Use Pickers:** Prefer picker/dropdown components for time selection (hours/minutes)
4. **Capability check:** Always verify device capabilities before showing settings section
5. **SwiftUI reference:** See the SwiftUI companion app's `Shared/Views/Devices/Settings/`
6. **Context file:** See `CONTEXT.md` for detailed implementation notes and session continuity

---

## Future Features

- Grafana integration (iframe embedding for historical data)
- Time selector for automation rules
- Group settings view
- Heat group settings
- Floor editor UI
