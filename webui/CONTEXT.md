# Hoffmation WebUI - Development Context

## Project Overview

React + TypeScript + TailwindCSS WebUI for Hoffmation Smart Home System.
Goal: Full feature parity with existing SwiftUI app at `/Users/thiemo/0_dev/Github/Hoffmation`.

**Latest Build Size**

- **Bundle:** 1,221.10 kB (gzip: 261.64 kB)
- **CSS:** 34.08 kB (gzip: 6.55 kB)
- **Total:** ~2.88 MB (with PWA assets)

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Zustand (state), i18next (i18n)
- **Build:** Vite
- **API Proxy:** Target `http://hoffmation.hoffmation.com:3000`
- **Backend Types:** `hoffmation-base` npm package

## Store Architecture (01.01.2026)

**Modular structure:** `index.ts`, `types.ts`, `deviceStore.ts`, `roomStore.ts`, `dataStore.ts`
**Key fixes:** Circular dependencies, ESM imports, battery.level, etageToFloorId mapping

## Key Refactorings

**31.12.2024:**
- `executeDeviceAction` wrapper (-400 lines boilerplate)
- `RadialDeviceMenu` self-contained component (-70 lines)
- `toggleDevice` service (business logic out of views)
- Multi-floor support (FloorDefinition, crossSectionFloors)
- IconPicker & ColorPicker for child-friendly identification

**05.01.2026:**
- Automatic device refresh in executeDeviceAction (-200 lines)
- Property access standardization (getter functions)
- Temperature logic fix (sensor vs room average)
- Shutter logic fix (0%=closed, 100%=open)
- Dimmer toggle fix (setDimmer without brightness)

## Key Files

| File | Purpose |
|------|---------|
| `src/views/DeviceDetailView.tsx` | Main device control view (~1387 lines) - needs refactoring |
| `src/views/FloorPlanView.tsx` | Floor plan router (51 lines) |
| `src/views/floorplan/` | Floor plan components (refactored) |
| `src/views/floorplan/HouseCrossSection.tsx` | Floor selection view |
| `src/views/floorplan/FloorPlan.tsx` | Floor detail + room editing |
| `src/views/floorplan/RoomFloorPlanDetail.tsx` | Room detail + device positioning (uses RadialDeviceMenu) |
| `src/views/floorplan/types.ts` | Shared interfaces |
| `src/components/DeviceSettingsSection.tsx` | Device settings component |
| `src/stores/dataStore.ts` | Zustand store for rooms/devices + FloorDefinition interfaces |
| `src/stores/settingsStore.ts` | App settings (polling, dark mode, floors, etc.) |
| `src/api/settings.ts` | WebUI settings API (floors) |
| `src/components/IconPicker.tsx` | Searchable Lucide icon picker |
| `src/components/ColorPicker.tsx` | Interactive color picker with presets |
| `src/api/devices.ts` | Device API functions (incl. setDevicePosition) |
| `src/lib/deviceActions.ts` | Service layer for device actions (executeDeviceAction, toggleDevice) |
| `src/stores/deviceStore.ts` | Device helpers (isToggleableDevice, hasCapability, etc.) |
| `src/components/RadialDeviceMenu.tsx` | Self-contained radial menu wrapper |
| `src/views/device/` | Refactored DeviceDetailView components |
| `src/views/rooms/` | Refactored RoomsView components |
| `src/components/RadialMenu.tsx` | Radial quick-action menu for floor plan |
| `src/api/client.ts` | Base API client (apiPost, apiPostNoResponse) |

## Multi-Floor Architecture

**Backend:** `config/private/webui-settings.json` (FloorDefinition[]), `GET /api/webui/settings`
**Frontend:** `settingsStore.loadFloors()`, `getFloorsForRoom()`, `getRoomWebUISettings()`
**Room settings:** `customSettingsJson.webui.crossSectionFloors`, icon, color
**Note:** Floor definitions readonly (manual JSON editing)

## Device Capabilities

**Source:** `hoffmation-base` npm package
**Key capabilities:** lamp(8), dimmer(9), led(18), shutter(11), ac(0), heater(5), temp(12), motion(10), handle(15), speaker(14), camera(105), scene(103)

## Completed Features ✅

- All device controls & settings (Lamp, Dimmer, LED, Shutter, AC, Heater, Scene, Speaker, Camera)
- Floor plan (3-level drill-down, room/device editing, adjacent room navigation)
- Radial menu (tap=toggle, hold=menu, child-friendly icons)
- PWA (offline, install, push notifications, iOS support)
- Expert mode, dark mode, i18n (DE/EN)
- Component refactoring (DeviceDetailView, FloorPlanView, RoomsView)
- Multi-floor support (icons, colors, crossSectionFloors)
- Device logs, battery indicators, unreachable detection
- Temperature history, camera streams, block automatic

## Pending ⏳

- Time Selector for Automation Rules
- Group settings view
- Heat group settings
- Floor Editor UI

## API Endpoinst

**Data:** `/devices`, `/devices/:id`, `/rooms`
**Controls:** `/lamps/:id/:state`, `/dimmer/:id/:state/:brightness?`, `/led/:id/:state/:brightness/:color`, `/shutter/:id/:level`, `/actuator/:id/:state`, `/ac/:id/power/:mode/:temp`
**Actions:** `/scene/:id/start/:timeout`, `/speak/:id` (POST), `/device/:id/blockAutomatic/:timeout`
**Settings:** `/deviceSettings/:id` (POST), `/roomSettings/:roomName` (POST), `/groupSettings/:groupId` (POST)

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

## Key Technical Decisions

- No scale transforms during drag&drop (alignment issues)
- Swift-compatible property fallback chains
- Room comparison by name (IDs not unique)
- Adjacent room detection: Overlap ≥ -TOLERANCE
- Partial settings updates (only changed fields)
- Picker components for time selection
- Child-friendly: 60x60px touch targets, color coding

## PWA & Mobile (01-02.01.2026)

**PWA:** Service Worker, offline support, install prompt, push notifications, iOS splash screens
**Filters:** Icon-only buttons, separate states (room/floor), responsive menu (mobile popup)
**iOS Fixes:** Portal rendering, z-index hierarchy, safe-area handling, 20px padding

## Recent Bug Fixes

**05.01.2026:**
- Bug #14: Refresh delay 300ms → 800ms (Zigbee devices)
- Bug #12: isDeviceUnreachable logic (devices without lastUpdate)
- Bug #13: Room stats in floor overview (temp, lamps, AC, shutters, handles, motion)
- Bug #11: Temperature logic (sensor vs room average)
- Bug #10: Dimmer toggle (setDimmer without brightness)
- Bug #9: Shutter values (0%=closed, 100%=open)
- Bug #4: Shutter times in header (sunrise/sunset icons)
- Mobile optimization: Stats prioritization (hide visually apparent stats)

**07.01.2026:**
- Bug #1: Actuator missing "An schalten"/"Aus schalten" buttons (only Force buttons existed)
- Bug #2: Motion sensor "Seit letzter Bewegung" always showed "Aktiv" (now shows proper time format)

**11.01.2026:**
- Bug #3: Device refresh button added to DeviceDetailView header (for all devices)
