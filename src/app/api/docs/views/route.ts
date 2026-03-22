import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProtectedSession } from '@/lib/auth-helpers';
import type { Prisma } from '@prisma/client';

const POPULAR_KEY = 'docs:popular:global';

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

function getDocsPreferences(value: unknown): {
  lastRead?: { href: string; title: string; visitedAt: number };
} {
  if (!value || typeof value !== 'object') return {};
  const root = value as Record<string, unknown>;
  const docs = root.docs;
  if (!docs || typeof docs !== 'object') return {};
  const docsObj = docs as Record<string, unknown>;
  const lastRead = docsObj.lastRead;
  if (!lastRead || typeof lastRead !== 'object') return {};
  const readObj = lastRead as Record<string, unknown>;
  if (
    typeof readObj.href === 'string' &&
    typeof readObj.title === 'string' &&
    typeof readObj.visitedAt === 'number'
  ) {
    return {
      lastRead: {
        href: readObj.href,
        title: readObj.title,
        visitedAt: readObj.visitedAt,
      },
    };
  }
  return {};
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function GET() {
  const session = await getProtectedSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const [setting, user] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: POPULAR_KEY } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } }),
  ]);

  const stats = parseGlobalStats(setting?.value ?? null);
  const globalPopular = Object.entries(stats)
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastViewed - a.lastViewed;
    })
    .slice(0, 8)
    .map(([href, value]) => ({
      href,
      title: value.title,
      count: value.count,
      lastViewed: value.lastViewed,
    }));

  const { lastRead } = getDocsPreferences(user?.preferences);

  return NextResponse.json({
    ok: true,
    globalPopular,
    lastRead: lastRead ?? null,
  });
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

    const [setting, user] = await Promise.all([
      prisma.systemSetting.findUnique({
        where: { key: POPULAR_KEY },
        select: { value: true },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { preferences: true },
      }),
    ]);

    const current = parseGlobalStats(setting?.value ?? null);
    const previous = current[href];
    const next: GlobalDocStats = {
      ...current,
      [href]: {
        title: safeTitle || previous?.title || href,
        count: (previous?.count ?? 0) + 1,
        lastViewed: visitedAt,
      },
    };

    const entries = Object.entries(next)
      .sort(([, a], [, b]) => b.lastViewed - a.lastViewed)
      .slice(0, 400);
    const limited = Object.fromEntries(entries) as GlobalDocStats;

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
        where: { key: POPULAR_KEY },
        update: {
          value: JSON.stringify(limited),
          description: 'Contador global de visualizações da documentação',
        },
        create: {
          key: POPULAR_KEY,
          value: JSON.stringify(limited),
          description: 'Contador global de visualizações da documentação',
        },
      }),
      prisma.user.update({
        where: { id: session.userId },
        data: {
          preferences: nextPreferences as Prisma.InputJsonValue,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[docs.views.error]', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
