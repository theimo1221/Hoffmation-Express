import cors from 'cors';
import { Express, json, Request } from 'express';
import {
  AcMode,
  ActuatorSetStateCommand,
  API,
  BlockAutomaticCommand,
  BlockAutomaticLiftBlockCommand,
  CameraDevice,
  CommandSource,
  DimmerSetLightCommand,
  iRestSettings,
  LampSetLightCommand,
  LedSetLightCommand,
  LogLevel,
  ServerLogService,
  ShutterSetLevelCommand,
  Utils,
} from 'hoffmation-base';
import { RequestHandler } from 'express-serve-static-core';

interface CustomHandler {
  path: string;
  handler: RequestHandler[];
}

export class RestService {
  public static addCustomEndpoint(path: string, ...handler: RequestHandler[]) {
    if (this._initialized) {
      this.app.get(path, handler);
      return;
    }
    this._queuedCustomHandler.push({ path, handler });
  }

  public static get app(): Express {
    return this._app;
  }

  private static _app: Express;
  private static _initialized: boolean = false;
  private static _queuedCustomHandler: CustomHandler[] = new Array<CustomHandler>();

  public static initialize(app: Express, config: iRestSettings): void {
    this._app = app;

    this._app.use(
      cors({
        origin: '*',
      }),
    );

    this.app.use(json());

    this._app.listen(config.port, () => {
      ServerLogService.writeLog(LogLevel.Info, `Example app listening at http://localhost:${config.port}`);
    });

    this._app.get('/isAlive', (_req, res) => {
      res.send(`Hoffmation-Base active ${new Date()}`);
    });

    this._app.get('/devices', (_req, res) => {
      return res.send(API.getDevices());
    });

    this._app.post('/restart/actuator', (req, res) => {
      const deviceId: string = req.body.deviceId;
      const clientInfo: string = this.getClientInfo(req);
      return res.send(this.restartDevice(deviceId, clientInfo));
    });

    this._app.get('/devices/:deviceId', (req, res) => {
      return res.send(API.getDevice(req.params.deviceId));
    });

    this._app.get('/log', (_req, res) => {
      return res.send(API.getLog());
    });

    this._app.get('/rooms', (_req, res) => {
      return res.send(Object.fromEntries(API.getRooms()));
    });

    this._app.get('/rooms/:roomId', (req, res) => {
      return res.send(API.getRoom(req.params.roomId));
    });

    this._app.get('/groups/:groupId', (req, res) => {
      return res.send(API.getGroup(req.params.groupId));
    });

    this._app.get('/ac/power/:state', (req, res) => {
      API.setAllAc(req.params.state === 'true');
      res.status(200);
      return res.send();
    });

    this._app.get('/ac/:acId/power/:state', (req, res) => {
      return res.send(API.setAc(req.params.acId, req.params.state === 'true'));
    });

    this._app.get('/ac/:acId/power/:mode/:temp', (req, res) => {
      return res.send(API.setAc(req.params.acId, true, parseInt(req.params.mode) as AcMode, parseInt(req.params.temp)));
    });

    this._app.get('/camera/:cameraId/lastMotionImage', (req, res) => {
      const camera: CameraDevice | undefined = API.getDevice(req.params.cameraId) as CameraDevice | undefined;
      if (camera === undefined) {
        res.status(404);
        return res.send();
      }
      camera.log(LogLevel.Debug, 'API Requested last motion image');
      return res.send(camera.lastImage);
    });

    this._app.get('/lamps/:deviceId/:state/:duration?', (req, res) => {
      const blockCommand: BlockAutomaticCommand | undefined | null = this.getBlockComand(req.params.duration);
      return res.send(
        API.lampSetLight(
          req.params.deviceId,
          new LampSetLightCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            blockCommand,
          ),
        ),
      );
    });

    this._app.get('/actuator/:deviceId/restart', (req, res) => {
      const deviceId: string = req.params.deviceId;
      const clientInfo: string = this.getClientInfo(req);
      return res.send(this.restartDevice(deviceId, clientInfo));
    });

