import {
  HoffmationInitializationObject,
  PostgreSqlPersist, Res,
  SettingsService, LogLevel, ServerLogService
} from 'hoffmation-base';
import config from '../../config/private/mainConfig.json';

export async function pgTest(): Promise<void> {
  const initObject = new HoffmationInitializationObject(config);
  SettingsService.initialize(initObject.config);
  Res.initialize(initObject.config.translationSettings);
  if (initObject.config.logSettings) {
    ServerLogService.initialize(initObject.config.logSettings);
  }
  ServerLogService.writeLog(LogLevel.Info, `Desired Postgres Settings: ${JSON.stringify(initObject.config.persistence?.postgreSql)}`)
  ServerLogService.writeLog(LogLevel.Info, `Going to construct PostgresSqlPersist`);
  let dbo = new PostgreSqlPersist(initObject.config.persistence!);
  ServerLogService.writeLog(LogLevel.Info, `Going to initialize PostgresSqlPersist`);
  await dbo?.initialize();
  ServerLogService.writeLog(LogLevel.Info, `PostgresSqlPersist is initialized`);
  process.exit(1);
}

void pgTest();

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});
