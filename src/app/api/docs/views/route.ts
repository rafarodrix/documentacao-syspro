import { NextResponse } from 'next/server';
import type { Prisma, Role } from '@prisma/client';
import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getProtectedSession } from '@/lib/auth-helpers';

const POPULAR_GLOBAL_KEY = 'docs:popular:global';
const POPULAR_ROLE_KEY_PREFIX = 'docs:popular:role:';
const POPULAR_CACHE_TAG = 'docs-popular';

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

function getRoleSegment(role: Role): 'cliente' | 'suporte' | 'admin' {
  if (role === 'SUPORTE') return 'suporte';
  if (role === 'ADMIN' || role === 'DEVELOPER') return 'admin';
  return 'cliente';
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

const getPopularStatsCached = unstable_cache(
  async (key: string) => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return parseGlobalStats(setting?.value ?? null);
  },
  ['docs-popular-stats'],
  { revalidate: 300, tags: [POPULAR_CACHE_TAG] },
);

export async function GET() {
  const session = await getProtectedSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const roleSegment = getRoleSegment(session.role);
  const roleKey = `${POPULAR_ROLE_KEY_PREFIX}${roleSegment}`;

  const [globalStats, roleStats, user] = await Promise.all([
    getPopularStatsCached(POPULAR_GLOBAL_KEY),
    getPopularStatsCached(roleKey),
    prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } }),
  ]);

  const { lastRead } = getDocsPreferences(user?.preferences);

  return NextResponse.json(
    {
      ok: true,
      roleSegment,
      globalPopular: toPopularList(globalStats),
      rolePopular: toPopularList(roleStats),
      lastRead: lastRead ?? null,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const body = await request.json();
    const href = typeof body?.href === 'string' ? body.href : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const visitedAt = typeof body?.visitedAt === 'number' ? body.visitedAt : Date.now();

    if (!href.startsWith('/docs') || href.length > 300) {
      return NextResponse.json({ ok: false, error: 'invalid_href' }, { status: 400 });
    }

    const safeTitle = title.slice(0, 160);
    const roleSegment = getRoleSegment(session.role);
    const roleKey = `${POPULAR_ROLE_KEY_PREFIX}${roleSegment}`;

    const [globalSetting, roleSetting, user] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: POPULAR_GLOBAL_KEY }, select: { value: true } }),
      prisma.systemSetting.findUnique({ where: { key: roleKey }, select: { value: true } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } }),
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

    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: POPULAR_GLOBAL_KEY },
        update: {
          value: JSON.stringify(globalNext),
          description: 'Contador global de visualizações da documentação',
        },
        create: {
          key: POPULAR_GLOBAL_KEY,
          value: JSON.stringify(globalNext),
          description: 'Contador global de visualizações da documentação',
        },
      }),
      prisma.systemSetting.upsert({
        where: { key: roleKey },
        update: {
          value: JSON.stringify(roleNext),
          description: `Contador de visualizações da documentação por perfil (${roleSegment})`,
        },
        create: {
          key: roleKey,
          value: JSON.stringify(roleNext),
          description: `Contador de visualizações da documentação por perfil (${roleSegment})`,
        },
      }),
      prisma.user.update({
        where: { id: session.userId },
        data: {
          preferences: nextPreferences as Prisma.InputJsonValue,
        },
      }),
    ]);

    revalidateTag(POPULAR_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[docs.views.error]', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
