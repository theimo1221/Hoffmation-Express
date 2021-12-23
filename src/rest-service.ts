import { Express } from 'express';
import { API, iRestSettings, LogLevel, ServerLogService } from 'hoffmation-base';

export class RestService {
  private static _app: Express;

  public static initialize(app: Express, config: iRestSettings): void {
    this._app = app;

    this._app.listen(config.port, () => {
      ServerLogService.writeLog(LogLevel.Info, `Example app listening at http://localhost:${config.port}`);
    });
    
    this._app.get('/isAlive', (_req, res) => {
      res.send(`Hoffmation-Base active ${new Date()}`);
    });

    this._app.get('/devices', (_req, res) => {
      return res.send(API.getDevices());
    });

    this._app.get('/device/:deviceId', (req, res) => {
      return res.send(API.getDevice(req.params.deviceId));
    });

    this._app.get('/rooms', (_req, res) => {
      return res.send(API.getRooms());
    });

    this._app.get('/rooms/:roomId', (req, res) => {
      return res.send(API.getRoom(req.params.roomId));
    });
  }
}
