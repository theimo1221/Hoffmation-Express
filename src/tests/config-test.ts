import { deviceConfig, Devices, HoffmationBase, HoffmationInitializationObject } from 'hoffmation-base/lib';
import devJson from '../../config/private/devices.json';
import config from '../../config/private/mainConfig.json';
import { RoomImportEnforcer } from '../OwnRooms/RoomImportEnforcer';

export class ConfigTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);
    new Devices(devJson as { [id: string]: deviceConfig }, new RoomImportEnforcer());
    console.log(`Devices amount: ${Object.keys(Devices.alLDevices).length}`);
    process.exit(1);
  }
}

void ConfigTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
