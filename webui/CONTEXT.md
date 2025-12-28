# Hoffmation WebUI - Development Context

**Last Updated:** 2025-12-29 00:40 UTC+01:00

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
| `src/views/floorplan/RoomFloorPlanDetail.tsx` | Room detail + device positioning |
| `src/views/floorplan/types.ts` | Shared interfaces |
| `src/components/DeviceSettingsSection.tsx` | Device settings component |
| `src/stores/dataStore.ts` | Zustand store for rooms/devices |
| `src/stores/settingsStore.ts` | App settings (polling, dark mode, etc.) |
| `src/api/devices.ts` | Device API functions (incl. setDevicePosition) |
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

## Session 29.12.2024 - Device Position Editing + Refactoring

### Implementiert:
- **Device Position Editing** - Geräte im Raum platzieren
  - Klick auf Raum → RoomFloorPlanDetail Komponente
  - Editiermodus: Drag&Drop, Plus-Button für unplatzierte Geräte
  - API: `POST /deviceSettings/:id` mit `trilaterationRoomPosition`
  - Default {0,0,0} = nicht platziert

### Refactoring:
- **FloorPlanView.tsx** aufgeteilt in `views/floorplan/`:
  - `types.ts` - Interfaces
  - `HouseCrossSection.tsx` - Etagen-Auswahl
  - `FloorPlan.tsx` - Etagen-Detail + Raum-Editing
  - `RoomFloorPlanDetail.tsx` - Raum-Detail + Geräte-Positionierung
  - `index.ts` - Re-Exports

### Wichtige Learnings:
- **Keine scale-Transforms beim Drag&Drop** - verhindert präzises Alignment
- **fixedScale State** beim Eintritt in Editiermodus setzen
- **apiPostNoResponse** für Endpoints ohne JSON-Response

### Nächste Schritte:
- DeviceDetailView.tsx Refactoring (1387 Zeilen)
- RoomsView.tsx Refactoring (546 Zeilen)
- Child-Friendly Mode für Grundriss implementieren (Licht & Rolläden für 4+ Jahre)

## Todo List (aktuell)

### Completed ✅
- [x] Device Position Editing implementieren
- [x] FloorPlanView Refactoring (views/floorplan/)
- [x] MenuBubble nach links unten verschieben
- [x] Git fetch zum WebUI Update hinzufügen
- [x] Child-Friendly Mode dokumentieren
- [x] REQUIREMENTS.md + CONTEXT.md aktualisieren

### Pending ⏳
- [ ] DeviceDetailView.tsx Refactoring (1387 Zeilen)
- [ ] RoomsView.tsx Refactoring (546 Zeilen)
- [ ] Child-Friendly Mode für Grundriss implementieren
