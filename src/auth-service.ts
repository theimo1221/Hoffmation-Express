import * as crypto from 'crypto';
import { API, ServerLogService, LogLevel } from 'hoffmation-base';
import type { Role, AuthMode, DenyPolicy, Principal, UserRec, TokenRec, AuthStore } from './types';

const STORE_ID = 'express-auth-store';

export type { Role, AuthMode, DenyPolicy, Principal } from './types';

export class AuthService {
  private static store: AuthStore | null = null;
  private static sessions = new Map<string, { name: string; role: Role; deny?: DenyPolicy; exp: number }>();
  private static loginAttempts = new Map<string, { count: number; firstAttempt: number }>(); // key: ip:username
  private static tokenLastPersist = new Map<string, number>(); // label -> timestamp of last persist

  public static async init(): Promise<void> {
    try {
      const raw = await API.loadConfig(STORE_ID);
      if (!raw) {
        this.store = null;
        ServerLogService.writeLog(LogLevel.Info, 'AUTH: no store -> auth disabled');
        return;
      }
      this.store = JSON.parse(raw);

      // Migration: add createdAt to existing users/tokens without it
      let needsPersist = false;
      const now = new Date().toISOString();
      for (const u of this.store.users) {
        if (!u.createdAt) {
          u.createdAt = now;
          needsPersist = true;
        }
      }
      for (const t of this.store.tokens) {
        if (!t.createdAt) {
          t.createdAt = now;
          needsPersist = true;
        }
      }
      if (needsPersist) await this.persist();

      ServerLogService.writeLog(LogLevel.Info, `AUTH: store loaded, mode=${this.store!.mode}`);
      const pruneTimer = setInterval(() => this.pruneExpiredSessions(), 600000);
      pruneTimer.unref?.();
    } catch (e) {
      this.store = null;
      ServerLogService.writeLog(LogLevel.Error, `AUTH: init failed (${e}) -> auth disabled (fail-open)`);
    }
  }

  public static get enabled(): boolean {
    return this.store !== null;
  }
  public static get mode(): AuthMode {
    return this.store?.mode ?? 'optional';
  }
  private static async persist(): Promise<void> {
    if (!this.store) return;
    try {
      await API.saveConfig(STORE_ID, JSON.stringify(this.store));
    } catch (e) {
      ServerLogService.writeLog(LogLevel.Error, `AUTH: persist failed (${e})`);
      throw e;
    }
  }

  public static hashPw(pw: string): string {
    const s = crypto.randomBytes(16).toString('hex');
    return `scrypt$${s}$${crypto.scryptSync(pw, s, 32).toString('hex')}`;
  }
  private static verifyPw(pw: string, stored: string): boolean {
    const [, s, h] = stored.split('$');
    if (!s || !h) return false;
    const a = Buffer.from(h, 'hex');
    const b = crypto.scryptSync(pw, s, 32);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  public static hashToken(t: string): string {
    return 'sha256$' + crypto.createHash('sha256').update(t).digest('hex');
  }
  private static tokenEq(t: string, stored: string): boolean {
    const a = Buffer.from(this.hashToken(t));
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  public static resolveToken(token: string): Principal | null {
    if (!this.store) return null;
    for (const tk of this.store.tokens) {
      if (tk.disabled) continue;
      if (tk.validUntil && new Date(tk.validUntil) < new Date()) continue;
      if (this.tokenEq(token, tk.tokenHash)) {
        tk.lastUsed = new Date().toISOString();
        // Throttled persist: only persist every 60s (hot path)
        const now = Date.now();
        const lastPersist = this.tokenLastPersist.get(tk.label) ?? 0;
        if (now - lastPersist > 60000) {
          this.tokenLastPersist.set(tk.label, now);
          this.persist().catch((e) =>
            ServerLogService.writeLog(LogLevel.Error, `AUTH: failed to persist lastUsed (${e})`),
          );
        }
        return { name: tk.label, role: tk.role, deny: tk.deny, via: 'bearer' };
      }
    }
    return null;
  }
  public static resolveSession(sid: string): Principal | null {
    const s = this.sessions.get(sid);
    if (!s || s.exp < Date.now()) {
      if (s) this.sessions.delete(sid);
      return null;
    }
    return { name: s.name, role: s.role, deny: s.deny, via: 'cookie' };
  }

  private static pruneExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];
    this.sessions.forEach((session, sid) => {
      if (session.exp < now) expired.push(sid);
    });
    expired.forEach((sid) => this.sessions.delete(sid));
  }

  public static login(user: string, pw: string, ip?: string): { sid: string; role: Role } | null {
    if (!this.store) return null;

    // Brute-force throttling: block IP+user after 5 failed attempts for 15 minutes
    const key = ip ? `${ip}:${user}` : user;
    if (this.isThrottled(key)) {
      ServerLogService.writeLog(
        LogLevel.Warn,
        `AUTH-THROTTLED: user=${user} ip=${ip ?? 'unknown'} (too many failed attempts)`,
      );
      return null;
    }

    const u = this.store.users.find((x) => x.username === user && !x.disabled);
    if (!u || !this.verifyPw(pw, u.pwHash)) {
      this.trackFailedLogin(key);
      return null;
    }
    this.loginAttempts.delete(key);

    // Stamp lastLogin and persist immediately (rare event)
    u.lastLogin = new Date().toISOString();
    this.persist().catch((e) => ServerLogService.writeLog(LogLevel.Error, `AUTH: failed to persist lastLogin (${e})`));

    const sid = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(sid, {
      name: u.username,
      role: u.role,
      deny: u.deny,
      exp: Date.now() + (this.store.sessionTtlMinutes ?? 720) * 60000,
    });
    return { sid, role: u.role };
  }

