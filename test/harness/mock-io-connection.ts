// test/harness/mock-io-connection.ts
// Fake of the ioBroker outbound connection. Implements iIOBrokerConnection (setState + dispose).
// setState -> (a) record the call [spy]  (b) echo it back as an ack'd state so the device adopts it.
// This makes "command -> ioBroker setState -> state adopted" testable without a real ioBroker.

import { DeviceUpdater, ioBrokerMain } from 'hoffmation-base';
import type { iIOBrokerConnection } from 'hoffmation-base';

export interface RecordedCall {
  pointId: string;
  state: string | number | boolean | null;
  ts: number;
}

export class MockIoConnection implements iIOBrokerConnection {
  public readonly calls: RecordedCall[] = [];
  private readonly updater = new DeviceUpdater();

  public setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    callback?: ioBroker.SetStateCallback,
  ): void {
    const val = (state !== null && typeof state === 'object' ? (state as ioBroker.State).val : state) as
      | string
      | number
      | boolean
      | null;
    this.calls.push({ pointId, state: val, ts: Date.now() });

    // Simulate the ack round-trip so the device adopts the new state
    this.updater.updateState(
      pointId,
      { val, ack: true, ts: Date.now(), lc: Date.now(), from: 'mock', q: 0 } as unknown as ioBroker.State,
      false,
    );

    callback?.(null, pointId);
  }

  public dispose(): void {
    /* no-op */
  }

  public reset(): void {
    this.calls.length = 0;
  }
  public calledFor(pointId: string): RecordedCall[] {
    return this.calls.filter((c) => c.pointId === pointId);
  }
}

/**
 * "startMockIobroker": replaces HoffmationBase.startIoBroker(devices) in test mode.
 * Mirrors the real ioBrokerMain constructor: (1) set iOConnection, (2) initRooms() -> instantiates
 * the rooms from the registered OwnRooms and links the devices (dev.room).
 */
export function installMockIoConnection(): MockIoConnection {
  const mock = new MockIoConnection();
  const iom = ioBrokerMain as unknown as { iOConnection?: iIOBrokerConnection; initRooms(): void };
  iom.iOConnection = mock;
  iom.initRooms();
  return mock;
}
