import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError, callProcedure, createApiContext, remoteRouter } from '@dosc-syspro/application';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';

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

    const ctx = createApiContext({
      requestId: this.getHeader(request, 'x-correlation-id') ?? undefined,
      requestIp: this.getRequestIp(request),
      userAgent: this.getHeader(request, 'user-agent'),
      logger: {
        info: (event, meta) => this.logger.log({ event, ...(meta ?? {}) }),
        warn: (event, meta) => this.logger.warn({ event, ...(meta ?? {}) }),
        error: (event, meta) => this.logger.error({ event, ...(meta ?? {}) }),
      },
    });

    try {
      const data = await callProcedure({
        ctx,
        namespace: 'remote',
        router: remoteRouter,
        procedure,
        input: {
          payload: {
            ...this.asObject(payload),
            metadata: {
              ip: ctx.requestIp ?? null,
              userAgent: ctx.userAgent ?? null,
              correlationId: ctx.requestId,
            },
          },
        },
      });

      return { success: true, data };
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  private getRequestIp(request: Request) {
    const forwarded = this.getHeader(request, 'x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || null;
    return this.getHeader(request, 'cf-connecting-ip');
  }

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private getHeader(request: Request, name: string) {
    const value = request.headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0] ?? null;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private throwHttpError(error: unknown): never {
    if (error instanceof ApiError) {
      const remote = this.extractRemoteError(error.cause);
      if (remote) {
        this.throwStatus(remote.httpStatus, {
          success: false,
          error: remote.message,
          message: remote.message,
          code: remote.code,
          httpStatus: remote.httpStatus,
          ...(remote.data !== undefined ? { data: remote.data } : {}),
        });
      }

      const status =
        error.code === 'UNAUTHORIZED'
          ? 401
          : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'BAD_REQUEST'
              ? 400
              : 500;
      this.throwStatus(status, {
        success: false,
        error: error.message,
        message: error.message,
        code: error.code,
        httpStatus: status,
      });
    }

    throw new HttpException(
      {
        success: false,
        error: 'Falha inesperada no modulo remoto.',
        message: 'Falha inesperada no modulo remoto.',
        code: 'INTERNAL_ERROR',
        httpStatus: 500,
      },
      500,
    );
  }

  private extractRemoteError(cause: unknown) {
    if (!cause || typeof cause !== 'object') return null;
    const remote = (cause as { remote?: unknown }).remote;
    if (!remote || typeof remote !== 'object') return null;
    const candidate = remote as { code?: unknown; message?: unknown; httpStatus?: unknown; data?: unknown };
    if (
      typeof candidate.code !== 'string' ||
      typeof candidate.message !== 'string' ||
      typeof candidate.httpStatus !== 'number'
    ) {
      return null;
    }
    return candidate as { code: string; message: string; httpStatus: number; data?: unknown };
  }

  private throwStatus(status: number, body: Record<string, unknown>): never {
    throw new HttpException(body, status);
  }
}
