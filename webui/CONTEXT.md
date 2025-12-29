# Hoffmation WebUI - Development Context

**Last Updated:** 2025-12-29 20:10 UTC+01:00

## Project Overview

React + TypeScript + TailwindCSS WebUI for Hoffmation Smart Home System.
Goal: Full feature parity with existing SwiftUI app at `/Users/thiemo/0_dev/Github/Hoffmation`.

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Zustand (state), i18next (i18n)
- **Build:** Vite
- **API Proxy:** Target `http://hoffmation.hoffmation.com:3000`
- **Backend Types:** `hoffmation-base` npm package

## Key Files

| File | Purpose |
|------|---------|
| `src/views/DeviceDetailView.tsx` | Main device control view (~1387 lines) - needs refactoring |
| `src/views/FloorPlanView.tsx` | Floor plan router (51 lines) |
| `src/views/floorplan/` | Floor plan components (refactored) |
| `src/views/floorplan/HouseCrossSection.tsx` | Floor selection view |
| `src/views/floorplan/FloorPlan.tsx` | Floor detail + room editing |
| `src/views/floorplan/RoomFloorPlanDetail.tsx` | Room detail + device positioning + Radial Menu |
| `src/views/floorplan/types.ts` | Shared interfaces |
| `src/components/DeviceSettingsSection.tsx` | Device settings component |
| `src/stores/dataStore.ts` | Zustand store for rooms/devices |
| `src/stores/settingsStore.ts` | App settings (polling, dark mode, etc.) |
| `src/api/devices.ts` | Device API functions (incl. setDevicePosition) |
| `src/views/device/` | Refactored DeviceDetailView components |
| `src/views/rooms/` | Refactored RoomsView components |
| `src/components/RadialMenu.tsx` | Radial quick-action menu for floor plan |
| `src/api/client.ts` | Base API client (apiPost, apiPostNoResponse) |

## Device Capabilities (from hoffmation-base)

```typescript
const DeviceCapability = {
  ac: 0,
  actuator: 1,
  energyManager: 3,
  heater: 5,
  humiditySensor: 6,
  lamp: 8,
  dimmableLamp: 9,
  motionSensor: 10,
  shutter: 11,
  temperatureSensor: 12,
  speaker: 14,
  handleSensor: 15,
  batteryDriven: 16,
  ledLamp: 18,
  scene: 103,
  blockAutomatic: 104,
  camera: 105,
};
```

## Completed Features ✅

- All device type controls (Lamp, Dimmer, LED, Shutter, Actuator, AC, Heater, Scene, Speaker, Camera, etc.)
- Device settings (basic: Actuator on/off per time, Shutter direction/heat reduction)
- Quick device controls in Favorites
- Group detail view with filtered devices
- Temperature history chart (24h SVG)
- Camera live stream links
- Block Automatic with date picker and extend functionality
- Expert mode and Exclude levels
- Refresh buttons in all views
- Dark mode, i18n (DE/EN)
- **Floor Plan Room Editing** - Drag&Drop room positioning with coordinates
- **Device Position Editing** - Place devices in rooms via trilaterationRoomPosition
- **Comfort Favorites** - Unreachable devices, low battery devices
- **Group Settings** - Heater group automatic mode, temperatures
- **FloorPlanView Refactoring** - Split into 4 components (949→51 lines)
- **DeviceDetailView Refactoring** - Split into views/device/ with control components
- **RoomsView Refactoring** - Split into views/rooms/ with sub-components
- **Badge-Text Fix** - Capability priority for LED/Lamp/Dimmer badges
- **Radial Menu** - Tap=Toggle, Hold=Radial with child-friendly icons

## Next Steps (Pending) ⏳

### 1. Complete Device Settings Views

All settings should be fully implemented based on hoffmation-base types.

**ActuatorSettings:**
- `dawnOn`, `duskOn`, `nightOn`, `dayOn` (Toggle)
- `includeInAmbientLight` (Toggle)
- `isStromStoss`, `resetToAutomaticOnForceOffAfterForceOn` (Toggle)
- `stromStossResendTime` (Number)

**DimmerSettings** (extends ActuatorSettings):
- `nightBrightness`, `dawnBrightness`, `duskBrightness`, `dayBrightness` (Slider 0-100)
- `turnOnThreshhold` (Number)

**LedSettings** (extends DimmerSettings):
- `defaultColor` (ColorPicker)
- `dayColor`, `dawnColor`, `duskColor`, `nightColor` (ColorPicker)
- `dayColorTemp`, `dawnColorTemp`, `duskColorTemp`, `nightColorTemp` (Number)

