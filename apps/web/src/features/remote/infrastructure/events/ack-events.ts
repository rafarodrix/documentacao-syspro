import { EventEmitter } from "events";

class AckEventEmitter extends EventEmitter {
  private static instance: AckEventEmitter;

  private constructor() {
    super();
    // Aumentar o limite de listeners para evitar warnings se muitos hosts estiverem abertos
    this.setMaxListeners(100);
  }

  public static getInstance(): AckEventEmitter {
    if (!AckEventEmitter.instance) {
      AckEventEmitter.instance = new AckEventEmitter();
    }
    return AckEventEmitter.instance;
  }

  public emitAck(hostId: string, commandId: string, status: string, message?: string) {
    this.emit(`ack:${hostId}`, { hostId, commandId, status, message, timestamp: new Date().toISOString() });
  }

  public onAck(hostId: string, callback: (payload: any) => void) {
    const eventName = `ack:${hostId}`;
    this.on(eventName, callback);
    return () => this.off(eventName, callback);
  }
}

export const ackEvents = AckEventEmitter.getInstance();
