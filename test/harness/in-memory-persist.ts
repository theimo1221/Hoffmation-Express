// test/harness/in-memory-persist.ts
// Postgres replacement for tests/dev. Only the settings path is real; the rest of iPersist is a no-op.
// IMPORTANT: the Persistence.dbo getter checks `_dbo.initialized` -> it must be true, otherwise the
// getter returns undefined and device constructors (e.g. VeluxShutter) crash.
// Assign via: Persistence.dbo = new InMemoryPersist() as unknown as iPersist.

export class InMemoryPersist {
  public initialized = true;
  private readonly settings = new Map<string, string>();
  /** Per-id write counter — lets tests assert flush frequency (e.g. throttled token lastUsed). */
  public readonly writeCounts = new Map<string, number>();

  // --- real: settings (auth store, optional device-settings seed) ---
  public persistSettings(id: string, settings: string): void {
    this.settings.set(id, settings);
    this.writeCounts.set(id, (this.writeCounts.get(id) ?? 0) + 1);
  }
  public async loadSettings(id: string): Promise<string | undefined> {
    return this.settings.get(id);
  }
  public clearSettings(id: string): void {
    this.settings.delete(id);
  }

  // --- no-ops: rest of the iPersist interface (called during device construction / runtime) ---
  public initialize(): Promise<void> {
    return Promise.resolve();
  }
  public addRoom(): void {}
  public addDevice(): void {}
  public getLastDesiredPosition(): Promise<unknown> {
    return Promise.resolve({ desiredPosition: -1 }); // shutters read .desiredPosition; -1 = "no persisted position"
  }
  public getShutterCalibration(): Promise<unknown> {
    return Promise.resolve(undefined);
  }
  public motionSensorTodayCount(): Promise<unknown> {
    return Promise.resolve({ count: 0 }); // caller reads .count -> must not be undefined
  }
  public getTemperatureHistory(): Promise<unknown[]> {
    return Promise.resolve([]);
  }
  public persistShutterCalibration(): void {}
  public persistIlluminationSensor(): void {}
  public persistEnergyManager(): void {}
  public persistAC(): void {}
  public persistActuator(): void {}
  public persistHeater(): void {}
  public persistMotionSensor(): void {}
  public persistSwitchInput(): void {}
  public persistShutter(): void {}
  public persistTemperatureSensor(): void {}
  public persistHumiditySensor(): void {}
  public persistHandleSensor(): void {}
  public persistBatteryDevice(): void {}
  public persistZigbeeDevice(): void {}
}
