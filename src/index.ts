import express, { Express } from 'express';
import {
  Devices,
  HoffmationBase,
  HoffmationInitializationObject,
  iDeviceConfig,
  OwnSonosDevice,
  SettingsService,
} from 'hoffmation-base/lib';
import devJson from '../config/private/devices.json';
import config from '../config/private/mainConfig.json';
import { RoomImportEnforcer } from './OwnRooms/RoomImportEnforcer';

/*** Place your custom imports here ***/

import { RestService } from './rest-service';

/*** Custom Import end ***/

export class Hoffmation {
  public static readonly app: Express = express();
  public static readonly initializationData = new HoffmationInitializationObject(config);

  public static async start(): Promise<void> {
    /*** Place your custom initialization Code here ***/

    const defaultMuellSonos: OwnSonosDevice | undefined = undefined;

    /*** Custom initialization end ***/

    await HoffmationBase.initializeBeforeIoBroker(this.initializationData);
    const devices: Devices = new Devices(devJson as { [id: string]: iDeviceConfig }, new RoomImportEnforcer(), config);
    HoffmationBase.initializePostRoomCreationBeforeIoBroker();
    HoffmationBase.startIoBroker(devices);
    HoffmationBase.initializePostIoBroker(defaultMuellSonos);

    if (SettingsService.settings.restServer?.active) {
      RestService.initialize(this.app, SettingsService.settings.restServer);
    }

    /*** Place your custom post initialization logic here ***/

    /*** Custom post initialization end ***/
  }
}

void Hoffmation.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
