# Hoffmation-Express
The configurable counterpart to the [Hoffmation-Base](https://github.com/theimo1221/Hoffmation-Base) home automation library.  
This project is used for configuring rooms and devices to be used with the base library.

## Installation
### Requirements on the running system
- node.js >= 16 and a matching npm version
  Note for FreeBSD or FreeBSD-based systems users: Make sure, your system or jail is up to date, otherwise [node might not work correctly](https://github.com/nodejs/node/issues/40467#issuecomment-946902776)
- git (not *needed*, but makes things like updating and following the installation steps simpler)

### Requirements for using the library
.. should be looked up [here](https://github.com/theimo1221/Hoffmation-Base#base-requirements).

### Steps to install
*Note: For security reasons, the project should not be installed and run as root, but as separate user!*

1. Clone Hoffmation-Express to a local folder:  
   `git clone https://github.com/theimo1221/Hoffmation-Express.git`
2. Run `npm install` in the cloned folder (by default `Hoffmation-Express`)
3. Follow the steps described in "Configuration" to create the configuration for your rooms and devices you want to use 

## Configuration
### Create Rooms and their devices
Hoffmation is centered about rooms. 
Many follow certain default behaviour while others have very specific rules.
To be modular, rooms within HoffMation should be generated automatically.

To do so, 
1. Use the `config/private/roomConfig.example.json` as base for the rooms and devices you want to interact with.
   The resulting file has to be saved to `config/private/roomConfig.json`
2. Run `npm run create-rooms` to create the needed source files for your configuration.

### Connect to ioBroker
1. Make sure the devices in ioBroker are named according to the following naming scheme:
   `00-[HmIP or Zigbee]-[Room name]-[DeviceType]-[RoomIndex]`
2. Download your whole object tree from within the ioBroker -> objects page.  
   The resulting `.json` should be placed in the `config/private` folder, renamed to `devices.json`
3. Place a `mainConfig.json` in the `config/private` folder with the correct ioBroker URL.
   You can use the mainConfig.json.example as template and overview of which settings currently are available.
   Room specific settings are also listed [near the end of this file.](#room-specific-settings)

### Configure behavior
Main behaviour settings of the library can be placed/changed in the `mainConfig.json` as mentioned above.  
If you want to configure the settings of a room (e.g. turning all lights on if movements are detected), 
you can use 
- the `..._custom.ts` file of each room.  
  There, just set up your room settings via code.  
  If these files exist, they won't get overridden if you run `create-rooms` again.
- the `roomConfig.json` file before (re)generating your rooms.  
  There, you can override any setting you can set in the roomDefault of your mainConfig.json for any room - just add them under the key `settings`.

#### Room specific settings
The following room-specific settings can currently be set:
| Name                        | Description                                                                                 | Value     |
|-----------------------------|---------------------------------------------------------------------------------------------|-----------|
| rolloHeatReduction          | Use shutter to reduce warming of rooms on hot days (detected by weather service)            | boolean   |
| lampenBeiBewegung           | Turn lamps of this room be turned if movements were recognized here                         | boolean   |
| lichtSonnenAufgangAus       | Turn lamps off on sunrise                                                                   | boolean   |
| sonnenUntergangRollos       | Close shutters on sunset (detected by geo location)                                         | boolean   |
| sonnenUntergangRolloDelay   | Offset (positive/negative) in minutes for closing shutters after sunset                     | number    |
| sonnenUntergangRolloMaxTime | Close the shutters by this time at the latest (regardless of sunset time)                   | iTimePair |
| sonnenUntergangLampenDelay  | Offset in minutes for turning on lamps if movements were recognized                         | number    |
| sonnenAufgangRollos         | Open shutters on sunrise (detected by geo location)                                         | boolean   |
| sonnenAufgangRolloDelay     | Offset (positive/negative) in minutes for opening shutters after sunrise                    | number    |
| sonnenAufgangRolloMinTime   | Open the shutters by this time at the latest (regardless of sunrise time)                   | iTimePair |
| sonnenAufgangLampenDelay    | Offset in minutes for still turning on lamps if movements after sunrise were recognized     | number    |
| movementResetTimer          | Time in seconds after which detected movements are reset (and assumed to not exist anymore) | number    |
| lightIfNoWindows            | Turn lights on during the day if no windows are configured for this room                    | boolean   |

## Running the software
If you want to run the software and are sure you've set the project up correctly, just run `npm run start`.

### Environmental notes
This project has been tested on
- Debian 11
- FreeBSD 12.2-p10
- Windows Server 2019

It is not guaranteed this project will run on different platforms, it should however run on most Unix-based or Windows-based ones.