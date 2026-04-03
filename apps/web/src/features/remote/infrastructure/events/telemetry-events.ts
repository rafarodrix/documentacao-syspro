import { EventEmitter } from "events";

class TelemetryEventEmitter extends EventEmitter {
  private static instance: TelemetryEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(200);
  }

  public static getInstance(): TelemetryEventEmitter {
    if (!TelemetryEventEmitter.instance) {
      TelemetryEventEmitter.instance = new TelemetryEventEmitter();
    }
    return TelemetryEventEmitter.instance;
  }

  public emitUpdate(hostId: string, metrics: any) {
    this.emit(`telemetry:${hostId}`, {
      hostId,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  public onUpdate(hostId: string, callback: (payload: any) => void) {
    const eventName = `telemetry:${hostId}`;
    this.on(eventName, callback);
    return () => this.off(eventName, callback);
  }
}

export const telemetryEvents = TelemetryEventEmitter.getInstance();
