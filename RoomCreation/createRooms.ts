/* eslint-disable @typescript-eslint/no-var-requires */
import config from '../config/private/roomConfig.json';
import { ActuatorSettings, iRoomDefaultSettings } from 'hoffmation-base/lib';
import { DeviceSettings } from '../../Hoffmation-Base/src/models/deviceSettings';

const fs = require('fs');

const DEVICE_TYPE: { [type: string]: { name: string; deviceClass: string } } = {
  Daikin: { name: 'Daikin', deviceClass: 'Daikin' },
  WledDevice: { name: 'Wled', deviceClass: 'Wled' },
  Fenster: { name: 'Fenster', deviceClass: 'Fenster' },
  HmIpAccessPoint: { name: 'AccessPoint', deviceClass: 'HmIP' },
  HmIpBewegung: { name: 'Bewegungsmelder', deviceClass: 'HmIP' },
  HmIpGriff: { name: 'Griff', deviceClass: 'HmIP' },
  HmIpHeizgruppe: { name: 'Heizgruppe', deviceClass: 'HmIP' },
  HmIpHeizung: { name: 'Heizung', deviceClass: 'HmIP' },
  HmIpLampe: { name: 'Lampe', deviceClass: 'HmIP' },
  HmIpPraezenz: { name: 'Praesenzmelder', deviceClass: 'HmIP' },
  HmIpRoll: { name: 'Rollo', deviceClass: 'HmIP' },
  HmIpTaster: { name: 'Taster', deviceClass: 'HmIP' },
  HmIpTherm: { name: 'Thermostat', deviceClass: 'HmIP' },
  HmIpTuer: { name: 'Türkontakt', deviceClass: 'HmIP' },
  HmIpWippe: { name: 'Wippschalter', deviceClass: 'HmIP' },
  MieleWasch: { name: 'Waschmaschine', deviceClass: 'Miele' },
  Sonos: { name: 'Sonos', deviceClass: 'Sonos' },
  ZigbeeAqaraMagnetContact: { name: 'Magnet Contact', deviceClass: 'Zigbee' },
  ZigbeeAqaraOpple3Switch: { name: 'Switch6Buttons', deviceClass: 'Zigbee' },
  ZigbeeAquaraMotion: { name: 'Bewegungsmelder', deviceClass: 'Zigbee' },
  ZigbeeAquaraVibra: { name: 'Vibrationssensor', deviceClass: 'Zigbee' },
  ZigbeeAquaraWater: { name: 'Wassermelder', deviceClass: 'Zigbee' },
  ZigbeeBlitzShp: { name: 'Stecker', deviceClass: 'Zigbee' },
  ZigbeeHeimanSmoke: { name: 'Rauchmelder', deviceClass: 'Zigbee' },
  ZigbeeEuroHeater: { name: 'Heizung', deviceClass: 'Zigbee' },
  ZigbeeIkeaFernbedienung: { name: 'Fernbedienung', deviceClass: 'Zigbee' },
  ZigbeeIkeaSteckdose: { name: 'Stecker', deviceClass: 'Zigbee' },
  ZigbeeIlluActuator: { name: 'Aktuator', deviceClass: 'Zigbee' },
  ZigbeeIlluDimmer: { name: 'Dimmer', deviceClass: 'Zigbee' },
  ZigbeeIlluLampe: { name: 'Lampe', deviceClass: 'Zigbee' },
  ZigbeeIlluLedRGBCCT: { name: 'LED Leiste', deviceClass: 'Zigbee' },
  ZigbeeIlluShutter: { name: 'Shutter', deviceClass: 'Zigbee' },
  ZigbeeSMaBiTMagnetContact: { name: 'Magnet Contact', deviceClass: 'Zigbee' },
  ZigbeeSonoffMotion: { name: 'Motion Sensor', deviceClass: 'Zigbee' },
  ZigbeeSonoffTemp: { name: 'Temperatur Sensor', deviceClass: 'Zigbee' },
  ZigbeeUbisysShutter: { name: 'Shutter', deviceClass: 'Zigbee' },
};

