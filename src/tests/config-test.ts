import {
  Devices,
  HeatingMode,
  HoffmationBase,
  HoffmationInitializationObject,
  iDeviceConfig,
} from 'hoffmation-base/lib';
import devJson from '../../config/private/devices.json';
import config from '../../config/private/mainConfig.json';
import { RoomImportEnforcer } from '../OwnRooms/RoomImportEnforcer';
import { SettingsService } from 'hoffmation-base';

export class ConfigTest {
  public static async start(): Promise<void> {
    const init = new HoffmationInitializationObject(config);
    init.config.telegram = undefined;
    init.config.polly = undefined;
    init.config.persistence = undefined;
    init.config.muell = undefined;
    await HoffmationBase.initializeBeforeIoBroker(init);
    new Devices(devJson as { [id: string]: iDeviceConfig }, new RoomImportEnforcer(), config);
    console.log(`Devices amount: ${Object.keys(Devices.alLDevices).length}`);
    if (SettingsService.heatMode === HeatingMode.Winter) {
      console.log(`Desired Heating Mode Winter`);
    } else if (SettingsService.heatMode === HeatingMode.Summer) {
      console.log(`Desired Heating Mode Summer`);
    }
    // const updater = new DeviceUpdater();
    // updater.updateState(
    //   'klf200.0.products.0.currentPosition',
    //   {
    //     ts: Date.now(),
    //     lc: Date.now(),
    //     from: 'internal',
    //     val: 50,
    //     ack: true,
    //   },
    //   false,
    // );
    // setTimeout(() => {
    //   process.exit(1);
    // }, 5000);
    process.exit(1);
  }
}

void ConfigTest.start();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