    this._app.get('/actuator/:deviceId/:state/:duration?', (req, res) => {
      const blockCommand: BlockAutomaticCommand | undefined | null = this.getBlockComand(req.params.duration);
      return res.send(
        API.actuatorSetState(
          req.params.deviceId,
          new ActuatorSetStateCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            blockCommand,
          ),
        ),
      );
    });

    this._app.get('/dimmer/:deviceId/:state/:brightness?/:forceDuration?', (req, res) => {
      const blockCommand: BlockAutomaticCommand | undefined | null = this.getBlockComand(req.params.forceDuration);
      const brightness: number | undefined = this.getIntParameter(req.params.brightness, false);
      return res.send(
        API.dimmerSetLight(
          req.params.deviceId,
          new DimmerSetLightCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            blockCommand,
            brightness,
          ),
        ),
      );
    });

    this._app.get('/led/:deviceId/:state/:brightness/:color/:forceDuration?', (req, res) => {
      const blockCommand: BlockAutomaticCommand | undefined | null = this.getBlockComand(req.params.forceDuration);
      return res.send(
        API.ledSetLight(
          req.params.deviceId,
          new LedSetLightCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            blockCommand,
            parseFloat(req.params.brightness),
            undefined,
            req.params.color,
            undefined,
          ),
        ),
      );
    });

    this._app.get('/garageDoor/:deviceId/:state', (req, res) => {
      return res.send(API.switchGarageDoor(req.params.deviceId, req.params.state === 'true'));
    });

    this._app.get('/shutter/:deviceId/:level', (req, res) => {
      return res.send(
        API.shutterSetLevel(
          req.params.deviceId,
          new ShutterSetLevelCommand(CommandSource.API, parseInt(req.params.level), this.getClientInfo(req)),
        ),
      );
    });

    this._app.get('/scene/:deviceId/start/:timeout', (req, res) => {
      const timeout: number | undefined = this.getIntParameter(req.params.timeout, true);
      return res.send(API.startScene(req.params.deviceId, timeout));
    });

    this._app.get('/scene/:deviceId/end', (req, res) => {
      return res.send(API.endScene(req.params.deviceId));
    });

    this._app.post('/speak/:deviceId', (req, res) => {
      return res.send(API.speakOnDevice(req.params.deviceId, req.body.message, req.body.volume));
    });

    this._app.post('/deviceSettings/:deviceId', (req, res) => {
      return res.send(API.setDeviceSettings(req.params.deviceId, req.body.settings));
    });

    this._app.post('/roomSettings/:roomName', (req, res) => {
      return res.send(API.setRoomSettings(req.params.roomName, req.body.settings));
    });

    this._app.post('/groupSettings/:groupId', (req, res) => {
      return res.send(API.setGroupSettings(req.params.groupId, req.body.settings));
    });

    this._app.get('/deviceSettings/persist', (_req, res) => {
      API.persistAllDeviceSettings();
      res.status(200);
      return res.send();
    });

    this._app.get('/deviceSettings/restore', (_req, res) => {
      API.loadAllDeviceSettingsFromDb();
      res.status(200);
      return res.send();
    });

    this._app.get('/device/:deviceId/liftAutomaticBlock', (req, res) => {
      API.blockAutomaticLiftAutomaticBlock(
        req.params.deviceId,
        new BlockAutomaticLiftBlockCommand(CommandSource.API, this.getClientInfo(req)),
      );
      res.status(200);
      return res.send();
    });

    this._app.get('/device/:deviceId/blockAutomatic/:timeout', (req, res) => {
      const timeout: number | undefined = this.getIntParameter(req.params.timeout, true);
      API.blockAutomaticSetBlock(
        req.params.deviceId,
        new BlockAutomaticCommand(CommandSource.API, timeout ?? 60 * 60 * 1000, this.getClientInfo(req)),
      );
      res.status(200);
      return res.send();
    });

    this._app.get('/camera/:deviceId/image', (req, res) => {
      return res.send(API.getLastCameraImage(req.params.deviceId));
    });

    this._initialized = true;
    for (const handler of this._queuedCustomHandler) {
      this._app.get(handler.path, handler.handler);
    }
  }

  private static restartDevice(deviceId: string, clientInfo: string): Error | null {
    const result: Error | null = API.actuatorSetState(
      deviceId,
      new ActuatorSetStateCommand(CommandSource.API, false, `Restart-Off: ${clientInfo}`, null),
    );
    if (result !== null) {
      return result;
    }
    Utils.guardedTimeout(() => {
      API.actuatorSetState(
        deviceId,
        new ActuatorSetStateCommand(CommandSource.API, true, `Restart-On: ${clientInfo}`, null),
      );
    }, 5000);
    return null;
  }

  private static getClientInfo(req: Request): string {
    return `Client (user-agent: "${req.headers['user-agent']}", ip: ${req.ip}, endpoint: ${req.path})`;
  }

  private static getBlockComand(timeoutParameter: string | undefined): BlockAutomaticCommand | undefined | null {
    const timeout: number | undefined = this.getIntParameter(timeoutParameter, false);
    if (timeout === undefined) {
      return undefined;
    }
    if (timeout < 0) {
      return null;
    }
    return new BlockAutomaticCommand(CommandSource.API, timeout, 'API timeout duration given');
  }

  private static getIntParameter(
    parameterValue: string | undefined,
    negativeAsUndefined: boolean = false,
  ): number | undefined {
    if (parameterValue === undefined) {
      return undefined;
    }
    const parsedValue = parseInt(parameterValue);
    if (isNaN(parsedValue)) {
      return undefined;
    }
    if (negativeAsUndefined && parsedValue < 0) {
      return undefined;
    }
    return parsedValue;
  }
}