interface RoomModel {
  nameShort: string;
  nameLong: string;
  floor: number;
  devices: DeviceModel[];
  settings?: Partial<iRoomDefaultSettings>;
}

interface FensterParams {
  noRolloOnSunrise?: boolean;
}

interface DeviceModel {
  deviceType: string;
  indexInRoom: number;
  ipAddress?: string;
  customName?: string;
  windowID?: number;
  includeInGroup: boolean;
  additionalParams?: FensterParams;
  settings?: Partial<ActuatorSettings>;
}

interface RoomConfigModel {
  rooms: RoomModel[];
}

function createRooms(): void {
  console.log('Starte Room Creation');

  class Room {
    public nameShort: string;
    public nameLong: string;
    public floor: number;
    public fileName: string;
    public devices: { [deviceType: string]: Device[] } = {};
    public groups: { [groupName: string]: Device[] } = {};
    public settings?: Partial<iRoomDefaultSettings>;
    public hasIoBrokerDevices: boolean = false;
    public fileContent: string = '';
    public customContent: string = '';
    public readonly className: string;
    public readonly folderName: string;
    private readonly fileNameCustom: string;
    private readonly folderPath: string;
    private fileBuilder: string[] = [];
    private readonly classNameCustom: string;

    public static includesDict: { [deviceType: string]: string } = {
      WledDevice: 'hoffmation-base/lib',
      Daikin: 'hoffmation-base/lib',
      HmIpAccessPoint: 'hoffmation-base/lib',
      HmIpBewegung: 'hoffmation-base/lib',
      HmIpGriff: 'hoffmation-base/lib',
      HmIpHeizgruppe: 'hoffmation-base/lib',
      HmIpHeizung: 'hoffmation-base/lib',
      HmIpLampe: 'hoffmation-base/lib',
      HmIpPraezenz: 'hoffmation-base/lib',
      HmIpRoll: 'hoffmation-base/lib',
      HmIpTaster: 'hoffmation-base/lib',
      HmIpTherm: 'hoffmation-base/lib',
      HmIpTuer: 'hoffmation-base/lib',
      HmIpWippe: 'hoffmation-base/lib',
      Fenster: 'hoffmation-base/lib',
      Sonos: 'hoffmation-base/lib',
      ZigbeeAqaraMagnetContact: 'hoffmation-base/lib',
      ZigbeeAqaraOpple3Switch: 'hoffmation-base/lib',
      ZigbeeAquaraMotion: 'hoffmation-base/lib',
      ZigbeeAquaraVibra: 'hoffmation-base/lib',
      ZigbeeAquaraWater: 'hoffmation-base/lib',
      ZigbeeBlitzShp: 'hoffmation-base/lib',
      ZigbeeHeimanSmoke: 'hoffmation-base/lib',
      ZigbeeEuroHeater: 'hoffmation-base/lib',
      ZigbeeIkeaFernbedienung: 'hoffmation-base/lib',
      ZigbeeIkeaSteckdose: 'hoffmation-base/lib',
      ZigbeeIlluActuator: 'hoffmation-base/lib',
      ZigbeeIlluDimmer: 'hoffmation-base/lib',
      ZigbeeIlluLampe: 'hoffmation-base/lib',
      ZigbeeIlluLedRGBCCT: 'hoffmation-base/lib',
      ZigbeeIlluShutter: 'hoffmation-base/lib',
      ZigbeeSMaBiTMagnetContact: 'hoffmation-base/lib',
      ZigbeeSonoffMotion: 'hoffmation-base/lib',
      ZigbeeSonoffTemp: 'hoffmation-base/lib',
      ZigbeeUbisysShutter: 'hoffmation-base/lib',
    };

    public constructor(roomDefinition: RoomModel) {
      this.nameShort = roomDefinition.nameShort;
      this.nameLong = roomDefinition.nameLong;
      this.floor = roomDefinition.floor;
      this.fileName = `${this.floor}_${this.nameShort.replace(' ', '').toLowerCase()}.ts`;
      this.settings = roomDefinition.settings;
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
      if (device.groupN.length <= 0) {
        return;
      }
      for (const gN of device.groupN) {
        if (this.groups[gN] === undefined) {
          this.groups[gN] = [];
        }
        this.groups[gN].push(device);
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
        fs.mkdirSync(this.folderPath, { recursive: true });
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
      this.fileBuilder.push(`import { Devices } from 'hoffmation-base/lib';
import { RoomSettings, RoomInitializationSettings, RoomDeviceAddingSettings } from 'hoffmation-base/lib';
import { RoomBase } from 'hoffmation-base/lib';
import { DeviceType } from 'hoffmation-base/lib';
import { GroupType, BaseGroup } from 'hoffmation-base/lib';
import { FensterGroup } from 'hoffmation-base/lib';
import { LampenGroup } from 'hoffmation-base/lib';
import { PraesenzGroup } from 'hoffmation-base/lib';
import { TasterGroup } from 'hoffmation-base/lib';
import { SmokeGroup } from 'hoffmation-base/lib';
import { WaterGroup } from 'hoffmation-base/lib';
import { HeatGroup } from 'hoffmation-base/lib';
import { SpeakerGroup } from 'hoffmation-base/lib';`);

      for (const type in this.devices) {
        if (type === 'Sonos') {
          this.fileBuilder.push(
            `import { OwnSonosDevice } from '${Room.includesDict[type]}';
import { OwnSonosDevices } from 'hoffmation-base/lib';`,
          );
        } else if (type === 'Daikin') {
          this.fileBuilder.push(
            `import { OwnDaikinDevice } from '${Room.includesDict[type]}';
import { OwnAcDevices } from 'hoffmation-base/lib';`,
          );
        } else {
          this.fileBuilder.push(`import { ${type} } from '${Room.includesDict[type]}';`);
        }
      }
      this.fileBuilder.push(`import { ${this.classNameCustom} } from './${this.fileNameCustom.replace('.ts', '')}';`);
    }

    private createClassAndEnd() {
      this.fileBuilder.push(`\nexport class ${this.className} extends RoomBase {`);
      const variablesBuilder: string[] = [];
      const getterBuilder: string[] = [];
      const setIDBuilder: string[] = [];
      const defaultSettingBuilder: string[] = [];

      const initializeBuilder: string[] = [];
      const groupInitializeBuilder: string[] = [];
      const clusterInitializerBuilder: string[] = [];
      const bottomDeviceBuilder: string[] = [];
      variablesBuilder.push(`  public static roomName = '${this.nameShort}';
  public static RoomSettings: RoomSettings;
  public static InitialRoomSettings: RoomInitializationSettings = new RoomInitializationSettings('${this.nameShort}', ${this.floor});
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
          const noGetter: boolean = device.isSonos || device.isFenster || device.isDaikin;
          const noID: boolean = device.isSonos || device.isFenster || device.isDaikin;
          !noID && variablesBuilder.push(`private static ${device.idName}: string = '';`);
          !noGetter && getterBuilder.push(`\n  public static get ${device.nameShort}(): ${type} {`);
          if (device.isIoBrokerDevice) {
            clusterInitializerBuilder.push(
              `this._deviceCluster.addByDeviceType(${this.className}.${device.nameShort});`,
            );
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
          } else if (device.isDaikin) {
            bottomDeviceBuilder.push(`OwnAcDevices.addDevice(${this.className}.${device.nameShort});`);
          }
          !noGetter && getterBuilder.push(`  }`);
          if (!noID) {
            setIDBuilder.push(`\n  public static ${device.setIdName}(value: string): RoomBase {`);
            setIDBuilder.push(`    ${this.className}.${device.idName} = value;`);
            setIDBuilder.push(`    return ${this.className}.roomObject;`);
            setIDBuilder.push(`  }`);
          }

          if (device.settings) {
            for (const [key, value] of Object.entries(device.settings)) {
              defaultSettingBuilder.push(`this.${device.nameShort}.settings.${key} = ${value};`);
            }
          }
        }
      }

      if (defaultSettingBuilder.length > 0) {
        initializeBuilder.push(`\n//#region device-specific settings`);
        initializeBuilder.push(defaultSettingBuilder.join(`\n`));
        initializeBuilder.push(`//#endregion device-specific settings\n`);
      }

      initializeBuilder.push(`    ${this.classNameCustom}.postInitialize();  }`);

      this.fileBuilder.push(variablesBuilder.join(`\n  `));
      this.fileBuilder.push(getterBuilder.join(`\n`));
      this.fileBuilder.push(setIDBuilder.join(`\n`));
      this.fileBuilder.push(initializeBuilder.join('\n'));
      this.createConstructor(groupInitializeBuilder, clusterInitializerBuilder);
      this.fileBuilder.push(`}`);

      if (this.hasIoBrokerDevices) {
        bottomDeviceBuilder.push(`${this.className}.InitialRoomSettings.deviceAddidngSettings = ioDevices;`);
      }
      this.fileBuilder.push(bottomDeviceBuilder.join('\n'));
      this.fileBuilder.push(
        `\nRoomInitializationSettings.registerRoomForDevices(${this.className}.InitialRoomSettings);\n`,
      );
    }

    private createConstructor(groupInitialize: string[], clusterInitialize: string[]) {
      this.fileBuilder.push(`\n  public constructor() {
    ${this.className}.RoomSettings = new RoomSettings(${this.className}.InitialRoomSettings);`);

      if (this.settings) {
        this.fileBuilder.push(`\n//#region room-specific settings`);
        for (const [key, value] of Object.entries(this.settings)) {
          this.fileBuilder.push(`${this.className}.RoomSettings.${key} = ${value};`);
        }
        this.fileBuilder.push(`//#region room-specific settings`);
      }
      this.fileBuilder.push(groupInitialize.join('\n'));

      this.fileBuilder.push(`\n 
    super(${this.className}.roomName, ${this.className}.RoomSettings, groups);
    ${this.className}.roomObject = this;`);
      this.fileBuilder.push(clusterInitialize.join('\n'));
      this.fileBuilder.push(`
    ${this.className}.initialize();`);

      this.fileBuilder.push(`    this.initializeBase();
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
      const wled: string[] = [];
      const stecker: string[] = [];
      const sonos: string[] = [];
      const daikin: string[] = [];
      const smoke: string[] = [];
      const water: string[] = [];
      const heater: string[] = [];
      const temperatur: string[] = [];
      const humidity: string[] = [];
      for (const grName in this.groups) {
        const cDevices = this.groups[grName];
        if (grName.startsWith('Fenster')) {
          const innerBuilder: string[] = [];
          const griffe: string[] = [];
          const vibration: string[] = [];
          const magnet: string[] = [];
          let rollo: string = '';
          let fensterName: string = '';
          let noRolloOnSunrise: boolean = false;
          for (const i in cDevices) {
            const d: Device = cDevices[i];
            if (d.isFenster) {
              fensterName = d.nameShort;
              noRolloOnSunrise = d.fensterNoRolloOnSunrise as boolean;
              variablesBuilder.push(`public static ${d.nameShort}: Fenster;`);
              innerBuilder.push(`\n    ${this.className}.${d.nameShort} = new Fenster(
      ${this.className}.roomName,`);
              fensterGroupList.push(`${this.className}.${d.nameShort}`);
            } else if (d.isRollo) {
              rollo = `${this.className}.${d.nameShort}.id`;
            } else if (d.isGriff) {
              griffe.push(`${this.className}.${d.nameShort}.id`);
            } else if (d.isVibra) {
              vibration.push(`${this.className}.${d.nameShort}.id`);
            } else if (d.isMagnet) {
              magnet.push(`${this.className}.${d.nameShort}.id`);
            }
          }
          if (fensterName === '') {
            throw new Error(`Fenster without name for ${this.className}`);
          }
          innerBuilder.push(`\n      [${griffe.join(', ')}],
      [${vibration.join(', ')}],
      [${rollo}],
      [${magnet.join(', ')}],
      ${noRolloOnSunrise ? 'true' : 'false'},
    );`);
          groupInitializeBuilder.push(innerBuilder.join(''));
          continue;
        }
        for (const i in cDevices) {
          const d: Device = cDevices[i];
          const completeName = `${this.className}.${d.nameShort}`;
          const completeNameWithId = `${completeName}.id`;
          if (d.isBeweg) {
            beweg.push(completeNameWithId);
          } else if (d.isLED) {
            led.push(completeNameWithId);
          } else if (d.isWled) {
            wled.push(completeNameWithId);
          } else if (d.isStecker) {
            stecker.push(completeNameWithId);
          } else if (d.isPraesenz) {
            prasenz.push(completeNameWithId);
          } else if (d.isLampeOrDimmer) {
            lampe.push(completeNameWithId);
          } else if (d.isTaster) {
            taster.push(completeNameWithId);
          } else if (d.isSonos) {
            sonos.push(`${this.className}.SN${d.nameShort}.id`);
            variablesBuilder.push(
              `public static SN${d.nameShort}: OwnSonosDevice = new OwnSonosDevice('${d.nameShort}', this.roomName, undefined);`,
            );
          } else if (d.isDaikin) {
            daikin.push(`${this.className}.${d.nameShort}.id`);
            variablesBuilder.push(
              `public static ${d.nameShort}: OwnDaikinDevice = new OwnDaikinDevice('${d.nameShort}', this.roomName, '${d.ipAddress}', undefined);`,
            );
          } else if (d.isSmoke) {
            smoke.push(completeNameWithId);
            initializeBuilder.push(`    ${completeName}.roomName = '${this.nameLong}';`);
          } else if (d.isWater) {
            water.push(completeNameWithId);
            initializeBuilder.push(`    ${completeName}.roomName = '${this.nameLong}';`);
          } else if (d.isHeater) {
            heater.push(completeNameWithId);
          }
          if (d.hasTemperatur) {
            temperatur.push(completeNameWithId);
          }
          if (d.hasHumidity) {
            humidity.push(completeNameWithId);
          }
        }
      }

      groupInitializeBuilder.push(`    const groups: Map<GroupType, BaseGroup> = new Map<GroupType, BaseGroup>();`);
      if (fensterGroupList.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Window, new FensterGroup(${this.className}.roomName, [${fensterGroupList.join(
            ', ',
          )}]));`,
        );
      }
      if (prasenz.length > 0 || beweg.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Presence, new PraesenzGroup(${this.className}.roomName, [${prasenz.join(
            ', ',
          )}], [${beweg.join(', ')}]));`,
        );
      }
      if (taster.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Buttons, new TasterGroup(${this.className}.roomName, [${taster.join(', ')}]));`,
        );
      }
      if (lampe.length > 0 || stecker.length > 0 || led.length > 0 || wled.length) {
        groupInitializeBuilder.push(`    groups.set(GroupType.Light, new LampenGroup(
      ${this.className}.roomName,
      [${lampe.join(', ')}],
      [${stecker.join(', ')}],
      [${led.join(', ')}],
      [${wled.join(', ')}],
    ));`);
      }
      if (smoke.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Smoke, new SmokeGroup(${this.className}.roomName, [${smoke.join(', ')}]));`,
        );
      }
      if (water.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Water, new WaterGroup(${this.className}.roomName, [${water.join(', ')}]));`,
        );
      }
      if (heater.length > 0 || humidity.length > 0 || temperatur.length > 0) {
        groupInitializeBuilder.push(`    groups.set(GroupType.Heating, new HeatGroup(${this.className}.roomName, 
        [${heater.join(', ')}],
        [${temperatur.join(', ')}],
        [${humidity.join(', ')}],
        [${daikin.join(', ')}],
      ));`);
      }
      if (sonos.length > 0) {
        groupInitializeBuilder.push(
          `    groups.set(GroupType.Speaker, new SpeakerGroup(${this.className}.roomName, [${sonos.join(', ')}]));`,
        );
      }
    }
  }

  class Device {
    public idName: string;
    public ipAddress: string = '';
    public setIdName: string;
    public room: string;
    public customName: string | undefined;
    public deviceType: string;
    public deviceClass: string;
    public roomIndex: number;
    public nameShort: string;
    public nameLong: string;
    public isIoBrokerDevice: boolean = false;
    public isFenster: boolean = false;
    public isSonos: boolean = false;
    public isDaikin: boolean = false;
    public isWled: boolean = false;
    public isLampeOrDimmer: boolean = false;
    public isStecker: boolean = false;
    public isLED: boolean = false;
    public isTaster: boolean = false;
    public isRollo: boolean = false;
    public isGriff: boolean = false;
    public isBeweg: boolean = false;
    public isMagnet: boolean = false;
    public isVibra: boolean = false;
    public isPraesenz: boolean = false;
    public isSmoke: boolean = false;
    public isWater: boolean = false;
    public isHeater: boolean = false;
    public hasTemperatur: boolean = false;
    public hasHumidity: boolean = false;
    public fensterNoRolloOnSunrise?: boolean = false;
    public windowID: number | undefined;
    public includeInGroup: boolean;
    public groupN: string[] = [];
    public zusatzParams: undefined | FensterParams;
    public settings?: Partial<DeviceSettings>;
    private defaultName: string;

    public constructor(roomkey: string, deviceDefinition: DeviceModel) {
      this.room = roomkey;
      this.deviceType = deviceDefinition.deviceType;
      const translatedDeviceType: { name: string; deviceClass: string } | undefined = DEVICE_TYPE[this.deviceType];
      if (translatedDeviceType === undefined) {
        throw new Error(`Invalid/Unsuported Device type "${this.deviceType}"`);
      }

      this.deviceClass = translatedDeviceType.deviceClass;
      this.roomIndex = deviceDefinition.indexInRoom;
      this.defaultName = translatedDeviceType.name;
      if (this.roomIndex > 1) {
        this.defaultName += `_${this.roomIndex}`;
      }
      this.customName = deviceDefinition.customName;
      this.nameShort = (this.customName ? this.customName : this.defaultName).replace(/\./g, '_').replace(/ /g, '');

      this.nameLong = `${this.room} ${this.customName !== '' ? this.customName : this.defaultName}`.replace(/_/g, ' ');
      this.windowID = deviceDefinition.windowID;
      this.includeInGroup = deviceDefinition.includeInGroup;
      this.zusatzParams = deviceDefinition.additionalParams;
      this.settings = deviceDefinition.settings;

      this.idName = `id${this.nameShort}`;
      this.setIdName = `set${this.idName.charAt(0).toUpperCase()}${this.idName.substr(1)}`;
      this.ipAddress = deviceDefinition.ipAddress ?? '';
      switch (this.deviceClass) {
        case 'Zigbee':
          this.isIoBrokerDevice = true;
          break;
        case 'HmIP':
          this.isIoBrokerDevice = true;
          break;
        case 'Fenster':
          this.isFenster = true;
          if (this.zusatzParams !== undefined && (this.zusatzParams as FensterParams).noRolloOnSunrise) {
            this.fensterNoRolloOnSunrise = true;
          }
          break;
        case 'Sonos':
          this.isSonos = true;
          break;
        case 'Daikin':
          this.isDaikin = true;
          break;
        case 'Wled':
          this.isWled = true;
          this.isIoBrokerDevice = true;
          break;
        default:
          throw new Error(`${this.deviceClass} is not yet supported for ${this.nameLong}`);
      }

      switch (this.deviceType) {
        case 'HmIpBewegung':
        case 'ZigbeeAquaraMotion':
        case 'ZigbeeSonoffMotion':
          this.isBeweg = true;
          break;
        case 'HmIpPraezenz':
          this.isPraesenz = true;
          break;
        case 'HmIpTaster':
        case 'ZigbeeAqaraOpple3Switch':
          this.isTaster = true;
          break;
        case 'HmIpRoll':
        case 'ZigbeeIlluShutter':
        case 'ZigbeeUbisysShutter':
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
        case 'ZigbeeBlitzShp':
          this.isStecker = true;
          break;
        case 'ZigbeeAqaraMagnetContact':
        case 'ZigbeeSMaBiTMagnetContact':
          this.isMagnet = true;
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
        case 'ZigbeeEuroHeater':
          this.isHeater = true;
          break;
        case 'ZigbeeSonoffTemp':
          this.hasHumidity = true;
          this.hasTemperatur = true;
          break;
      }

      if (this.windowID !== undefined && this.windowID > 0) {
        this.groupN.push(`Fenster_${this.windowID}`);
      } else if (this.includeInGroup) {
        if (this.isBeweg) {
          this.groupN.push(`Beweg`);
        }
        if (this.isPraesenz) {
          this.groupN.push(`Praesenz`);
        }
        if (this.isLampeOrDimmer) {
          this.groupN.push(`Lampe`);
        }
        if (this.isLED) {
          this.groupN.push(`LED`);
        }
        if (this.isStecker) {
          this.groupN.push(`Stecker`);
        }
        if (this.isSonos) {
          this.groupN.push(`Sonos`);
        }
        if (this.isDaikin) {
          this.groupN.push(`Daikin`);
        }
        if (this.isWled) {
          this.groupN.push(`Wled`);
        }
        if (this.isTaster) {
          this.groupN.push(`Taster`);
        }
        if (this.isHeater) {
          this.groupN.push(`Heater`);
        }
        if (this.hasTemperatur || this.hasHumidity) {
          this.groupN.push('Heater');
        }
        if (this.isSmoke) {
          this.groupN.push(`Smoke`);
        }
        if (this.isWater) {
          this.groupN.push(`Water`);
        }
      }
    }
  }

  class Rooms {
    public rooms: { [id: string]: Room } = {};
    private readonly roomEnforcerPath: string = './src/OwnRooms/RoomImportEnforcer.ts';

    public prepareRooms(): void {
      for (const roomName in this.rooms) {
        this.rooms[roomName].prepare();
      }
    }

    constructor(roomDefinitions: RoomModel[]) {
      for (let i = 0; i < roomDefinitions.length; i++) {
        const roomDefinition: RoomModel = roomDefinitions[i];
        const room = new Room(roomDefinition);
        this.rooms[room.nameLong] = room;

        // Add Devices To Room
        this.addDevices(room.nameLong, roomDefinition.devices);
      }
    }

    addDevices(roomKey: string, deviceModels: DeviceModel[]): void {
      for (let i = 0; i < deviceModels.length; i++) {
        const device: Device = new Device(roomKey, deviceModels[i]);
        if (this.rooms[roomKey] === undefined) {
          throw new Error(`Unknown Room ("${roomKey}") within device: ${device.nameLong}`);
        }
        this.rooms[roomKey].addDevice(device);
      }
    }

    createFiles() {
      const roomEnforcerImport: string[] = [
        `import { iRoomImportEnforcer } from 'hoffmation-base/lib';
import { ioBrokerMain } from 'hoffmation-base/lib';`,
      ];
      const roomEnforcerContent: string[] = [
        `
export class RoomImportEnforcer implements iRoomImportEnforcer {
  public addRoomConstructor(): void {`,
      ];
      for (const roomName in this.rooms) {
        const room: Room = this.rooms[roomName];
        room.createFile();
        roomEnforcerImport.push(`import { ${room.className} } from './${room.folderName}/${room.folderName}';`);
        roomEnforcerContent.push(`    ioBrokerMain.addRoomConstructor(${room.className}.roomName, ${room.className});`);
      }

      roomEnforcerContent.push(`  }\n}\n`);
      fs.writeFileSync(this.roomEnforcerPath, `${roomEnforcerImport.join('\n')}\n${roomEnforcerContent.join('\n')}`);
    }
  }

  function main() {
    const roomConfig: RoomConfigModel = config as RoomConfigModel;
    // Create Rooms
    const rooms: Rooms = new Rooms(roomConfig.rooms);
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
