import {
  deviceConfig,
  Devices,
  HeatingMode,
  HoffmationBase,
  HoffmationInitializationObject
} from "hoffmation-base/lib";
import devJson from "../../config/private/devices.json";
import config from "../../config/private/mainConfig.json";
import { RoomImportEnforcer } from "../OwnRooms/RoomImportEnforcer";
import { SettingsService } from "hoffmation-base";

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
    if (SettingsService.heatMode === HeatingMode.Winter) {
      console.log(`Desired Heating Mode Winter`);
    } else if (SettingsService.heatMode === HeatingMode.Sommer) {
      console.log(`Desired Heating Mode Summer`);
    }
    process.exit(1);
  }
}

void ConfigTest.start();

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