**ShutterSettings:**
- `direction` (Slider 0-360°)
- `heatReductionPosition` (Slider 0-100%)
- `heatReductionThreshold` (Slider 20-35°C)
- `heatReductionDirectionThreshold` (Slider 20-35°C)
- `msTilTop`, `msTilBot` (Number)
- `triggerPositionUpdateByTime` (Toggle)

**HeaterSettings:**
- `automaticMode` (Toggle)
- `useOwnTemperatur` (Toggle)
- `useOwnTemperatureForRoomTemperature` (Toggle)
- `controlByPid` (Toggle)
- `controlByTempDiff` (Toggle)
- `seasonalTurnOffActive` (Toggle)
- `seasonTurnOffDay`, `seasonTurnOnDay` (Number)
- `pidForcedMinimum` (Slider 0-100)
- `manualDisabled` (Toggle)

**AcSettings:**
- `minimumHours`, `minimumMinutes` (TimePicker)
- `maximumHours`, `maximumMinutes` (TimePicker)
- `heatingAllowed` (Toggle)
- `useOwnTemperature` (Toggle)
- `useAutomatic` (Toggle)
- `noCoolingOnMovement` (Toggle)
- `manualDisabled` (Toggle)
- `minOutdoorTempForCooling` (Slider 16-25°C)
- `overrideCoolingTargetTemp` (Slider -1 to 22°C)

**HandleSettings:**
- `informOnOpen` (Toggle)
- `informNotHelping` (Toggle)
- `informIsHelping` (Toggle)

**CameraSettings:**
- `alertPersonOnTelegram` (Toggle)
- `movementDetectionOnPersonOnly` (Toggle)
- `movementDetectionOnDogsToo` (Toggle)

**MotionSensorSettings:**
- `seesWindow` (Toggle)
- `excludeFromNightAlarm` (Toggle)

**SceneSettings:**
- `defaultTurnOffTimeout` (Number)

**SonosDeviceSettings:**
- `maxPlayOnAllVolume` (Slider)
- `defaultDayAnounceVolume` (Slider)
- `defaultNightAnounceVolume` (Slider)

### 2. Room Settings View

Add to RoomDetail view with all room settings:

**Light Settings:**
- `ambientLightAfterSunset`, `lichtSonnenAufgangAus`, `lightIfNoWindows`
- `lampenBeiBewegung`, `roomIsAlwaysDark`
- `sonnenAufgangLampenDelay`, `sonnenUntergangLampenDelay` (Slider -120 to 120 min)
- `includeLampsInNormalMovementLightning`

**Shutter Settings:**
- `rolloHeatReduction`, `sonnenAufgangRollos`, `sonnenUntergangRollos`
- `sonnenAufgangRolloDelay`, `sonnenUntergangRolloDelay` (Slider -120 to 120 min)
- `sonnenAufgangRolloMinTime`, `sonnenUntergangRolloMaxTime` (TimePicker)
- `sonnenUntergangRolloAdditionalOffsetPerCloudiness` (Slider 0-0.5)

