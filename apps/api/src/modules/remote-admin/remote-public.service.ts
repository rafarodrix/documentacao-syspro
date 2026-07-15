import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { executeRemoteIngressProcedure } from './remote-procedure-runner';

type RemoteProcedure = 'discover' | 'bootstrap' | 'sync' | 'ack';

@Injectable()
export class RemotePublicService {
  private readonly logger = new Logger(RemotePublicService.name);

  discover(payload: unknown, request: Request) {
    return this.callRemoteProcedure('discover', payload, request);
  }

  bootstrap(payload: unknown, request: Request) {
    return this.callRemoteProcedure('bootstrap', payload, request);
  }

  sync(payload: unknown, request: Request) {
    return this.callRemoteProcedure('sync', payload, request);
  }

  ack(payload: unknown, request: Request) {
    return this.callRemoteProcedure('ack', payload, request);
  }

  private async callRemoteProcedure(procedure: RemoteProcedure, payload: unknown, request: Request) {
    assertInternalApiKey(this.getHeader(request, 'x-internal-api-key') ?? undefined);
    const data = await executeRemoteIngressProcedure({
      procedure,
      payload,
      requestId: this.getHeader(request, 'x-correlation-id') ?? undefined,
      requestIp: this.getRequestIp(request),
      userAgent: this.getHeader(request, 'user-agent'),
      agentRuntime: this.getHeader(request, 'x-agent-runtime'),
      agentVersion: this.getHeader(request, 'x-agent-version'),
      logger: {
        info: (event: string, meta?: Record<string, unknown>) => this.logger.log({ event, ...(meta ?? {}) }),
        warn: (event: string, meta?: Record<string, unknown>) => this.logger.warn({ event, ...(meta ?? {}) }),
        error: (event: string, meta?: Record<string, unknown>) => this.logger.error({ event, ...(meta ?? {}) }),
      },
    });

    return { success: true, data };
  }

  private getRequestIp(request: Request) {
    const forwarded = this.getHeader(request, 'x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return this.getHeader(request, 'cf-connecting-ip');
  }
  private getHeader(request: Request, name: string) {
    const value = request.headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0] ?? null;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
