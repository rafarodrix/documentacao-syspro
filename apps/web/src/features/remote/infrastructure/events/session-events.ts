import { EventEmitter } from "events";

/**
 * Interface que define as propriedades de uma atualizacao de sessao
 */
export interface SessionEventPayload {
  sessionId: string;
  hostId: string;
  companyId: string;
  status: string;
  ticketNumber?: string | null;
  timestamp: string;
}

/**
 * Hub de eventos em memoria para Sessoes Remotas (SSE).
 * Permite que o portal reaja a mudancas de estado de sessao sem polling.
 */
class SessionEventEmitter {
  private emitter = new EventEmitter();

  constructor() {
    // Aumentar o limite se houver muitos usuarios conectados
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emite um evento de mudanca de estado de sessao
   */
  emitSessionChange(payload: SessionEventPayload) {
    // Emite para o host especifico
    this.emitter.emit(`session:${payload.hostId}`, payload);
    // Emite para o barramento global (para contadores de sessoes ativas)
    this.emitter.emit("session:any", payload);
  }

  /**
   * Subscreve a eventos de sessao de um host especifico
   */
  onSessionChange(hostId: string, callback: (payload: SessionEventPayload) => void) {
    const eventName = `session:${hostId}`;
    this.emitter.on(eventName, callback);
    return () => this.emitter.off(eventName, callback);
  }

  /**
   * Subscreve a qualquer mudanca de sessao (global)
   */
  onAnySessionChange(callback: (payload: SessionEventPayload) => void) {
    const eventName = "session:any";
    this.emitter.on(eventName, callback);
    return () => this.emitter.off(eventName, callback);
  }
}

// Singleton para o barramento de eventos
export const sessionEvents = new SessionEventEmitter();
