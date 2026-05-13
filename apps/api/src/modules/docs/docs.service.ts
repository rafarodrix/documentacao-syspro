import { Injectable } from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationService } from '../authorization/authorization.service';

const POPULAR_GLOBAL_KEY = 'docs:popular:global';
const POPULAR_AUDIENCE_KEY_PREFIX = 'docs:popular:audience:';

type AudienceSegment = 'admin' | 'suporte' | 'cliente';

type GlobalDocStats = Record<
  string,
  {
    title: string;
    count: number;
    lastViewed: number;
  }
>;

function parseGlobalStats(value: string | null): GlobalDocStats {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as GlobalDocStats;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toPopularList(stats: GlobalDocStats, limit = 8) {
  return Object.entries(stats)
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastViewed - a.lastViewed;
    })
    .slice(0, limit)
    .map(([href, value]) => ({
      href,
      title: value.title,
      count: value.count,
      lastViewed: value.lastViewed,
    }));
}

function getDocsPreferences(value: unknown): {
  lastRead?: { href: string; title: string; visitedAt: number };
} {
  const root = toObject(value);
  const docs = toObject(root.docs);
  const lastRead = toObject(docs.lastRead);

  if (
    typeof lastRead.href === 'string' &&
    typeof lastRead.title === 'string' &&
    typeof lastRead.visitedAt === 'number'
  ) {
    return {
      lastRead: {
        href: lastRead.href,
        title: lastRead.title,
        visitedAt: lastRead.visitedAt,
      },
    };
  }

  return {};
}

@Injectable()
export class DocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getViews(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const audienceSegment = await this.resolveAudienceSegment(requester);
    const audienceKey = `${POPULAR_AUDIENCE_KEY_PREFIX}${audienceSegment}`;

    const [globalSetting, audienceSetting, user] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: POPULAR_GLOBAL_KEY }, select: { value: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: audienceKey }, select: { value: true } }),
      this.prisma.user.findUnique({ where: { id: requester.userId }, select: { preferences: true } }),
    ]);

    const { lastRead } = getDocsPreferences(user?.preferences);

    return {
      ok: true,
      audienceSegment,
      globalPopular: toPopularList(parseGlobalStats(globalSetting?.value ?? null)),
      audiencePopular: toPopularList(parseGlobalStats(audienceSetting?.value ?? null)),
      lastRead: lastRead ?? null,
    };
  }

  async registerView(
    body: { href?: string; title?: string; visitedAt?: number },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const href = typeof body?.href === 'string' ? body.href : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const visitedAt = typeof body?.visitedAt === 'number' ? body.visitedAt : Date.now();

    if (!href.startsWith('/docs') || href.length > 300) {
      return { ok: false, error: 'invalid_href' };
    }

    const safeTitle = title.slice(0, 160);
    const audienceSegment = await this.resolveAudienceSegment(requester);
    const audienceKey = `${POPULAR_AUDIENCE_KEY_PREFIX}${audienceSegment}`;

    const [globalSetting, audienceSetting, user] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: POPULAR_GLOBAL_KEY }, select: { value: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: audienceKey }, select: { value: true } }),
      this.prisma.user.findUnique({ where: { id: requester.userId }, select: { preferences: true } }),
    ]);

    const globalCurrent = parseGlobalStats(globalSetting?.value ?? null);
    const globalPrevious = globalCurrent[href];
    const globalNext: GlobalDocStats = {
      ...globalCurrent,
      [href]: {
        title: safeTitle || globalPrevious?.title || href,
        count: (globalPrevious?.count ?? 0) + 1,
        lastViewed: visitedAt,
      },
    };

    const audienceCurrent = parseGlobalStats(audienceSetting?.value ?? null);
    const audiencePrevious = audienceCurrent[href];
    const audienceNext: GlobalDocStats = {
      ...audienceCurrent,
      [href]: {
        title: safeTitle || audiencePrevious?.title || href,
        count: (audiencePrevious?.count ?? 0) + 1,
        lastViewed: visitedAt,
      },
    };

    const currentPreferences = toObject(user?.preferences);
    const currentDocs = toObject(currentPreferences.docs);
    const nextPreferences = {
      ...currentPreferences,
      docs: {
        ...currentDocs,
        lastRead: {
          href,
          title: safeTitle || href,
          visitedAt,
        },
      },
    };

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: POPULAR_GLOBAL_KEY },
        update: {
          value: JSON.stringify(globalNext),
          description: 'Contador global de visualizacoes da documentacao',
        },
        create: {
          key: POPULAR_GLOBAL_KEY,
          value: JSON.stringify(globalNext),
          description: 'Contador global de visualizacoes da documentacao',
        },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: audienceKey },
        update: {
          value: JSON.stringify(audienceNext),
          description: `Contador de visualizacoes da documentacao por audiencia (${audienceSegment})`,
        },
        create: {
          key: audienceKey,
          value: JSON.stringify(audienceNext),
          description: `Contador de visualizacoes da documentacao por audiencia (${audienceSegment})`,
        },
      }),
      this.prisma.user.update({
        where: { id: requester.userId },
        data: {
          preferences: nextPreferences as Prisma.InputJsonValue,
        },
      }),
    ]);

    return { ok: true };
  }

  private async resolveAudienceSegment(requester: { userId: string; role: Role; email: string }): Promise<AudienceSegment> {
    if (requester.role === 'ADMIN') {
      return 'admin';
    }

    if (requester.role === 'DEVELOPER' || requester.role === 'SUPORTE') {
      return 'suporte';
    }

    return 'cliente';
  }
}