**Other:**
- `movementResetTimer` (Slider 60-3600s)
- `radioUrl` (Text input)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/devices` | GET | Get all devices |
| `/devices/:id` | GET | Get single device |
| `/rooms` | GET | Get all rooms |
| `/lamps/:id/:state/:duration?` | GET | Control lamp |
| `/dimmer/:id/:state/:brightness?/:duration?` | GET | Control dimmer |
| `/led/:id/:state/:brightness/:color/:duration?` | GET | Control LED |
| `/shutter/:id/:level` | GET | Control shutter |
| `/actuator/:id/:state/:duration?` | GET | Control actuator |
| `/ac/:id/power/:mode/:temp` | GET | Control AC |
| `/scene/:id/start/:timeout` | GET | Start scene |
| `/scene/:id/end` | GET | End scene |
| `/speak/:id` | POST | Speak on device |
| `/device/:id/blockAutomatic/:timeout` | GET | Block automatic |
| `/device/:id/liftAutomaticBlock` | GET | Lift block |
| `/deviceSettings/:id` | POST | Update device settings (partial) |
| `/roomSettings/:roomName` | POST | Update room settings (partial) |
| `/groupSettings/:groupId` | POST | Update group settings (partial) |

## Important Notes

1. **Settings are partial:** Can send only changed fields to API
2. **Settings in response:** Device/Room settings come with the GET response
3. **Use Pickers:** Prefer picker/dropdown over simple inputs for time selection
4. **Capability check:** Always check device capabilities before showing settings
5. **SwiftUI reference:** `/Users/thiemo/0_dev/Github/Hoffmation/Shared/Views/Devices/Settings/`

## Bug Fixes Applied

- Capability constants corrected to match hoffmation-base enum
- Polling interval: seconds stored, multiplied by 1000 for setInterval
- LED Force uses `setLed` not `setLamp`
- API client uses dynamic base URL (reads from localStorage each request)
- `automaticBlockedUntil` parsing handles Date/string/number formats

## Session Notes

- User prefers Picker components for time selection
- Settings can be applied partially (only send changed fields)
- Settings data is included in device/room API responses
- Continue with implementing all device settings views

## Session 2024-12-29 (Morning) - Device Position Editing + Refactoring

### Implemented:
- **Device Position Editing** - Place devices in rooms
  - Click on room → RoomFloorPlanDetail component
  - Edit mode: Drag&Drop, Plus button for unplaced devices
  - API: `POST /deviceSettings/:id` with `trilaterationRoomPosition`
  - Default {0,0,0} = not placed

### Refactoring:
- **FloorPlanView.tsx** split into `views/floorplan/`:
  - `types.ts` - Interfaces
  - `HouseCrossSection.tsx` - Floor selection
  - `FloorPlan.tsx` - Floor detail + room editing
  - `RoomFloorPlanDetail.tsx` - Room detail + device positioning
  - `index.ts` - Re-exports

### Key Learnings:
- **No scale transforms during drag&drop** - prevents precise alignment
- **fixedScale state** set when entering edit mode
- **apiPostNoResponse** for endpoints without JSON response

---

## Session 2024-12-29 (Afternoon) - UI Improvements + Device Filtering

### Implemented:

#### 1. Device Status Badges Improved
- **DeviceStatusBadges component** in RoomsView for detailed device status
- Motion sensor: Count today + active motion ("Motion!" green)
- Heater: Current/target temperature + valve level
- Dimmer/LED: Brightness % + color (LED)
- Shutter: Position % (normalized to 0-100)
- Window handle: Status with color coding (open=red, tilted=orange, closed=green)
- Lamp: On/Off status

#### 2. DeviceIcon Extensions
- **Speaker Icon**
- **CO2 Sensor Icon** (CloudFog)
- **Motion sensor green** when movement actively detected

#### 3. LED/Dimmer Status Fix
- `lightOn ?? _lightOn ?? on ?? _on` fallback chain (like DeviceIcon)
- Brightness alone doesn't mean "on" (stored value for next turn-on)

#### 4. Layout Improvements
- **RoomDetail Header** with max-w-6xl constraint
- **DeviceDetailView Header** with max-w-6xl constraint
- **MenuButton component** (inline variant for headers)
  - Refactored from MenuBubble
  - `variant='inline'` for header integration
  - Backdrop to close on outside click

#### 5. Device Repositioning Fix
- **Bug:** New devices were placed with absolute instead of relative coordinates
- **Fix:** `roomWidth / 2` instead of `(startPoint.x + endPoint.x) / 2`
- Position is relative to room (0,0 = bottom-left corner)

#### 6. Expert Mode Device Filtering
- **Complex devices** only visible in expert mode (like SwiftUI)
- Based on `isCapabilityComplex` from SwiftUI
- Complex capabilities:
  - vibrationSensor (13), speaker (14), tv (17), smokeSensor (19)
  - loadMetering (20), buttonSwitch (2), energyManager (3)
  - excessEnergyConsumer (4), bluetoothDetector (101)
  - trackableDevice (102), camera (105)
- New functions in dataStore.ts:
  - `isDeviceComplex(device)` - checks if all capabilities are complex
  - `filterDevicesForExpertMode(devices, expertMode)` - filters device list
- Applied in: RoomsView (RoomDetail), DevicesView

### Changed Files:
- `src/views/RoomsView.tsx` - DeviceStatusBadges, MenuButton, Expert filter
- `src/views/DevicesView.tsx` - Expert filter
- `src/views/DeviceDetailView.tsx` - MenuButton, Header max-width
- `src/components/DeviceIcon.tsx` - Speaker, CO2, Motion status icons
- `src/components/layout/MenuBubble.tsx` - MenuButton component
- `src/stores/dataStore.ts` - Device filtering functions
- `src/views/floorplan/RoomFloorPlanDetail.tsx` - Position fix

---

## Todo List (Current)

### Completed ✅
- [x] Device Position Editing implementation
- [x] FloorPlanView Refactoring (views/floorplan/)
- [x] Move MenuBubble to bottom-left
- [x] Add git fetch for WebUI update
- [x] Document Child-Friendly Mode
- [x] Update REQUIREMENTS.md + CONTEXT.md
- [x] DeviceStatusBadges with detailed status
- [x] Speaker + CO2 icons
- [x] Motion sensor active status (green)
- [x] LED/Dimmer status fix (on/_on fallback)
- [x] MenuButton in header (RoomDetail, DeviceDetailView)
- [x] Device repositioning fix (relative coordinates)
- [x] Expert Mode Device Filtering
- [x] DeviceDetailView.tsx refactoring → views/device/
- [x] RoomsView.tsx refactoring → views/rooms/
- [x] Badge-Text fix (Capability priority for LED/Lamp)
- [x] Sync React primaryCap with Swift
- [x] Radial Menu: Tap=Toggle, Hold=Radial
- [x] Child-friendly icons (same icon, different fill/color)

### Pending ⏳
- [ ] Child-Friendly Mode for floor plan (full implementation)

---

## Session 2024-12-29 (Evening) - Refactoring + Radial Menu

### Implemented:

#### 1. DeviceDetailView Refactoring
- Split 1387-line file into `views/device/`:
  - `types.ts` - Interfaces and capability constants
  - `DeviceHeader.tsx` - Back button, name, room, favorite
  - `DeviceInfo.tsx` - Device info section (ID, type, capabilities, signal)
  - `controls/LampControls.tsx` - Lamp on/off with force duration
  - `controls/DimmerControls.tsx` - Brightness slider
  - `controls/LedControls.tsx` - Color picker + brightness
  - `controls/ShutterControls.tsx` - Quick buttons + position slider
  - `controls/ActuatorControls.tsx` - Actuator on/off
  - `controls/ClimateControls.tsx` - Temperature, AC, Heater, Humidity
  - `controls/SensorControls.tsx` - Motion, Handle sensors
  - `controls/MediaControls.tsx` - Speaker, Scene, Camera
  - `controls/AutomaticControls.tsx` - Block automatic
  - `controls/EnergyControls.tsx` - Energy manager, Battery
  - `controls/index.ts` - Re-exports
  - `index.ts` - Main exports

#### 2. RoomsView Refactoring
- Split into `views/rooms/`:
  - `types.ts` - Interfaces and constants
  - `DeviceStatusBadges.tsx` - Device status badges
  - `RoomCardContent.tsx` - Room card in list
  - `RoomDetail.tsx` - Room detail view
  - `GroupDetailView.tsx` - Group detail view
  - `RoomsView.tsx` - Main view
  - `index.ts` - Re-exports

#### 3. Badge-Text Bug Fix
- **Problem:** Actuator badge shown for LED/Lamp devices
- **Cause:** Badge logic only excluded `CAP_LAMP`, not `CAP_DIMMABLE` or `CAP_LED`
- **Fix:** Added exclusion for all light capabilities in `DeviceStatusBadges.tsx`

#### 4. primaryCap Sync with Swift
- Aligned React `getPrimaryCap()` order with Swift `Device.primaryCap`
- New priority: scene → handleSensor → ledLamp → dimmableLamp → lamp → actuator → ...

#### 5. Radial Menu for Floor Plan
- **New component:** `src/components/RadialMenu.tsx`
- **Tap behavior:**
  - Lamp/Dimmer/LED → Toggle on/off
  - Shutter → Toggle open/closed
  - AC → Toggle on/off
  - Other devices → Open detail view
- **Hold behavior (≥400ms):** Opens radial menu with:
  - Info button (always) → Details view
  - Device-specific quick actions

#### 6. Child-Friendly Icons (like SwiftUI)
- **Concept:** Same icon per device type, only fill/color changes
- **Lamp:** Lightbulb - yellow filled (100%), orange filled (50%), gray outline (off)
- **Shutter:** Square - green outline (open), orange half-filled (50%), brown filled (closed)
- **AC:** Wind - red (heating), blue (cooling), green (auto), gray (off)
- **Mode detection:** AC mode from device, seasonal default (May-Oct = cooling)

### Changed Files:
- `src/views/device/` - New directory with 15 files
- `src/views/rooms/` - New directory with 7 files
- `src/views/DeviceDetailView.tsx` - Re-export wrapper
- `src/views/RoomsView.tsx` - Re-export wrapper
- `src/components/DeviceIcon.tsx` - primaryCap order sync
- `src/components/RadialMenu.tsx` - New radial menu component
- `src/views/floorplan/RoomFloorPlanDetail.tsx` - Tap/Hold + Radial integration

### Key Learnings:
- **Inheritance:** LED extends Dimmer extends Lamp extends Actuator → `setLamp` works for all
- **SwiftUI Icons:** SF Symbols use same icon with `.fill` suffix for active state
- **Child-friendly:** Visual distinction through color/fill, not different icons
