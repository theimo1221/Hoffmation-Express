import * as webpush from 'web-push';
import * as fs from 'fs';
import * as path from 'path';
import { ServerLogService, LogLevel } from 'hoffmation-base';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  email: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static vapidKeys: VapidKeys | null = null;
  private static initialized = false;

  /**
   * Initialize the push notification service with VAPID keys
   */
  public static initialize(): void {
    if (this.initialized) return;

    try {
      const vapidKeysPath = path.join(__dirname, '..', 'config', 'private', 'vapid-keys.json');
      
      if (!fs.existsSync(vapidKeysPath)) {
        ServerLogService.writeLog(
          LogLevel.Warn,
          'VAPID keys not found. Push notifications will not work. Run: npx web-push generate-vapid-keys'
        );
        return;
      }

      const keysData = fs.readFileSync(vapidKeysPath, 'utf-8');
      this.vapidKeys = JSON.parse(keysData);

      if (this.vapidKeys) {
        webpush.setVapidDetails(
          this.vapidKeys.email,
          this.vapidKeys.publicKey,
          this.vapidKeys.privateKey
        );
      }

      this.initialized = true;
      ServerLogService.writeLog(LogLevel.Info, 'Push notification service initialized');
    } catch (error: unknown) {
      const err = error as { message?: string };
      ServerLogService.writeLog(LogLevel.Error, `Failed to initialize push notifications: ${err.message}`);
    }
  }

  /**
   * Send push notification to all subscriptions
   * @param priority 'normal' | 'critical' - Critical notifications bypass Do Not Disturb
   */
  public static async sendToAll(
    title: string,
    body: string,
    url?: string,
    icon?: string,
    priority: 'normal' | 'critical' = 'normal'
  ): Promise<void> {
    if (!this.initialized || !this.vapidKeys) {
      ServerLogService.writeLog(LogLevel.Warn, 'Push notifications not initialized');
      return;
    }

    try {
      const subscriptions = this.loadSubscriptions();
      
      if (subscriptions.length === 0) {
        ServerLogService.writeLog(LogLevel.Debug, 'No push subscriptions found');
        return;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: icon || '/ui/icon-192.png',
        badge: '/ui/icon-192.png',
        url: url || '/ui/',
        requireInteraction: priority === 'critical',
        tag: priority === 'critical' ? 'critical-alert' : undefined,
        vibrate: priority === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        silent: false,
      });

      const results = await Promise.allSettled(
        subscriptions.map((sub) => webpush.sendNotification(sub, payload))
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.filter((r) => r.status === 'rejected').length;

      ServerLogService.writeLog(
        LogLevel.Info,
        `Push notifications sent: ${successCount} success, ${failCount} failed`
      );

      // Remove failed subscriptions
      if (failCount > 0) {
        this.cleanupFailedSubscriptions(subscriptions, results as PromiseSettledResult<any>[]);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      ServerLogService.writeLog(LogLevel.Error, `Failed to send push notifications: ${err.message}`);
    }
  }

  /**
   * Send push notification to specific subscription
   * @param priority 'normal' | 'critical' - Critical notifications bypass Do Not Disturb
   */
  public static async sendToSubscription(
    subscription: PushSubscription,
    title: string,
    body: string,
    url?: string,
    icon?: string,
    priority: 'normal' | 'critical' = 'normal'
  ): Promise<boolean> {
    if (!this.initialized || !this.vapidKeys) {
      return false;
    }

    try {
      const payload = JSON.stringify({
        title,
        body,
        icon: icon || '/ui/icon-192.png',
        badge: '/ui/icon-192.png',
        url: url || '/ui/',
        requireInteraction: priority === 'critical',
        tag: priority === 'critical' ? 'critical-alert' : undefined,
        vibrate: priority === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        silent: false,
      });

      await webpush.sendNotification(subscription, payload);
      return true;
    } catch (error) {
      ServerLogService.writeLog(LogLevel.Error, `Failed to send push to subscription: ${error}`);
      return false;
    }
  }

  /**
   * Load subscriptions from webui-settings.json
   */
  private static loadSubscriptions(): PushSubscription[] {
    try {
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      
      if (!fs.existsSync(settingsPath)) {
        return [];
      }

      const settingsData = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      
      return settings.pushSubscriptions || [];
    } catch (error) {
      ServerLogService.writeLog(LogLevel.Error, `Failed to load push subscriptions: ${error}`);
      return [];
    }
  }

  /**
   * Remove failed subscriptions from webui-settings.json
   */
  private static cleanupFailedSubscriptions(
    subscriptions: PushSubscription[],
    results: PromiseSettledResult<void>[]
  ): void {
    try {
      const validSubscriptions = subscriptions.filter((_, index) => results[index].status === 'fulfilled');
      
      const settingsPath = path.join(__dirname, '..', 'config', 'private', 'webui-settings.json');
      const settingsData = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsData);
      
      settings.pushSubscriptions = validSubscriptions;
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      
      const removedCount = subscriptions.length - validSubscriptions.length;
      ServerLogService.writeLog(LogLevel.Info, `Removed ${removedCount} invalid push subscriptions`);
    } catch (error) {
      ServerLogService.writeLog(LogLevel.Error, `Failed to cleanup subscriptions: ${error}`);
    }
  }
}
