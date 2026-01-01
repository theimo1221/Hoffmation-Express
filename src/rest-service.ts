import cors from 'cors';
import { Express, json, Request, Response, NextFunction, static as expressStatic } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PushNotificationService } from './push-notification-service';
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
  iTemperatureCollector,
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
    
    // Initialize push notification service
    PushNotificationService.initialize();

    this._app.use(
      cors({
        origin: '*',
      }),
    );

    this.app.use(json());

    this._app.listen(config.port, () => {
      ServerLogService.writeLog(LogLevel.Info, `REST service listening at http://localhost:${config.port}`);
    });

    // Serve WebUI static files under /ui (only if enabled in config)
    if (config.webUi) {
      try {
        const webuiPath = path.join(__dirname, '..', 'webui', 'dist');
        // Redirect root to /ui/
        this._app.get('/', (_req, res) => {
          res.redirect('/ui/');
        });
        // Serve static files under /ui
        this._app.use('/ui', expressStatic(webuiPath));
        ServerLogService.writeLog(LogLevel.Info, `WebUI enabled, serving from ${webuiPath} at /ui`);
      } catch (webUiError) {
        ServerLogService.writeLog(LogLevel.Error, `Failed to initialize WebUI: ${webUiError}`);
      }
    }

    this._app.get('/isAlive', (_req, res) => {
      res.send(`Hoffmation-Base active ${new Date()}`);
    });

    this._app.get('/devices', (_req, res) => {
      return res.send(API.getDevices());
    });

    this._app.post('/actuator/:deviceId/restart', (req, res) => {
      const deviceId: string = req.params.deviceId;
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

    this._app.get('/camera/:deviceId/personDetected', (req, res) => {
      API.cameraInformPersonDetected(req.params.deviceId);
      res.status(200);
      return res.send();
    });

    this._app.get('/temperature/:deviceId/history/:startDate?/:endDate?', async (req, res) => {
      const temperatureDevice: iTemperatureCollector | undefined = API.getDevice(req.params.deviceId) as
        | iTemperatureCollector
        | undefined;
      if (temperatureDevice === undefined) {
        res.status(404);
        return res.send();
      }
      const startDate: Date | undefined = req.params.startDate
        ? new Date(parseInt(req.params.startDate, 10))
        : undefined;
      const endDate: Date | undefined = req.params.endDate ? new Date(parseInt(req.params.endDate, 10)) : undefined;
      return res.send(await temperatureDevice.temperatureSensor.getTemperatureHistory(startDate, endDate));
    });

    // WebUI Settings endpoint (readonly)
    this._app.get('/webui/settings', (_req, res) => {
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      try {
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          const settings = JSON.parse(settingsData);
          return res.json(settings);
        } else {
          // Return minimal default if file doesn't exist
          return res.json({ version: '0.0' });
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to read webui-settings.json: ${err.message}`);
        res.status(500);
        return res.json({ error: 'Failed to load WebUI settings', message: err.message });
      }
    });

    // Push Notification: Subscribe
    this._app.post('/webui/push/subscribe', (req, res) => {
      const subscription = req.body;
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      
      try {
        let settings: any = { version: '0.0' };
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          settings = JSON.parse(settingsData);
        }
        
        // Initialize pushSubscriptions array if not exists
        if (!settings.pushSubscriptions) {
          settings.pushSubscriptions = [];
        }
        
        // Check if subscription already exists (by endpoint)
        const existingIndex = settings.pushSubscriptions.findIndex(
          (sub: any) => sub.endpoint === subscription.endpoint
        );
        
        if (existingIndex >= 0) {
          // Update existing subscription
          settings.pushSubscriptions[existingIndex] = subscription;
        } else {
          // Add new subscription
          settings.pushSubscriptions.push(subscription);
        }
        
        // Write back to file
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        ServerLogService.writeLog(LogLevel.Info, `Push subscription saved (${settings.pushSubscriptions.length} total)`);
        
        return res.json({ success: true });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to save push subscription: ${err.message}`);
        res.status(500);
        return res.json({ error: 'Failed to save subscription', message: err.message });
      }
    });

    // Push Notification: Unsubscribe
    this._app.post('/webui/push/unsubscribe', (req, res) => {
      const { endpoint } = req.body;
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      
      try {
        if (!fs.existsSync(settingsPath)) {
          return res.json({ success: true });
        }
        
        const settingsData = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(settingsData);
        
        if (settings.pushSubscriptions) {
          settings.pushSubscriptions = settings.pushSubscriptions.filter(
            (sub: any) => sub.endpoint !== endpoint
          );
          
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
          ServerLogService.writeLog(LogLevel.Info, `Push subscription removed`);
        }
        
        return res.json({ success: true });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to remove push subscription: ${err.message}`);
        res.status(500);
        return res.json({ error: 'Failed to unsubscribe', message: err.message });
      }
    });

    // Push Notification: Get VAPID Public Key
    this._app.get('/webui/push/vapid-public-key', (_req, res) => {
      // VAPID keys should be in webui-settings.json
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      try {
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          const settings = JSON.parse(settingsData);
          
          if (settings.vapidPublicKey) {
            return res.json({ publicKey: settings.vapidPublicKey });
          }
        }
        
        res.status(404);
        return res.json({ error: 'VAPID public key not configured' });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to get VAPID key: ${err.message}`);
        res.status(500);
        return res.json({ error: 'Failed to get VAPID key', message: err.message });
      }
    });

    this._initialized = true;
    for (const handler of this._queuedCustomHandler) {
      this._app.get(handler.path, handler.handler);
    }

    // Bug report endpoint
    this._app.post('/webui/bug-report', (req, res) => {
      try {
        const bugReport = req.body;
        const timestamp = new Date().toISOString();
        const reportWithTimestamp = { ...bugReport, timestamp, id: Date.now().toString() };
        
        const reportsPath = path.join(__dirname, '..', 'config', 'private', 'bug-reports.json');
        let reports: any[] = [];
        
        // Load existing reports
        if (fs.existsSync(reportsPath)) {
          try {
            const data = fs.readFileSync(reportsPath, 'utf-8');
            reports = JSON.parse(data);
          } catch (parseError) {
            ServerLogService.writeLog(LogLevel.Warn, 'Failed to parse bug-reports.json, creating new file');
          }
        }
        
        // Add new report
        reports.push(reportWithTimestamp);
        
        // Save to file
        fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2), 'utf-8');
        
        ServerLogService.writeLog(LogLevel.Info, `Bug report saved: ${bugReport.description?.substring(0, 50)}...`);
        
        return res.json({ success: true, id: reportWithTimestamp.id });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to save bug report: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // Hoffmation service restart endpoint
    // Use process.exit to let systemd handle the restart automatically
    this._app.post('/hoffmation/restart', async (_req, res) => {
      try {
        ServerLogService.writeLog(LogLevel.Info, 'Hoffmation restart requested');

        // Send response before restart (process will be killed)
        res.json({
          success: true,
          message: 'Hoffmation wird neu gestartet... (systemd startet den Service automatisch neu)',
        });

        // Exit process (delayed to allow response to be sent)
        // systemd will automatically restart the service
        setTimeout(() => {
          ServerLogService.writeLog(LogLevel.Info, 'Exiting process for restart (systemd will restart automatically)');
          process.exit(0);
        }, 500);
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Hoffmation restart failed: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // WebUI update endpoint - git pull, npm ci, build
    this._app.post('/webui/update', async (_req, res) => {
      const execAsync = promisify(exec);
      const webuiDir = path.join(__dirname, '..', 'webui');
      const steps: { step: string; success: boolean; output?: string; error?: string }[] = [];

      try {
        ServerLogService.writeLog(LogLevel.Info, 'WebUI update started');

        // Step 1: Git fetch
        try {
          const fetchResult = await execAsync('git fetch', { cwd: path.join(__dirname, '..') });
          steps.push({ step: 'git fetch', success: true, output: fetchResult.stdout.trim() || 'Fetched' });
          ServerLogService.writeLog(LogLevel.Info, `Git fetch: ${fetchResult.stdout.trim() || 'OK'}`);
        } catch (fetchError: unknown) {
          const err = fetchError as { message?: string };
          steps.push({ step: 'git fetch', success: false, error: err.message });
          ServerLogService.writeLog(LogLevel.Error, `Git fetch failed: ${err.message}`);
        }

        // Step 2: Git pull
        try {
          const gitResult = await execAsync('git pull', { cwd: path.join(__dirname, '..') });
          steps.push({ step: 'git pull', success: true, output: gitResult.stdout.trim() });
          ServerLogService.writeLog(LogLevel.Info, `Git pull: ${gitResult.stdout.trim()}`);
        } catch (gitError: unknown) {
          const err = gitError as { message?: string };
          steps.push({ step: 'git pull', success: false, error: err.message });
          ServerLogService.writeLog(LogLevel.Error, `Git pull failed: ${err.message}`);
        }

        // Step 3: npm ci in webui
        try {
          const npmCiResult = await execAsync('npm ci', { cwd: webuiDir, timeout: 300000 });
          steps.push({ step: 'npm ci', success: true, output: 'Dependencies installed' });
          ServerLogService.writeLog(LogLevel.Info, `npm ci completed: ${npmCiResult.stdout.substring(0, 200)}`);
        } catch (npmError: unknown) {
          const err = npmError as { message?: string };
          steps.push({ step: 'npm ci', success: false, error: err.message });
          ServerLogService.writeLog(LogLevel.Error, `npm ci failed: ${err.message}`);
          return res.status(500).json({ success: false, steps });
        }

        // Step 4: Build webui
        try {
          const buildResult = await execAsync('npm run build', { cwd: webuiDir, timeout: 300000 });
          steps.push({ step: 'npm run build', success: true, output: 'Build completed' });
          ServerLogService.writeLog(LogLevel.Info, `Build completed: ${buildResult.stdout.substring(0, 200)}`);
        } catch (buildError: unknown) {
          const err = buildError as { message?: string };
          steps.push({ step: 'npm run build', success: false, error: err.message });
          ServerLogService.writeLog(LogLevel.Error, `Build failed: ${err.message}`);
          return res.status(500).json({ success: false, steps });
        }

        ServerLogService.writeLog(LogLevel.Info, 'WebUI update completed successfully');
        return res.json({ success: true, steps, message: 'WebUI updated. Refresh browser to see changes.' });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `WebUI update failed: ${err.message}`);
        return res.status(500).json({ success: false, steps, error: err.message });
      }
    });

    // SPA fallback - serve index.html for all /ui/* routes (only if WebUI enabled)
    if (config.webUi) {
      this._app.get('/ui/*', (_req, res) => {
        try {
          res.sendFile(path.join(__dirname, '..', 'webui', 'dist', 'index.html'));
        } catch (e) {
          ServerLogService.writeLog(LogLevel.Error, `WebUI SPA fallback error: ${e}`);
          res.status(500).send('WebUI not available');
        }
      });
    }

    // Global error handler - prevents crashes from propagating
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this._app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      ServerLogService.writeLog(LogLevel.Error, `REST API Error: ${err.message}\n${err.stack}`);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });
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
