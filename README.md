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

*Note*: Any room specific logic can be added to the `custom.ts` file of each room. 
If these files exist, they won't get overridden if you run `create-rooms` again.

### Connect to ioBroker
1. Make sure the devices in ioBroker are named according to the following naming scheme:
   `00-[HmIP or Zigbee]-[Room name]-[DeviceType]-[RoomIndex]`
2. Download your whole object tree from within the ioBroker -> objects page.  
   The resulting `.json` should be placed in the `config/private` folder, renamed to `devices.json`
3. Place a `mainConfig.json` in the `config/private` folder with the correct ioBroker URL.
   You can use the mainConfig.json.example as template and overview of which settings currently are available.

### Configure behavior
Main behaviour settings of the library can be placed/changed in the `mainConfig.json` as mentioned above.

## Running the software
If you want to run the software and are sure you've set the project up correctly, just run `npm run start`.

### Environmental notes
This project has been tested on
- Debian 11
- FreeBSD 12.2-p10
- Windows Server 2019

It is not guaranteed this project will run on different platforms, it should however run on most Unix-based or Windows-based ones.