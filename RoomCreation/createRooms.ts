/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');

function createRooms(): void {
  console.log('Starte Room Creation');

  class RoomConfigs {
    roomDefinitions: string[] = [];
    deviceDefinitions: string[] = [];
  }

  class Room {
    public nameShort: string;
    public nameLong: string;
    public etage: number;
    public fileName: string;
    public devices: { [deviceType: string]: Device[] } = {};
    public groups: { [groupName: string]: Device[] } = {};
    public hasIoBrokerDevices: boolean = false;
    public fileContent: string = '';
    public customContent: string = '';
    public noRolloOnSunrise: boolean = false;
    public readonly className: string;
    public readonly folderName: string;
    private readonly fileNameCustom: string;
    private readonly rolloOffsetSunR: number;
    private readonly rolloOffsetSunS: number;
    private readonly lampOffsetSunR: number;
    private readonly lampOffsetSunS: number;
    private readonly folderPath: string;
    private fileBuilder: string[] = [];
    private readonly classNameCustom: string;

    public static includesDict: { [deviceType: string]: string } = {
      ZigbeeAquaraVibra: 'hoffmation-base',
      HmIpBewegung: 'hoffmation-base',
      HmIpGriff: 'hoffmation-base',
      HmIpHeizgruppe: 'hoffmation-base',
      HmIpHeizung: 'hoffmation-base',
      HmIpLampe: 'hoffmation-base',
      HmIpPraezenz: 'hoffmation-base',
      HmIpRoll: 'hoffmation-base',
      HmIpTaster: 'hoffmation-base',
      HmIpTherm: 'hoffmation-base',
      HmIpTuer: 'hoffmation-base',
      HmIpWippe: 'hoffmation-base',
      ZigbeeIkeaFernbedienung: 'hoffmation-base',
      ZigbeeIkeaSteckdose: 'hoffmation-base',
      ZigbeeIlluDimmer: 'hoffmation-base',
      ZigbeeIlluLampe: 'hoffmation-base',
      ZigbeeIlluActuator: 'hoffmation-base',
      ZigbeeIlluLedRGBCCT: 'hoffmation-base',
      Fenster: 'hoffmation-base',
      Sonos: 'hoffmation-base',
      ZigbeeHeimanSmoke: 'hoffmation-base',
      ZigbeeAquaraWater: 'hoffmation-base',
      ZigbeeBlitzShp: 'hoffmation-base',
    };

    public constructor(row: string) {
      const data = row.split(';');
      if (data.length < 8) {
        throw new Error(`Invalid Room definition Row: "${row}"`);
      }
      this.nameShort = data[0];
      this.nameLong = data[1];
      this.etage = parseInt(data[2], 10);
      this.fileName = data[3];
      this.rolloOffsetSunR = parseInt(data[4], 10);
      this.rolloOffsetSunS = parseInt(data[5], 10);
      this.lampOffsetSunR = parseInt(data[6], 10);
      this.lampOffsetSunS = parseInt(data[7], 10);

      this.noRolloOnSunrise = this.rolloOffsetSunR === -1;
      this.folderName = this.fileName.replace('.ts', '');
      this.folderPath = `./src/OwnRooms/${this.folderName}`;
      this.className = `room_${this.folderName}`;
      this.classNameCustom = `${this.className}_custom`;
      this.fileNameCustom = `${this.folderName}_custom.ts`;
    }

    public addDevice(device: Device) {
      const dType: string = device.deviceType;
      if (Room.includesDict[dType] === undefined) {
        throw new Error(`Device Type ${dType} is invalid`);
      }
      if (this.devices[dType] === undefined) {
        this.devices[dType] = [];
      }
      const index: number = device.roomIndex;
      if (this.devices[dType][index] !== undefined) {
        throw new Error(`Device with Type ${dType} for Room ${device.room} with Room-Index ${index} already exists`);
      }

      this.devices[dType][index] = device;
      if (device.isIoBrokerDevice) this.hasIoBrokerDevices = true;
      if (device.groupN !== '') {
        if (this.groups[device.groupN] === undefined) {
          this.groups[device.groupN] = [];
        }
        this.groups[device.groupN].push(device);
      }
    }

    public prepare(): void {
      this.createImports();
      this.createClassAndEnd();
      this.createCustomFile();
      this.fileContent = this.fileBuilder.join('\n');
    }

    public createFile(): void {
      if (!fs.existsSync(this.folderPath)) {
        fs.mkdirSync(this.folderPath);
      }

      fs.writeFileSync(`${this.folderPath}/${this.fileName}`, this.fileContent);

      const customPath: string = `${this.folderPath}/${this.fileNameCustom}`;
      if (!fs.existsSync(customPath)) {
        fs.writeFileSync(customPath, this.customContent);
      }
    }

    private createCustomFile(): void {
      this.customContent = `export class ${this.classNameCustom} {
  // This class can be used to modify room specific settings and to introduce own bindings/callbacks

  public static preInitialize(): void {
    // This Logic is executed prior to ${this.className} Initialize Function
  }

  public static postInitialize(): void {
    // This Logic is executed after ${this.className} Initialize Function
  }

  public static postSuperInitialize(): void {
    // This Logic is executed after ${this.className} ran super constructor
  }
}
`;
    }

    private createImports(): void {
      this.fileBuilder.push(`import { Devices } from 'hoffmation-base';
import { RoomSettings, RoomInitializationSettings, RoomDeviceAddingSettings } from 'hoffmation-base';
import { RoomBase } from 'hoffmation-base';
import { DeviceType } from 'hoffmation-base';
import { FensterGroup } from 'hoffmation-base';
import { LampenGroup } from 'hoffmation-base';
import { PraesenzGroup } from 'hoffmation-base';
import { TasterGroup } from 'hoffmation-base';
import { SmokeGroup } from 'hoffmation-base';
import { WaterGroup } from 'hoffmation-base';
import { HeatGroup } from 'hoffmation-base';
import { SonosGroup } from 'hoffmation-base';`);

      for (const type in this.devices) {
        if (type !== 'Sonos') {
          this.fileBuilder.push(`import { ${type} } from '${Room.includesDict[type]}';`);
        } else {
          this.fileBuilder.push(
            `import { OwnSonosDevice } from '${Room.includesDict[type]}';
import { OwnSonosDevices } from 'hoffmation-base';`,
          );
        }
      }
      this.fileBuilder.push(
        `import { ${this.classNameCustom} } from './${this.fileNameCustom.replace('.ts', '')}';`,
      );
    }

    private createClassAndEnd() {
      this.fileBuilder.push(`\nexport class ${this.className} extends RoomBase {`);
      const variablesBuilder: string[] = [];
      const getterBuilder: string[] = [];
      const setIDBuilder: string[] = [];

      const initializeBuilder: string[] = [];
      const groupInitializeBuilder: string[] = [];
      const bottomDeviceBuilder: string[] = [];
      variablesBuilder.push(`  public static roomName = '${this.nameShort}';
  public static RoomSettings: RoomSettings;
  public static InitialRoomSettings: RoomInitializationSettings = new RoomInitializationSettings('${this.nameShort}', ${this.etage});
  public static roomObject: ${this.className};`);
      initializeBuilder.push(`  public static initialize(): void {
    ${this.classNameCustom}.preInitialize();`);

      this.createGroups(variablesBuilder, initializeBuilder, groupInitializeBuilder);

      if (this.hasIoBrokerDevices) {
        bottomDeviceBuilder.push(
          `const ioDevices: RoomDeviceAddingSettings = new RoomDeviceAddingSettings('${this.nameShort}');`,
        );
      }

      for (const type in this.devices) {
        const cDevices: Device[] = this.devices[type];
        for (const index in cDevices) {
          const device: Device = cDevices[index];
          const noGetter: boolean = device.isSonos || device.isFenster;
          const noID: boolean = device.isSonos || device.isFenster;
          !noID && variablesBuilder.push(`private static ${device.idName}: string = '';`);
          !noGetter && getterBuilder.push(`\n  public static get ${device.nameShort}(): ${type} {`);
          if (device.isIoBrokerDevice) {
            bottomDeviceBuilder.push(
              `ioDevices.addDevice(DeviceType.${type}, ${this.className}.${device.setIdName}, ${device.roomIndex}, '${device.nameLong}');`,
            );
            if (!noGetter) {
              getterBuilder.push(
                `    return Devices.alLDevices[${this.className}.${device.idName}] as unknown as ${type};`,
              );
            }
          } else if (device.isSonos) {
            bottomDeviceBuilder.push(`OwnSonosDevices.addDevice(${this.className}.SN${device.nameShort});`);
          }
          !noGetter && getterBuilder.push(`  }`);
          if (!noID) {
            setIDBuilder.push(`\n  public static ${device.setIdName}(value: string): RoomBase {`);
            setIDBuilder.push(`    ${this.className}.${device.idName} = value;`);
            setIDBuilder.push(`    return ${this.className}.roomObject;`);
            setIDBuilder.push(`  }`);
          }
        }
      }
      initializeBuilder.push(`    ${this.classNameCustom}.postInitialize();
  }`);
      this.fileBuilder.push(variablesBuilder.join(`\n  `));
      this.fileBuilder.push(getterBuilder.join(`\n`));
      this.fileBuilder.push(setIDBuilder.join(`\n`));
      this.fileBuilder.push(initializeBuilder.join('\n'));
      this.createConstructor(groupInitializeBuilder);
      this.fileBuilder.push(`}`);

      if (this.hasIoBrokerDevices) {
        bottomDeviceBuilder.push(`${this.className}.InitialRoomSettings.deviceAddidngSettings = ioDevices;`);
      }
      this.fileBuilder.push(bottomDeviceBuilder.join('\n'));
      this.fileBuilder.push(
        `\nRoomInitializationSettings.registerRoomForDevices(${this.className}.InitialRoomSettings);\n`,
      );
    }

    private createConstructor(groupInitialize: string[]) {
      this.fileBuilder.push(`\n  public constructor() {
    ${this.className}.RoomSettings = new RoomSettings(${this.className}.InitialRoomSettings);  
    ${this.className}.RoomSettings.sonnenAufgangRolloDelay = ${this.rolloOffsetSunR};
    ${this.className}.RoomSettings.sonnenUntergangRolloDelay = ${this.rolloOffsetSunS};
    ${this.className}.RoomSettings.sonnenAufgangLampenDelay = ${this.lampOffsetSunR};
    ${this.className}.RoomSettings.sonnenUntergangLampenDelay = ${this.lampOffsetSunS};
    super(${this.className}.roomName, ${this.className}.RoomSettings);
    ${this.className}.roomObject = this;
    ${this.className}.initialize();`);
      this.fileBuilder.push(groupInitialize.join(''));

      this.fileBuilder.push(`    RoomBase.addToRoomList(this);
    this.initializeBase();
    ${this.classNameCustom}.postSuperInitialize();
    this.persist();
  }`);
    }

    private createGroups(variablesBuilder: string[], initializeBuilder: string[], groupInitializeBuilder: string[]) {
      const fensterGroupList: string[] = [];
      const beweg: string[] = [];
      const prasenz: string[] = [];
      const lampe: string[] = [];
      const taster: string[] = [];
      const led: string[] = [];
      const stecker: string[] = [];
      const sonos: string[] = [];
      const smoke: string[] = [];
      const water: string[] = [];
      const heater: string[] = [];
      for (const grName in this.groups) {
        const cDevices = this.groups[grName];
        if (grName.startsWith('Fenster')) {
          const innerBuilder: string[] = [];
          const griffe: string[] = [];
          const vibration: string[] = [];
          let rollo: string = 'undefined';
          let fensterName: string = '';
          let noRolloOnSunrise: boolean = false;
          for (const i in cDevices) {
            const d: Device = cDevices[i];
            if (d.isFenster) {
              fensterName = d.nameShort;
              noRolloOnSunrise = d.fensterNoRolloOnSunrise as boolean;
              variablesBuilder.push(`public static ${d.nameShort}: Fenster;`);
              innerBuilder.push(`\n    ${this.className}.${d.nameShort} = new Fenster(
      ${this.className}.roomObject,`);
              fensterGroupList.push(`${this.className}.${d.nameShort}`);
            } else if (d.isRollo) {
              rollo = `${this.className}.${d.nameShort}`;
            } else if (d.isGriff) {
              griffe.push(`${this.className}.${d.nameShort}`);
            } else if (d.isVibra) {
              vibration.push(`${this.className}.${d.nameShort}`);
            }
          }
          if (fensterName === '') {
            throw new Error(`Fenster without name for ${this.className}`);
          }
          innerBuilder.push(`\n      [${griffe.join(', ')}],
      [${vibration.join(', ')}],
      ${rollo},
      ${noRolloOnSunrise ? 'true' : 'false'},
    );`);
          initializeBuilder.push(innerBuilder.join(''));
          continue;
        }
        for (const i in cDevices) {
          const d: Device = cDevices[i];
          const completeName = `${this.className}.${d.nameShort}`;
          if (d.isBeweg) {
            beweg.push(completeName);
            if (d.excludeFromNightAlarm) {
              initializeBuilder.push(`    ${completeName}.excludeFromNightAlarm = true;`);
            }
          } else if (d.isLED) {
            led.push(completeName);
          } else if (d.isStecker) {
            stecker.push(completeName);
          } else if (d.isPraesenz) {
            prasenz.push(completeName);
            if (d.excludeFromNightAlarm) {
              initializeBuilder.push(`    ${completeName}.excludeFromNightAlarm = true;`);
            }
          } else if (d.isLampeOrDimmer) {
            lampe.push(completeName);
          } else if (d.isTaster) {
            taster.push(completeName);
          } else if (d.isSonos) {
            sonos.push(`${this.className}.SN${d.nameShort}`);
            variablesBuilder.push(
              `public static SN${d.nameShort}: OwnSonosDevice = new OwnSonosDevice('${d.nameShort}', this.roomName, undefined);`,
            );
          } else if (d.isSmoke) {
            smoke.push(completeName);
            initializeBuilder.push(`    ${completeName}.roomName = '${this.nameLong}';`);
          } else if (d.isWater) {
            water.push(completeName);
            initializeBuilder.push(`    ${completeName}.roomName = '${this.nameLong}';`);
          } else if (d.isHeater) {
            heater.push(completeName);
          }
        }
      }

      groupInitializeBuilder.push(`    this.FensterGroup = new FensterGroup(this, [${fensterGroupList.join(', ')}]);
    this.PraesenzGroup = new PraesenzGroup(this, [${prasenz.join(', ')}], [${beweg.join(', ')}]);
    this.LampenGroup = new LampenGroup(
      this,
      [${lampe.join(', ')}],
      [${stecker.join(', ')}],
      [${led.join(', ')}],
    );
    this.TasterGroup = new TasterGroup(this, [${taster.join(', ')}]);
    this.SmokeGroup = new SmokeGroup(this, [${smoke.join(', ')}]);
    this.WaterGroup = new WaterGroup(this, [${water.join(', ')}]);
    this.HeatGroup = new HeatGroup(this, [${heater.join(', ')}]);
    this.SonosGroup = new SonosGroup(this, [${sonos.join(', ')}]);`);
    }
  }

  class Device {
    public id: number;
    public idName: string;
    public setIdName: string;
    public room: string;
    public deviceType: string;
    public deviceClass: string;
    public roomIndex: number;
    public nameShort: string;
    public nameLong: string;
    public isIoBrokerDevice: boolean = false;
    public isFenster: boolean = false;
    public isSonos: boolean = false;
    public isLampeOrDimmer: boolean = false;
    public isStecker: boolean = false;
    public isLED: boolean = false;
    public isTaster: boolean = false;
    public isRollo: boolean = false;
    public isGriff: boolean = false;
    public isBeweg: boolean = false;
    public isVibra: boolean = false;
    public isPraesenz: boolean = false;
    public isSmoke: boolean = false;
    public isWater: boolean = false;
    public isHeater: boolean = false;
    public fensterNoRolloOnSunrise?: boolean = false;
    public excludeFromNightAlarm: boolean = false;
    public fensterID: number;
    public includeInGroup: boolean;
    public groupN: string = '';
    public zusatzParams: string = '';

    public constructor(row: string) {
      const data = row.split(';');
      if (data.length < 12) {
        throw new Error(`Invalid Device definition Row: "${row}"`);
      }
      this.id = parseInt(data[0], 10);
      this.room = data[1];
      this.deviceType = data[2];
      this.deviceClass = data[3];
      this.roomIndex = parseInt(data[4], 10);
      this.nameShort = data[7].replace('.', '_');
      this.nameLong = data[8];
      this.fensterID = parseInt(data[9], 10);
      this.includeInGroup = data[10] === '1';
      this.zusatzParams = data[11];

      this.idName = `id${this.nameShort}`;
      this.setIdName = `set${this.idName.charAt(0).toUpperCase()}${this.idName.substr(1)}`;
      switch (this.deviceClass) {
        case 'Zigbee':
          this.isIoBrokerDevice = true;
          break;
        case 'HmIP':
          this.isIoBrokerDevice = true;
          if (this.zusatzParams.indexOf('nightAlarmExclude') >= 0) {
            this.excludeFromNightAlarm = true;
          }
          break;
        case 'Fenster':
          this.isFenster = true;
          if (this.zusatzParams.indexOf('noRolloOnSunrise') >= 0) {
            this.fensterNoRolloOnSunrise = true;
          }
          break;
        case 'Sonos':
          this.isSonos = true;
          break;
        default:
          throw new Error(`${this.deviceClass} is not yet supported for ${this.nameLong}`);
      }

      switch (this.deviceType) {
        case 'HmIpBewegung':
          this.isBeweg = true;
          break;
        case 'HmIpPraezenz':
          this.isPraesenz = true;
          break;
        case 'HmIpTaster':
          this.isTaster = true;
          break;
        case 'HmIpRoll':
          this.isRollo = true;
          break;
        case 'HmIpGriff':
          this.isGriff = true;
          break;
        case 'HmIpLampe':
        case 'ZigbeeIlluDimmer':
        case 'ZigbeeIlluLampe':
          this.isLampeOrDimmer = true;
          break;
        case 'ZigbeeIkeaSteckdose':
          this.isStecker = true;
          break;
        case 'ZigbeeAquaraVibra':
          this.isVibra = true;
          break;
        case 'ZigbeeIlluLedRGBCCT':
          this.isLED = true;
          break;
        case 'ZigbeeHeimanSmoke':
          this.isSmoke = true;
          break;
        case 'ZigbeeAquaraWater':
          this.isWater = true;
          break;
        case 'HmIpHeizgruppe':
          this.isHeater = true;
          break;
      }

      if (this.fensterID > 0) {
        this.groupN = `Fenster_${this.fensterID}`;
      } else if (this.includeInGroup) {
        if (this.isBeweg) {
          this.groupN = `Beweg`;
        } else if (this.isPraesenz) {
          this.groupN = `Praesenz`;
        } else if (this.isLampeOrDimmer) {
          this.groupN = `Lampe`;
        } else if (this.isLED) {
          this.groupN = `LED`;
        } else if (this.isStecker) {
          this.groupN = `Stecker`;
        } else if (this.isSonos) {
          this.groupN = `Sonos`;
        } else if (this.isTaster) {
          this.groupN = `Taster`;
        } else if (this.isHeater) {
          this.groupN = `Heater`;
        }
      } else if (this.isSmoke) {
        this.groupN = `Smoke`;
      } else if (this.isWater) {
        this.groupN = `Water`;
      }
    }
  }

  class Rooms {
    public rooms: { [id: string]: Room } = {};
    private readonly roomEnforcerPath: string = './src/OwnRooms/RoomImportEnforcer.ts';

    public addDevices(deviceDefinitions: string[]): void {
      for (let i = 0; i < deviceDefinitions.length; i++) {
        const row: string = deviceDefinitions[i];
        const device: Device = new Device(row);
        if (this.rooms[device.room] === undefined) {
          throw new Error(`Unknown Room ("${device.room}") within device: ${row}`);
        }
        this.rooms[device.room].addDevice(device);
      }
    }

    public prepareRooms(): void {
      for (const roomName in this.rooms) {
        this.rooms[roomName].prepare();
      }
    }

    constructor(roomDefinitions: string[]) {
      for (let i = 0; i < roomDefinitions.length; i++) {
        const row: string = roomDefinitions[i];
        const room: Room = new Room(row);
        this.rooms[room.nameLong] = room;
      }
    }

    createFiles() {
      const roomEnforcerImport: string[] = [
        `import { iRoomImportEnforcer } from 'hoffmation-base';
import { ioBrokerMain } from 'hoffmation-base';`,
      ];
      const roomEnforcerContent: string[] = [
        `
export class RoomImportEnforcer implements iRoomImportEnforcer {
  public addRoomConstructor(): void {`,
      ];
      for (const roomName in this.rooms) {
        const room: Room = this.rooms[roomName];
        room.createFile();
        roomEnforcerImport.push(
          `import { ${room.className} } from './${room.folderName}/${room.folderName}';`,
        );
        roomEnforcerContent.push(`    ioBrokerMain.addRoomConstructor(${room.className}.roomName, ${room.className});`);
      }

      roomEnforcerContent.push(`  }\n}\n`);
      fs.writeFileSync(this.roomEnforcerPath, `${roomEnforcerImport.join('\n')}\n${roomEnforcerContent.join('\n')}`);
    }
  }

  function loadContent() {
    const path = './config/private/RoomConfig.txt';
    if (fs.existsSync(path)) {
      return fs.readFileSync(path).toString();
    }
    return '';
  }

  function getConfigs(content: string): RoomConfigs {
    const rows = content.split('\n');
    const config: RoomConfigs = new RoomConfigs();
    console.log(`Detected ${rows.length} Rows`);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] === undefined || rows[i] === '') {
        continue;
      }
      const rowSplit = rows[i].replace('\r', '').split('###');
      switch (rowSplit[0]) {
        case 'RoomDefintion':
          config.roomDefinitions.push(rowSplit[1]);
          break;
        case 'DeviceDefintion':
          config.deviceDefinitions.push(rowSplit[1]);
          break;
        default:
          console.warn(`Unknown Config Type: ${rowSplit[0]} abort`);
          throw new Error(`Unknown Config Type: ${rowSplit[0]} abort`);
      }
    }
    return config;
  }

  function main() {
    // Load Config
    let contentLoaded = false;
    let content = '';
    try {
      content = loadContent();
      contentLoaded = content.length > 0;
    } catch (e) {}

    // Warn if Config empty
    if (!contentLoaded) {
      console.warn(
        'No config file within "/server/config/private/RoomConfig.txt" found. Please add config and rerun this task.',
      );
      return;
    }

    console.log(`Recieved a file with ${content.length} Chars.`);

    const configs: RoomConfigs = getConfigs(content);
    console.log(
      `Detected ${configs.roomDefinitions.length} Rooms, with a total of ${configs.deviceDefinitions.length} devices`,
    );
    // Create Rooms
    const rooms: Rooms = new Rooms(configs.roomDefinitions);

    // Add Devices To Rooms
    rooms.addDevices(configs.deviceDefinitions);
    console.log(`Devices added to Rooms, starting file preparation now...`);

    // Generate code for File
    rooms.prepareRooms();

    // Create Dir and file
    rooms.createFiles();
  }

  main();
}

createRooms();
exports.createRooms = createRooms;