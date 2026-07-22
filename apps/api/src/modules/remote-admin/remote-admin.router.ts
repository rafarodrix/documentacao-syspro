import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { deviceListQuerySchema } from '@dosc-syspro/contracts';
import { TrpcService } from '../trpc/trpc.service';
import { RemoteAdminService } from './remote-admin.service';

const hostActionSchema = z.enum(['REBOOTSTRAP', 'RESEND_CONFIG', 'REAPPLY_ALIAS', 'UPGRADE_CLIENT']);
const serviceControlSchema = z.object({
  hostId: z.string(),
  serviceName: z.string().trim().min(1),
  action: z.enum(['start', 'stop', 'restart']),
});

const sessionFilterSchema = z.object({
  status: z
    .enum(['REQUESTED', 'STARTED', 'ENDED', 'FAILED', 'CANCELLED', 'ACTIVE'])
    .optional(),
  hostId: z.string().optional(),
  ticket: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

const companyContextSchema = z.object({
  serverType: z.enum(['SYSPRO_SERVER', 'IIS']).nullish(),
  installationDirectory: z.string().nullish(),
  serverHost: z.string().nullish(),
  serverPort: z.union([z.number(), z.string()]).nullish(),
  serverProtocol: z.enum(['HTTP', 'HTTPS']).nullish(),
  iisIsapiPath: z.string().nullish(),
  observacoes: z.string().nullish(),
});

const createSessionSchema = z.object({
  hostId: z.string(),
  ticketId: z.string().nullish(),
  companyId: z.string().optional(),
});

@Injectable()
export class RemoteAdminRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly remoteAdminService: RemoteAdminService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      // ─── Queries ───────────────────────────────────────────────────────

      devices: this.trpc.publicProcedure
        .input(deviceListQuerySchema.optional())
        .query(({ input, ctx }) =>
          this.remoteAdminService.getDevices(deviceListQuerySchema.parse(input ?? {}), ctx.headers),
        ),

      directory: this.trpc.publicProcedure.query(({ ctx }) =>
        this.remoteAdminService.getDirectory(ctx.headers),
      ),

      overview: this.trpc.publicProcedure.query(({ ctx }) =>
        this.remoteAdminService.getOverview(ctx.headers),
      ),

      hostDetails: this.trpc.publicProcedure
        .input(z.object({ hostId: z.string() }))
        .query(({ input, ctx }) =>
          this.remoteAdminService.getHostDetails(input.hostId, ctx.headers),
        ),

      discoveredHostDetails: this.trpc.publicProcedure
        .input(z.object({ discoveredHostId: z.string() }))
        .query(({ input, ctx }) =>
          this.remoteAdminService.getDiscoveredHostDetails(input.discoveredHostId, ctx.headers),
        ),

      sessions: this.trpc.publicProcedure
        .input(sessionFilterSchema)
        .query(({ input, ctx }) =>
          this.remoteAdminService.getSessions(ctx.headers, input),
        ),

      fleetStats: this.trpc.publicProcedure.query(({ ctx }) =>
        this.remoteAdminService.getFleetStats(ctx.headers),
      ),

      efficiencyMetrics: this.trpc.publicProcedure.query(({ ctx }) =>
        this.remoteAdminService.getEfficiencyMetrics(ctx.headers),
      ),

      searchCompanies: this.trpc.publicProcedure
        .input(z.object({ q: z.string().optional() }))
        .query(({ input, ctx }) =>
          this.remoteAdminService.searchRemoteCompanies(input.q ?? '', ctx.headers),
        ),

      // ─── Mutations ─────────────────────────────────────────────────────

      enqueueHostAction: this.trpc.publicProcedure
        .input(z.object({ hostId: z.string(), action: hostActionSchema }))
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.enqueueHostAction(input.hostId, input.action, ctx.headers),
        ),

      enqueueServiceControl: this.trpc.publicProcedure
        .input(serviceControlSchema)
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.enqueueServiceControl(input.hostId, input.serviceName, input.action, ctx.headers),
        ),

      updateCompanyContext: this.trpc.publicProcedure
        .input(z.object({ companyId: z.string(), data: companyContextSchema }))
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.updateCompanyContext(input.companyId, input.data, ctx.headers),
        ),

      updateCompanyObservacoes: this.trpc.publicProcedure
        .input(z.object({ companyId: z.string(), observacoes: z.string().nullish() }))
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.updateCompanyObservacoes(
            input.companyId,
            { observacoes: input.observacoes },
            ctx.headers,
          ),
        ),

      createSession: this.trpc.publicProcedure
        .input(createSessionSchema)
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.createRemoteSession(input, ctx.headers),
        ),

      startSession: this.trpc.publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.startRemoteSession(input.sessionId, ctx.headers),
        ),

      stopSession: this.trpc.publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(({ input, ctx }) =>
          this.remoteAdminService.stopRemoteSession(input.sessionId, ctx.headers),
        ),

      cleanupSessions: this.trpc.publicProcedure.mutation(({ ctx }) =>
        this.remoteAdminService.cleanupRemoteSessions(ctx.headers),
      ),
    });
  }
}