  private static isThrottled(key: string): boolean {
    const attempt = this.loginAttempts.get(key);
    if (!attempt) return false;
    const now = Date.now();
    // Throttle for 15 minutes after 5 failed attempts
    if (attempt.count >= 5 && now - attempt.firstAttempt < 900000) {
      return true;
    }
    // Reset after 15 minutes
    if (now - attempt.firstAttempt > 900000) {
      this.loginAttempts.delete(key);
      return false;
    }
    return false;
  }

  private static trackFailedLogin(key: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(key);
    if (!attempt || now - attempt.firstAttempt > 900000) {
      this.loginAttempts.set(key, { count: 1, firstAttempt: now });
    } else {
      attempt.count++;
      if (attempt.count >= 5) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `AUTH-BRUTE-FORCE: key=${key} attempts=${attempt.count} → throttled for 15min`,
        );
      }
    }
  }
  public static logout(sid: string): void {
    this.sessions.delete(sid);
  }

  public static roleAllows(role: Role, path: string): boolean {
    if (role === 'admin') return true;
    if (role === 'webhook') return /^\/camera\/[^/]+\/personDetected/.test(path);
    return !/^\/(webui\/update|hoffmation\/restart|deviceSettings|auth\/(users|tokens))/.test(path);
  }
  public static mayControl(p: Principal, deviceClass: string, deviceId?: string): boolean {
    if (p.role === 'admin') return true;
    const d = p.deny;
    if (!d) return true;
    if (d.deviceClasses?.includes(deviceClass)) return false;
    if (deviceId) {
      const dev = API.getDevice(deviceId) as unknown as { room?: { roomName?: string; etage?: number } };
      const room = dev?.room;
      if (room && d.rooms?.includes(room.roomName)) return false;
      if (room && typeof room.etage === 'number' && d.floors?.includes(room.etage)) return false;
    }
    return true;
  }

  private static readonly ENDPOINT_TO_CLASS: Record<string, string> = {
    lamps: 'lamp',
    dimmer: 'dimmer',
    led: 'led',
    actuator: 'actuator',
    ac: 'ac',
    shutter: 'shutter',
    garageDoor: 'garageDoor',
    scene: 'scene',
    camera: 'camera',
  };

  public static mayControlEndpoint(p: Principal, endpointPrefix: string, deviceId: string): boolean {
    const deviceClass = this.ENDPOINT_TO_CLASS[endpointPrefix];
    if (!deviceClass) return true;
    return this.mayControl(p, deviceClass, deviceId);
  }

  public static async upsertUser(u: UserRec): Promise<void> {
    if (!this.store) return;
    const existing = this.store.users.find((x) => x.username === u.username);
    // Preserve createdAt on update, set it on creation
    if (!u.createdAt) {
      u.createdAt = existing?.createdAt ?? new Date().toISOString();
    }
    this.store.users = this.store.users.filter((x) => x.username !== u.username);
    this.store.users.push(u);
    await this.persist();
  }
  public static async deleteUser(name: string): Promise<void> {
    if (!this.store) return;
    this.store.users = this.store.users.filter((x) => x.username !== name);
    await this.persist();
  }
  public static async setMode(mode: AuthMode): Promise<void> {
    if (!this.store) return;
    this.store.mode = mode;
    await this.persist();
  }
  public static listUsers(): Array<Omit<UserRec, 'pwHash'>> {
    return (this.store?.users ?? []).map(({ pwHash: _pwHash, ...r }) => r);
  }
  private static getUser(name: string): UserRec | undefined {
    return this.store?.users.find((x) => x.username === name);
  }

  public static async mintToken(label: string, role: Role, deny?: DenyPolicy, scope?: string[]): Promise<string> {
    if (!this.store) throw new Error('no store');
    const t = crypto.randomBytes(32).toString('base64url');
    this.store.tokens = this.store.tokens.filter((x) => x.label !== label);
    this.store.tokens.push({
      label,
      role,
      tokenHash: this.hashToken(t),
      deny: deny ?? {},
      scope: scope ?? null,
      validUntil: null,
      disabled: false,
      createdAt: new Date().toISOString(),
      lastUsed: null,
    });
    await this.persist();
    return t;
  }
  public static async revokeToken(label: string): Promise<void> {
    if (!this.store) return;
    this.store.tokens = this.store.tokens.filter((x) => x.label !== label);
    await this.persist();
  }
  public static listTokens(): Array<Omit<TokenRec, 'tokenHash'>> {
    return (this.store?.tokens ?? []).map(({ tokenHash: _tokenHash, ...r }) => r);
  }

  public static getUserForPatch(name: string): UserRec | undefined {
    return this.getUser(name);
  }
}
