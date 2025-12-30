# Hoffmation WebUI - Development Context

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

## Implementation History

### Core Features Implemented

#### Floor Plan & Navigation
- **3-Level Drill-Down:** House cross-section → Floor plan → Room detail
- **Device Position Editing:** Drag&drop placement with trilaterationRoomPosition
- **Room Editing:** Visual room boundary adjustment
- **Adjacent Room Navigation:** Automatic detection with arrows and room names
- **Device Icons in Floor Plan:** Shows placed devices at actual positions

#### Radial Menu (GTA-Style)
- **Tap-to-Toggle:** Quick actions for Lamps, Actuators, Shutters, AC, LEDs
- **Hold-for-Menu (≥400ms):** Opens radial menu with device-specific actions
- **150px Radius:** Large, easy-to-hit targets
- **Clock Positions:** Consistent placement (9h=target temp, 10-14h=actions, 16-20h=status, 18h=info)
- **Hover Sectors:** 36° colored sectors for visual feedback
- **Mode-Specific Icons:** Flame/Snowflake for heating/cooling modes

#### Device Controls & Status
- **Central Helper Functions:** Swift-compatible property fallback chains
- **Color Coding:** Green=secure/on, Orange=partial, Gray=off/insecure, Red=open
- **Child-Friendly Icons:** Same icon per type, only fill/color changes
- **LED Brightness Rays:** 8 rays in upper semicircle (12.5% per ray, min 1 when on)
- **Status Badges:** Detailed device status (temperature, brightness, position, battery, etc.)

#### Refactoring & Architecture
- **FloorPlanView:** Split into 4 components (HouseCrossSection, FloorPlan, RoomFloorPlanDetail, types)
- **DeviceDetailView:** Split into 15 files (controls/, DeviceHeader, DeviceInfo, etc.)
- **RoomsView:** Split into 7 files (RoomDetail, GroupDetailView, DeviceStatusBadges, etc.)

#### Mobile & Touch Support
- **iOS Touch Events:** Full drag&drop support with touch
- **Screen-Edge Clamping:** Radial menu stays within viewport
- **Auto-Scaling:** No scrollbars, responsive sizing
- **Large Touch Targets:** 60x60px minimum for child-friendly use

#### Settings & Configuration
- **Room Settings:** Light, shutter, movement timer, trilateration coordinates
- **Device Settings:** Basic settings for actuators, shutters (more pending)
- **Expert Mode:** Filters complex devices (speakers, cameras, energy managers)
- **Partial Updates:** Only send changed fields to API

### Key Technical Decisions
- **No scale transforms during drag&drop** - Prevents alignment issues
- **fixedScale state** - Set when entering edit mode
- **Swift-compatible property order** - Matches iOS app behavior
- **Room comparison by name** - IDs not always unique
- **Point-touching detection** - Overlap ≥ -TOLERANCE for adjacent rooms

### Important Notes
- User prefers Picker components for time selection
- Settings can be applied partially (only send changed fields)
- Settings data is included in device/room API responses
- Backend issue: Some devices (temperature sensors, smoke detectors) have `settings: null`

### Pending Features
- [ ] Complete device settings views (Dimmer, LED, Heater, AC, Handle, Camera)
- [ ] Room settings view (full implementation)
- [ ] Group settings view
- [ ] Heat group settings
- [ ] Child-Friendly Mode (full floor plan implementation)
