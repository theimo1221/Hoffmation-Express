import cors from 'cors';
import { Express } from 'express';
import { API, iRestSettings, LogLevel, ServerLogService } from 'hoffmation-base';
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
  private static _initialized: boolean;
  private static _queuedCustomHandler: CustomHandler[] = new Array<CustomHandler>();

  public static initialize(app: Express, config: iRestSettings): void {
    this._app = app;

    this._app.use(
      cors({
        origin: '*',
      }),
    );

    this._app.listen(config.port, () => {
      ServerLogService.writeLog(LogLevel.Info, `Example app listening at http://localhost:${config.port}`);
    });

    this._app.get('/isAlive', (_req, res) => {
      res.send(`Hoffmation-Base active ${new Date()}`);
    });

    this._app.get('/devices', (_req, res) => {
      return res.send(API.getDevices());
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

    this._app.get('/ac/power/:state', (req, res) => {
      API.setAllAc(req.params.state === 'true');
      res.status(200);
      return res.send();
    });

    this._app.get('/ac/:acId/power/:state', (req, res) => {
      return res.send(API.setAc(req.params.acId, req.params.state === 'true'));
    });

    this._app.get('/lamps/:deviceId/:state', (req, res) => {
      return res.send(API.setLight(req.params.deviceId, req.params.state === 'true'));
    });
    this._initialized = true;
    for (const handler of this._queuedCustomHandler) {
      this._app.get(handler.path, handler.handler);
    }
  }
}
