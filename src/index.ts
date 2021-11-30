import express, {Express} from "express";
import {deviceConfig, Devices, HoffmationBase, HoffmationInitializationObject, OwnSonosDevice} from "hoffmation-base";
import devJson from '../config/private/devices.json';
import config from '../config/private/mainConfig.json';
import { RoomImportEnforcer } from './OwnRooms/RoomImportEnforcer';

/*** Place your custom imports here ***/

import { room_1_buero } from './OwnRooms/1_buero/1_buero';

/*** Custom Import end ***/

export class Hoffmation {
    public static readonly app: Express = express();

    public static async start() {

        /*** Place your custom initialization Code here ***/

        const defaultMuellSonos: OwnSonosDevice | undefined = room_1_buero.SNBüro;

        /*** Custom initialization end ***/

        await HoffmationBase.initializeBeforeIoBroker(new HoffmationInitializationObject(config, this.app));
        const devices: Devices = new Devices(devJson as { [id: string]: deviceConfig }, new RoomImportEnforcer());
        HoffmationBase.startIoBroker(devices);
        HoffmationBase.initializePostIoBroker(defaultMuellSonos);

        /*** Place your custom post initialization logic here ***/



        /*** Custom post initialization end ***/
    }
}

Hoffmation.start();
