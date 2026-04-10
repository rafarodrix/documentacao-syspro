import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { IncomingHttpHeaders } from 'node:http';

const POPULAR_GLOBAL_KEY = 'docs:popular:global';
const POPULAR_ROLE_KEY_PREFIX = 'docs:popular:role:';

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

function getRoleSegment(role: Role): 'admin' | 'developer' | 'suporte' | 'cliente_admin' | 'cliente_user' {
  if (role === 'ADMIN') return 'admin';
  if (role === 'DEVELOPER') return 'developer';
  if (role === 'SUPORTE') return 'suporte';
  if (role === 'CLIENTE_ADMIN') return 'cliente_admin';
  return 'cliente_user';
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
    private readonly authService: AuthService,
  ) {}

  async getViews(rawHeaders?: IncomingHttpHeaders) {
    const session = await this.getSession(rawHeaders);
    const roleSegment = getRoleSegment(session.role);
    const roleKey = `${POPULAR_ROLE_KEY_PREFIX}${roleSegment}`;

    const [globalSetting, roleSetting, user] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: POPULAR_GLOBAL_KEY }, select: { value: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: roleKey }, select: { value: true } }),
      this.prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } }),
    ]);

    const { lastRead } = getDocsPreferences(user?.preferences);

    return {
      ok: true,
      roleSegment,
      globalPopular: toPopularList(parseGlobalStats(globalSetting?.value ?? null)),
      rolePopular: toPopularList(parseGlobalStats(roleSetting?.value ?? null)),
      lastRead: lastRead ?? null,
    };
  }

  async registerView(
    body: { href?: string; title?: string; visitedAt?: number },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const session = await this.getSession(rawHeaders);
    const href = typeof body?.href === 'string' ? body.href : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const visitedAt = typeof body?.visitedAt === 'number' ? body.visitedAt : Date.now();

    if (!href.startsWith('/docs') || href.length > 300) {
      return { ok: false, error: 'invalid_href' };
    }

    const safeTitle = title.slice(0, 160);
    const roleSegment = getRoleSegment(session.role);
    const roleKey = `${POPULAR_ROLE_KEY_PREFIX}${roleSegment}`;

    const [globalSetting, roleSetting, user] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: POPULAR_GLOBAL_KEY }, select: { value: true } }),
      this.prisma.systemSetting.findUnique({ where: { key: roleKey }, select: { value: true } }),
      this.prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } }),
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

    const roleCurrent = parseGlobalStats(roleSetting?.value ?? null);
    const rolePrevious = roleCurrent[href];
    const roleNext: GlobalDocStats = {
      ...roleCurrent,
      [href]: {
        title: safeTitle || rolePrevious?.title || href,
        count: (rolePrevious?.count ?? 0) + 1,
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
        where: { key: roleKey },
        update: {
          value: JSON.stringify(roleNext),
          description: `Contador de visualizacoes da documentacao por perfil (${roleSegment})`,
        },
        create: {
          key: roleKey,
          value: JSON.stringify(roleNext),
          description: `Contador de visualizacoes da documentacao por perfil (${roleSegment})`,
        },
      }),
      this.prisma.user.update({
        where: { id: session.userId },
        data: {
          preferences: nextPreferences as Prisma.InputJsonValue,
        },
      }),
    ]);

    return { ok: true };
  }

  private async getSession(rawHeaders?: IncomingHttpHeaders) {
    const headers = new Headers();
    if (rawHeaders) {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (!value) continue;
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const session = await this.authService.auth.api.getSession({ headers });
    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return { userId: requester.id, role: requester.role };
  }
}
