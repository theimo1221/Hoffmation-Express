import * as crypto from 'crypto';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Express, json, Request, Response, NextFunction, static as expressStatic } from 'express';
import { AuthService, type Principal } from './auth-service';
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

const PROCESS_START = Date.now();
const BOOTSTRAP_WINDOW_MS = 15 * 60_000;

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

  public static async initialize(app: Express, config: iRestSettings): Promise<void> {
    this._app = app;

    // Trust one proxy hop so req.ip reflects X-Forwarded-For from Caddy/nginx, not the proxy socket IP.
    this._app.set('trust proxy', 1);

    // Initialize push notification service
    PushNotificationService.initialize();

    this._app.use(
      cors({
        origin: '*',
      }),
    );

    this.app.use(json());

    this._app.use(cookieParser());
    await AuthService.init();

    const OPEN = [
      /^\/isAlive/,
      /^\/auth\/(login|logout|status|mobile-session|redeem)$/,
      /^\/$/,
      /^\/ui(\/|$)/,
      /^\/favicon/,
    ];

    const requireScope = (scope: string) => (req: Request, res: Response, next: NextFunction) => {
      const p = req.principal;
      if (!p) return res.status(401).json({ error: 'unauthorized' });
      if (!Array.isArray(p.scope) || !p.scope.includes(scope)) {
        ServerLogService.writeLog(LogLevel.Warn, `SCOPE-DENY: principal=${p.name} required=${scope} has=${JSON.stringify(p.scope)}`);
        return res.status(403).json({ error: 'forbidden-scope' });
      }
      return next();
    };

    const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
      // Onboarding window: allow the very first admin to be created without credentials.
      // Conditions: no active admin exists yet, within 15min of process start, POST /auth/users with role=admin only.
      if (
        AuthService.needsBootstrap &&
        Date.now() - PROCESS_START < BOOTSTRAP_WINDOW_MS &&
        req.method === 'POST' &&
        req.path === '/auth/users' &&
        req.body?.role === 'admin'
      ) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `AUTH-BOOTSTRAP: first admin '${req.body?.username}' created from ${req.ip}`,
        );
        return next();
      }
      const p = req.principal;
      if (!p || p.role !== 'admin') {
        ServerLogService.writeLog(LogLevel.Warn, `AUTH-ADMIN-DENY: ip=${req.ip} path=${req.path}`);
        return res.status(p ? 403 : 401).json({ error: p ? 'forbidden' : 'unauthorized' });
      }
      return next();
    };

    this._app.use((req, res, next) => {
      if (!AuthService.enabled) return next();
      if (OPEN.some((re) => re.test(req.path))) return next();

      let principal: Principal | null = null;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        principal = AuthService.resolveToken(req.headers.authorization.slice(7));
      } else if (req.cookies?.hf_sid) {
        principal = AuthService.resolveSession(req.cookies.hf_sid);
      } else if (typeof req.query.code === 'string') {
        const queryPrincipal = AuthService.resolveToken(req.query.code);
        if (queryPrincipal && queryPrincipal.role === 'webhook') {
          principal = { ...queryPrincipal, via: 'query' };
        }
      }
      req.principal = principal || undefined;

      const enforced = AuthService.mode === 'enforced';

      if (!principal) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `AUTH-${enforced ? 'BLOCK' : 'WOULD-BLOCK'}: ip=${req.ip} ua="${req.headers['user-agent']}" path=${req.path}`,
        );
        return enforced ? res.status(401).json({ error: 'unauthorized' }) : next();
      }
      if (!AuthService.roleAllows(principal.role, req.path)) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `AUTH-FORBIDDEN role=${principal.role} principal=${principal.name} path=${req.path}`,
        );
        if (enforced) return res.status(403).json({ error: 'forbidden' });
      }
      const seg = req.path.split('/').filter(Boolean);
      const endpointPrefix = seg[0];
      const deviceId = seg[1];
      if (endpointPrefix && deviceId && !AuthService.mayControlEndpoint(principal, endpointPrefix, deviceId)) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `AUTHZ-${enforced ? 'DENY' : 'WOULD-DENY'}: principal=${principal.name} endpoint=${endpointPrefix} device=${deviceId}`,
        );
        if (enforced) return res.status(403).json({ error: 'forbidden-room-or-class' });
      }
      return next();
    });

    this._app.post('/auth/login', (req, res) => {
      const result = AuthService.login(req.body.username, req.body.password, req.ip);
      if (!result) {
        ServerLogService.writeLog(LogLevel.Warn, `AUTH-LOGIN-FAIL user=${req.body.username} ip=${req.ip}`);
        return res.status(401).json({ error: 'invalid credentials' });
      }
      // secure:true if behind TLS (X-Forwarded-Proto: https) or HF_SECURE_COOKIES=true
      const secureCookies = process.env.HF_SECURE_COOKIES === 'true' || req.headers['x-forwarded-proto'] === 'https';
      const maxAge = AuthService.sessionTtlMs;
      res.cookie('hf_sid', result.sid, { httpOnly: true, sameSite: 'strict', secure: secureCookies, maxAge });
      res.cookie('hf_role', result.role, { httpOnly: false, sameSite: 'strict', secure: secureCookies, maxAge });
      return res.json({ success: true, role: result.role });
    });
    this._app.post('/auth/logout', (req, res) => {
      if (req.cookies?.hf_sid) AuthService.logout(req.cookies.hf_sid);
      res.clearCookie('hf_sid');
      res.clearCookie('hf_role');
      return res.json({ success: true });
    });

    // One-time registration token redemption: QR code → raw bearer token for the device.
    this._app.post('/auth/redeem', async (req, res) => {
      const { registrationToken } = req.body as { registrationToken?: unknown };
      if (!registrationToken || typeof registrationToken !== 'string') {
        return res.status(400).json({ error: 'registrationToken required' });
      }
      const rawBearerToken = AuthService.redeemRegistrationToken(registrationToken);
      if (!rawBearerToken) return res.status(401).json({ error: 'invalid or expired registration token' });
      ServerLogService.writeLog(LogLevel.Info, `AUTH-REDEEM: registration token redeemed from ${req.ip}`);
      return res.json({ token: rawBearerToken });
    });

    // Exchange a named bearer token (e.g. "Thiemo-iPhone") for a session cookie.
    // The token is created in the admin panel and transferred to the device once.
    this._app.post('/auth/mobile-session', (req, res) => {
      const { token } = req.body as { token?: unknown };
      if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });
      const result = AuthService.tokenToSession(token);
      if (!result) return res.status(401).json({ error: 'invalid or expired token' });
      const secureCookies = process.env.HF_SECURE_COOKIES === 'true' || req.headers['x-forwarded-proto'] === 'https';
      const maxAge = AuthService.sessionTtlMs;
      res.cookie('hf_sid', result.sid, { httpOnly: true, sameSite: 'strict', secure: secureCookies, maxAge });
      res.cookie('hf_role', result.role, { httpOnly: false, sameSite: 'strict', secure: secureCookies, maxAge });
      ServerLogService.writeLog(LogLevel.Info, `AUTH-MOBILE-SESSION: token exchange from ${req.ip}`);
      return res.json({ success: true, role: result.role });
    });

    // Open endpoint — tells the UI whether it needs to show the onboarding form or a guest button.
    this._app.get('/auth/status', (_req, res) => {
      return res.json({ needsBootstrap: AuthService.needsBootstrap, mode: AuthService.mode });
    });

    // Self-service password change: any authenticated non-webhook user, currentPassword required.
    this._app.post('/auth/me/password', async (req, res) => {
      const p = req.principal;
      if (!p) return res.status(401).json({ error: 'unauthorized' });
      if (p.role === 'webhook') return res.status(403).json({ error: 'forbidden' });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'currentPassword required' });
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ error: 'invalid newPassword (min 4 chars)' });
      }
      if (!AuthService.verifyPassword(p.name, currentPassword)) {
        return res.status(401).json({ error: 'wrong current password' });
      }
      const cur = AuthService.getUserForPatch(p.name);
      if (!cur) return res.status(404).json({ error: 'user not found' });
      await AuthService.upsertUser({ ...cur, pwHash: AuthService.hashPw(newPassword) });
      ServerLogService.writeLog(LogLevel.Info, `AUTH: user '${p.name}' changed own password from ${req.ip}`);
      return res.json({ success: true });
    });

    this._app.get('/auth/mode', requireAdmin, (_req, res) => res.json({ mode: AuthService.mode }));

    this._app.get('/auth/users', requireAdmin, (_req, res) => res.json(AuthService.listUsers()));
    this._app.post('/auth/users', requireAdmin, async (req, res) => {
      const { username, password, role, deny, scope } = req.body;
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: 'invalid username' });
      }
      if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({ error: 'invalid password (min 4 chars)' });
      }
      if (!['admin', 'control', 'webhook'].includes(role)) {
        return res.status(400).json({ error: 'invalid role' });
      }
      await AuthService.upsertUser({
        username: username.trim(),
        role,
        pwHash: AuthService.hashPw(password),
        deny: deny ?? {},
        disabled: false,
        scope: Array.isArray(scope) ? scope : null,
      });
      return res.json({ success: true });
    });
    this._app.patch('/auth/users/:name', requireAdmin, async (req, res) => {
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      const cur = AuthService.getUserForPatch(name);
      if (!cur) return res.status(404).json({ error: 'not found' });
      const body = req.body;
      if (body.role && !['admin', 'control', 'webhook'].includes(body.role)) {
        return res.status(400).json({ error: 'invalid role' });
      }
      if (body.password && (typeof body.password !== 'string' || body.password.length < 4)) {
        return res.status(400).json({ error: 'invalid password (min 4 chars)' });
      }
      await AuthService.upsertUser({
        username: name,
        role: body.role ?? cur.role,
        deny: body.deny ?? cur.deny ?? {},
        disabled: body.disabled ?? cur.disabled ?? false,
        pwHash: body.password ? AuthService.hashPw(body.password) : cur.pwHash,
        scope: 'scope' in body ? (body.scope ?? null) : (cur.scope ?? null),
        lastLogin: cur.lastLogin,
      });
      return res.json({ success: true });
    });
    this._app.delete('/auth/users/:name', requireAdmin, async (req, res) => {
      const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
      await AuthService.deleteUser(name);
      return res.json({ success: true });
    });

    this._app.get('/auth/tokens', requireAdmin, (_req, res) => res.json(AuthService.listTokens()));
    this._app.post('/auth/tokens', requireAdmin, async (req, res) => {
      const { label, role, deny, scope } = req.body;
      if (!label || typeof label !== 'string' || label.trim().length === 0) {
        return res.status(400).json({ error: 'invalid label' });
      }
      if (!['admin', 'control', 'webhook'].includes(role)) {
        return res.status(400).json({ error: 'invalid role' });
      }
      const { rawRegToken, rawBearerToken } = await AuthService.createRegistrationToken(
        label.trim(),
        role,
        deny,
        scope,
      );
      return res.json({
        label: label.trim(),
        token: rawBearerToken,
        registrationToken: rawRegToken,
        note: 'QR-Code einmalig einlösbar (15 min), Token nur einmal sichtbar',
      });
    });
    this._app.patch('/auth/tokens/:label', requireAdmin, async (req, res) => {
      const label = Array.isArray(req.params.label) ? req.params.label[0] : req.params.label;
      const cur = AuthService.getTokenForPatch(label);
      if (!cur) return res.status(404).json({ error: 'not found' });
      const body = req.body;
      if (body.role && !['admin', 'control', 'webhook'].includes(body.role)) {
        return res.status(400).json({ error: 'invalid role' });
      }
      await AuthService.patchToken(label, {
        role: body.role ?? cur.role,
        deny: body.deny ?? cur.deny ?? {},
        disabled: body.disabled ?? cur.disabled ?? false,
        scope: 'scope' in body ? (body.scope ?? null) : (cur.scope ?? null),
      });
      return res.json({ success: true });
    });
    this._app.delete('/auth/tokens/:label', requireAdmin, async (req, res) => {
      const label = Array.isArray(req.params.label) ? req.params.label[0] : req.params.label;
      await AuthService.revokeToken(label);
      return res.json({ success: true });
    });

    this._app.post('/auth/mode', requireAdmin, async (req, res) => {
      const { mode } = req.body;
      if (!['optional', 'enforced'].includes(mode)) {
        return res.status(400).json({ error: 'invalid mode (must be optional or enforced)' });
      }
      await AuthService.setMode(mode);
      return res.json({ mode });
    });

    // ── Cockpit endpoints ─────────────────────────────────────────────────────
    const COCKPIT_DIR = path.join(__dirname, '..', 'config', 'private');
    const COCKPIT_ID_PATTERN = /^(G|H|P|Ph)-\d+[a-z]?$/;

    const readCockpitJson = async (filename: string): Promise<unknown | null> => {
      try {
        const raw = await fs.promises.readFile(path.join(COCKPIT_DIR, filename), 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') ServerLogService.writeLog(LogLevel.Warn, `COCKPIT-READ-ERR: ${filename}: ${err}`);
        return null;
      }
    };

    const writeCockpitJson = async (filename: string, data: unknown): Promise<void> => {
      try {
        await fs.promises.writeFile(path.join(COCKPIT_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        ServerLogService.writeLog(LogLevel.Warn, `COCKPIT-WRITE-ERR: ${filename}: ${err}`);
        throw err;
      }
    };

    // Atomic write: write to .tmp then rename so a crash mid-write never corrupts the live file.
    const writeCockpitJsonAtomic = async (filename: string, data: unknown): Promise<void> => {
      const target = path.join(COCKPIT_DIR, filename);
      const tmp = target + '.tmp';
      try {
        await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
        await fs.promises.rename(tmp, target);
      } catch (err) {
        ServerLogService.writeLog(LogLevel.Warn, `COCKPIT-WRITE-ATOMIC-ERR: ${filename}: ${err}`);
        await fs.promises.unlink(tmp).catch(() => undefined);
        throw err;
      }
    };

    this._app.get('/cockpit/data', requireScope('cockpit'), async (_req, res) => {
      const data = await readCockpitJson('cockpit-data.json');
      if (!data) return res.status(503).json({ error: 'data unavailable' });
      return res.json(data);
    });

    this._app.get('/cockpit/archive', requireScope('cockpit'), async (_req, res) => {
      const data = await readCockpitJson('cockpit-archive.json');
      if (!data) return res.status(503).json({ error: 'data unavailable' });
      return res.json(data);
    });

    this._app.get('/cockpit/config', requireScope('cockpit'), async (_req, res) => {
      const data = await readCockpitJson('cockpit-config.json');
      if (!data) return res.status(503).json({ error: 'data unavailable' });
      return res.json(data);
    });

    this._app.get('/cockpit/inbox', requireScope('cockpit'), async (_req, res) => {
      const raw = await readCockpitJson('cockpit-inbox.json');
      return res.json(Array.isArray(raw) ? raw : []);
    });

    this._app.post('/cockpit/inbox', requireScope('cockpit'), async (req, res) => {
      const { kind, ref, text } = req.body as { kind?: unknown; ref?: unknown; text?: unknown };
      if (!['note', 'answer', 'done', 'new'].includes(kind as string)) {
        return res.status(400).json({ error: 'invalid kind' });
      }
      if (ref !== undefined && (typeof ref !== 'string' || !COCKPIT_ID_PATTERN.test(ref))) {
        return res.status(400).json({ error: 'invalid ref' });
      }
      if (typeof text !== 'string' || text.length === 0 || text.length > 2000) {
        return res.status(400).json({ error: 'invalid text' });
      }

      let inbox: Array<Record<string, unknown>> = [];
      const raw = await readCockpitJson('cockpit-inbox.json');
      if (Array.isArray(raw)) inbox = raw as Array<Record<string, unknown>>;

      const entry: Record<string, unknown> = {
        id: crypto.randomBytes(8).toString('hex'),
        kind,
        text,
        ts: new Date().toISOString(),
        by: req.principal?.name ?? 'unknown',
      };
      if (ref !== undefined) entry.ref = ref;
      inbox.push(entry);

      try {
        await writeCockpitJson('cockpit-inbox.json', inbox);
      } catch {
        return res.status(503).json({ error: 'write failed' });
      }
      ServerLogService.writeLog(LogLevel.Info, `COCKPIT-INBOX: kind=${kind} ref=${ref ?? '-'} by=${req.principal?.name}`);
      return res.json({ success: true, id: entry.id });
    });

    this._app.post('/cockpit/inbox/ack', requireScope('cockpit'), async (req, res) => {
      const { through_id } = req.body as { through_id?: unknown };
      if (!through_id || typeof through_id !== 'string') {
        return res.status(400).json({ error: 'through_id required' });
      }

      let inbox: Array<Record<string, unknown>> = [];
      const rawInbox = await readCockpitJson('cockpit-inbox.json');
      if (Array.isArray(rawInbox)) inbox = rawInbox as Array<Record<string, unknown>>;

      const idx = inbox.findIndex((e) => e.id === through_id);
      if (idx === -1) return res.json({ success: true, archived: 0 });

      const toArchive = inbox.slice(0, idx + 1);
      const remaining = inbox.slice(idx + 1);

      let archive: Array<unknown> = [];
      const rawArchive = await readCockpitJson('cockpit-inbox-archive.json');
      if (Array.isArray(rawArchive)) archive = rawArchive;
      archive.push(...toArchive);

      try {
        await writeCockpitJson('cockpit-inbox-archive.json', archive);
        await writeCockpitJson('cockpit-inbox.json', remaining);
      } catch {
        return res.status(503).json({ error: 'write failed' });
      }
      return res.json({ success: true, archived: toArchive.length });
    });
    const SNAPSHOT_FILES: Record<string, string> = {
      data: 'cockpit-data.json',
      projects: 'cockpit-projects.json',
      archive: 'cockpit-archive.json',
      config: 'cockpit-config.json',
    };

    this._app.put(
      '/cockpit/snapshot/:name',
      json({ limit: '5mb' }),
      requireScope('cockpit:deploy'),
      async (req, res) => {
        const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
        const filename = SNAPSHOT_FILES[name];
        if (!filename) return res.status(400).json({ error: `unknown snapshot name: ${name}` });

        const body = req.body as Record<string, unknown>;
        if (typeof body !== 'object' || body === null || !('schema_version' in body)) {
          return res.status(400).json({ error: 'body must be JSON with schema_version' });
        }

        try {
          await writeCockpitJsonAtomic(filename, body);
        } catch {
          return res.status(503).json({ error: 'write failed' });
        }
        ServerLogService.writeLog(LogLevel.Info, `COCKPIT-SNAPSHOT: name=${name} by=${req.principal?.name}`);
        return res.json({ success: true, name });
      },
    );
    // ── End cockpit endpoints ─────────────────────────────────────────────────

    if (!process.env.HOFFMATION_TESTMODE) {
      this._app.listen(config.port, () => {
        ServerLogService.writeLog(LogLevel.Info, `REST service listening at http://localhost:${config.port}`);
      });
    }

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

    this._app.get('/ac/power/:state', requireAdmin, (req, res) => {
      API.setAllAc(req.params.state === 'true');
      res.status(200);
      return res.send();
    });

    this._app.get('/ac/:acId/power/:state', (req, res) => {
      return res.send(API.setAc(req.params.acId, req.params.state === 'true'));
    });

    this._app.get('/ac/:acId/power/:mode/:temp', (req, res) => {
      return res.send(
        API.setAc(req.params.acId, true, parseInt(req.params.mode) as AcMode, parseFloat(req.params.temp)),
      );
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

    this._app.get('/lamps/:deviceId/:state/:duration', (req, res) => {
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

    this._app.get('/lamps/:deviceId/:state', (req, res) => {
      return res.send(
        API.lampSetLight(
          req.params.deviceId,
          new LampSetLightCommand(CommandSource.API, req.params.state === 'true', this.getClientInfo(req)),
        ),
      );
    });

    this._app.get('/actuator/:deviceId/restart', (req, res) => {
      const deviceId: string = req.params.deviceId;
      const clientInfo: string = this.getClientInfo(req);
      return res.send(this.restartDevice(deviceId, clientInfo));
    });

    this._app.get('/actuator/:deviceId/:state/:duration', (req, res) => {
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

    this._app.get('/actuator/:deviceId/:state', (req, res) => {
      return res.send(
        API.actuatorSetState(
          req.params.deviceId,
          new ActuatorSetStateCommand(CommandSource.API, req.params.state === 'true', this.getClientInfo(req)),
        ),
      );
    });

    this._app.get('/dimmer/:deviceId/:state/:brightness/:forceDuration', (req, res) => {
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

    this._app.get('/dimmer/:deviceId/:state/:brightness', (req, res) => {
      const brightness: number | undefined = this.getIntParameter(req.params.brightness, false);
      return res.send(
        API.dimmerSetLight(
          req.params.deviceId,
          new DimmerSetLightCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            undefined,
            brightness,
          ),
        ),
      );
    });

    this._app.get('/dimmer/:deviceId/:state', (req, res) => {
      return res.send(
        API.dimmerSetLight(
          req.params.deviceId,
          new DimmerSetLightCommand(CommandSource.API, req.params.state === 'true', this.getClientInfo(req)),
        ),
      );
    });

    this._app.get('/led/:deviceId/:state/:brightness/:color/:forceDuration', (req, res) => {
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

    this._app.get('/led/:deviceId/:state/:brightness/:color', (req, res) => {
      return res.send(
        API.ledSetLight(
          req.params.deviceId,
          new LedSetLightCommand(
            CommandSource.API,
            req.params.state === 'true',
            this.getClientInfo(req),
            undefined,
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

    this._app.get('/deviceSettings/persist', requireAdmin, (_req, res) => {
      API.persistAllDeviceSettings();
      res.status(200);
      return res.send();
    });

    this._app.get('/deviceSettings/restore', requireAdmin, (_req, res) => {
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

    this._app.get('/temperature/:deviceId/history/:startDate/:endDate', async (req, res) => {
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

    this._app.get('/temperature/:deviceId/history', async (req, res) => {
      const temperatureDevice: iTemperatureCollector | undefined = API.getDevice(req.params.deviceId) as
        | iTemperatureCollector
        | undefined;
      if (temperatureDevice === undefined) {
        res.status(404);
        return res.send();
      }
      return res.send(await temperatureDevice.temperatureSensor.getTemperatureHistory(undefined, undefined));
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
          // Return default settings with empty floors array if file doesn't exist
          return res.json({ version: '1.0', floors: [] });
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to read webui-settings.json: ${err.message}`);
        // Return default settings on error
        return res.json({ version: '1.0', floors: [] });
      }
    });

    // WebUI Settings: Write (admin only, merges with existing to preserve push subscriptions)
    this._app.post('/webui/settings', requireAdmin, (req, res) => {
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      try {
        type StoredSettings = Record<string, unknown>;
        let existing: StoredSettings = { version: '1.0', floors: [] };
        if (fs.existsSync(settingsPath)) {
          existing = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as StoredSettings;
        }
        const incoming = req.body as StoredSettings;
        const merged = { ...existing, ...incoming };
        fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');
        return res.json(merged);
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to write webui-settings.json: ${err.message}`);
        return res.status(500).json({ error: 'Failed to save settings' });
      }
    });

    // Push Notification: Subscribe
    this._app.post('/webui/push/subscribe', (req, res) => {
      const subscription = req.body;
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');

      try {
        type PushSettings = { version: string; pushSubscriptions?: { endpoint: string }[]; vapidPublicKey?: string };
        let settings: PushSettings = { version: '0.0' };
        if (fs.existsSync(settingsPath)) {
          const settingsData = fs.readFileSync(settingsPath, 'utf-8');
          settings = JSON.parse(settingsData) as PushSettings;
        }

        // Initialize pushSubscriptions array if not exists
        if (!settings.pushSubscriptions) {
          settings.pushSubscriptions = [];
        }

        // Check if subscription already exists (by endpoint)
        const existingIndex = settings.pushSubscriptions.findIndex((sub) => sub.endpoint === subscription.endpoint);

        if (existingIndex >= 0) {
          // Update existing subscription
          settings.pushSubscriptions[existingIndex] = subscription;
        } else {
          // Add new subscription
          settings.pushSubscriptions.push(subscription);
        }

        // Write back to file
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        ServerLogService.writeLog(
          LogLevel.Info,
          `Push subscription saved (${settings.pushSubscriptions.length} total)`,
        );

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
          settings.pushSubscriptions = settings.pushSubscriptions.filter((sub) => sub.endpoint !== endpoint);

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

    // Bug report endpoints
    const reportsPath = path.join(__dirname, '..', 'config', 'private', 'bug-reports.json');

    // Helper function to load bug reports
    type BugReport = Record<string, unknown>;
    const loadBugReports = (): BugReport[] => {
      if (fs.existsSync(reportsPath)) {
        try {
          const data = fs.readFileSync(reportsPath, 'utf-8');
          return JSON.parse(data);
        } catch (parseError) {
          ServerLogService.writeLog(LogLevel.Warn, 'Failed to parse bug-reports.json');
          return [];
        }
      }
      return [];
    };

    // Helper function to save bug reports
    const saveBugReports = (reports: BugReport[]): void => {
      fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2), 'utf-8');
    };

    // POST /webui/bug-report - Create new bug report
    this._app.post('/webui/bug-report', (req, res) => {
      try {
        const bugReport = req.body;
        const timestamp = new Date().toISOString();
        const reportWithTimestamp = {
          ...bugReport,
          createdAt: timestamp,
          id: Date.now().toString(),
          done: false,
        };

        const reports = loadBugReports();
        reports.push(reportWithTimestamp);
        saveBugReports(reports);

        ServerLogService.writeLog(LogLevel.Info, `Bug report saved: ${bugReport.description?.substring(0, 50)}...`);

        return res.json({ success: true, id: reportWithTimestamp.id });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to save bug report: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // GET /webui/bug-reports - Get all bug reports
    this._app.get('/webui/bug-reports', (_req, res) => {
      try {
        const reports = loadBugReports();
        return res.json(reports);
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to load bug reports: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // PATCH /webui/bug-report/:id - Update bug report
    this._app.patch('/webui/bug-report/:id', (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const reports = loadBugReports();
        const reportIndex = reports.findIndex((r) => r['id'] === id);

        if (reportIndex === -1) {
          return res.status(404).json({ success: false, error: 'Bug report not found' });
        }

        // Update report
        const updatedReport = { ...reports[reportIndex], ...updates };

        // If marking as done, add doneAt timestamp
        if (updates.done === true && !reports[reportIndex].done) {
          updatedReport.doneAt = new Date().toISOString();
        }
        // If unmarking as done, remove doneAt timestamp
        if (updates.done === false && reports[reportIndex].done) {
          delete updatedReport.doneAt;
        }

        reports[reportIndex] = updatedReport;
        saveBugReports(reports);

        ServerLogService.writeLog(LogLevel.Info, `Bug report ${id} updated`);

        return res.json({ success: true, report: updatedReport });
      } catch (error: unknown) {
        const err = error as { message?: string };
        ServerLogService.writeLog(LogLevel.Error, `Failed to update bug report: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    // Hoffmation service restart endpoint
    // Use process.exit to let systemd handle the restart automatically
    this._app.post('/hoffmation/restart', requireAdmin, async (_req, res) => {
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
    this._app.post('/webui/update', requireAdmin, async (_req, res) => {
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
      this._app.get('/ui/{*path}', (_req, res) => {
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
    const p = req.principal;
    return `Client (user: ${p ? `${p.name} [${p.role}]` : 'anon'}, ua: "${req.headers['user-agent']}", ip: ${req.ip}, endpoint: ${req.path})`;
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
