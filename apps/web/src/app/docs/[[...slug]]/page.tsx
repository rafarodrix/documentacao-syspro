import { source } from '@/lib/source';
import Link from 'next/link';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle
} from 'fumadocs-ui/page';
import { PageLastUpdate } from 'fumadocs-ui/layouts/docs/page';
import { notFound, redirect } from 'next/navigation';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';
import { Role } from '@prisma/client';
import { requireSession } from '@/lib/auth-helpers';
import { canAccessByCompanySegment } from '@/features/company/application/company-segment-access';
import { getRequiredSegmentsForDocSlug, isTechnicalManualSlug } from '@/app/docs/docs-access';
import { SYSTEM_ROLES } from '@dosc-syspro/core';
import { DocsPageFeedback } from '@/components/docs/DocsPageFeedback';
import { DocsHomePage } from '@/components/docs/DocsHomePage';
import { DocsPageViewTracker } from '@/components/docs/DocsPageViewTracker';
import { DocsNextSteps } from '@/components/docs/DocsNextSteps';
import { DocsMetaChips } from '@/components/docs/DocsMetaChips';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';
import { DocsReadingTime } from '@/components/docs/DocsReadingTime';
import { DocsKeyboardShortcuts } from '@/components/docs/DocsKeyboardShortcuts';
import { DocsTocScrollSpy } from '@/components/docs/DocsTocScrollSpy';
import { DocsSurface } from '@/components/docs/DocsSurface';
import { DocsReadingProgress } from '@/components/docs/DocsReadingProgress';
import { CodeTab, CodeTabs, Danger, Note, PlaygroundInline, Tip, Warning } from '@/components/docs/mdx';

function estimateReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function formatSlugLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const session = await requireSession();
  const slug = params.slug ?? [];

  if (isTechnicalManualSlug(slug) && !SYSTEM_ROLES.includes(session.role)) {
    redirect("/docs");
  }

  if (session.role === Role.CLIENTE_ADMIN || session.role === Role.CLIENTE_USER) {
    const requiredSegments = getRequiredSegmentsForDocSlug(slug);
    const hasAccess = await canAccessByCompanySegment(session.userId, requiredSegments);
    if (!hasAccess) {
      redirect("/docs");
    }
  }

  const page = source.getPage(params.slug);
  if (!page) notFound();

  if (slug.length === 0) {
    const allPages = source.getPages().filter((item) => item.url !== '/docs');

    const visibility = await Promise.all(
      allPages.map(async (item) => {
        if (!SYSTEM_ROLES.includes(session.role) && item.url.startsWith('/docs/manuais-tecnicos')) return false;

        if (session.role === Role.CLIENTE_ADMIN || session.role === Role.CLIENTE_USER) {
          const relativeSlug = item.url.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
          const requiredSegments = getRequiredSegmentsForDocSlug(relativeSlug);
          if (requiredSegments.length === 0) return true;
          return canAccessByCompanySegment(session.userId, requiredSegments);
        }

        return true;
      }),
    );

    const visiblePages = allPages
      .filter((_, index) => visibility[index])
      .map((item) => ({
        href: item.url,
        title: String(item.data.title),
        description: typeof item.data.description === 'string' ? item.data.description : undefined,
        lastUpdated: typeof item.data.lastUpdated === 'string' ? item.data.lastUpdated : undefined,
      }));

    return (
      <DocsPage toc={[]} full breadcrumb={{ full: true }}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <DocsHomePage
            pages={visiblePages}
            canViewTechnical={SYSTEM_ROLES.includes(session.role)}
            role={session.role}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  const MDXContent = page.data.body;
  const lastUpdated = typeof page.data.lastUpdated === 'string' ? page.data.lastUpdated : undefined;
  const owner = typeof page.data.owner === 'string' ? page.data.owner : undefined;
  const status = typeof page.data.status === 'string' ? page.data.status : undefined;
  const featureStatus = typeof page.data.featureStatus === 'string'
    ? page.data.featureStatus as FeatureStatus
    : undefined;
  const sinceVersion = typeof page.data.sinceVersion === 'string' ? page.data.sinceVersion : undefined;
  const docSlug = `/docs${slug.length ? `/${slug.join('/')}` : ''}`;
  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(lastUpdated))
    : null;
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;

  const structuredData = (page.data as { structuredData?: { contents?: Array<{ content?: string }> } }).structuredData;
  const bodyText = structuredData?.contents?.map((item) => item.content ?? '').join(' ') ?? page.data.description ?? '';
  const readingTimeMinutes = estimateReadingTimeMinutes(`${String(page.data.title ?? '')} ${bodyText}`);
  const breadcrumbItems = slug.reduce<Array<{ href: string; label: string }>>(
    (acc, segment) => {
      const parentPath = acc.length === 1 ? '' : acc[acc.length - 1].href.replace(/^\/docs/, '');
      const nextPath = `${parentPath}/${segment}`.replace(/^\/+/, '');
      const targetSlug = nextPath.split('/').filter(Boolean);
      const targetPage = source.getPage(targetSlug);

      acc.push({
        href: `/docs/${nextPath}`,
        label: targetPage ? String(targetPage.data.title) : formatSlugLabel(segment),
      });

      return acc;
    },
    [{ href: '/docs', label: 'Documentacao' }],
  );

  const allPages = source.getPages().filter((item) => item.url !== docSlug);
  const sameSectionPrefix = slug[0] ? `/docs/${slug[0]}` : '/docs';
  const contextPages = allPages
    .filter((item) => item.url.startsWith(sameSectionPrefix))
    .slice(0, 30);

  const visibility = await Promise.all(
    contextPages.map(async (item) => {
      if (!SYSTEM_ROLES.includes(session.role) && item.url.startsWith('/docs/manuais-tecnicos')) return false;
      if (session.role === Role.CLIENTE_ADMIN || session.role === Role.CLIENTE_USER) {
        const relativeSlug = item.url.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
        const requiredSegments = getRequiredSegmentsForDocSlug(relativeSlug);
        if (requiredSegments.length === 0) return true;
        return canAccessByCompanySegment(session.userId, requiredSegments);
      }
      return true;
    }),
  );

  const visibleContextPages = contextPages.filter((_, index) => visibility[index]);

  const nextSteps = visibleContextPages
    .slice(0, 4)
    .map((item) => ({
      href: item.url,
      title: String(item.data.title),
      description: typeof item.data.description === 'string' ? item.data.description : undefined,
      featureStatus: typeof item.data.featureStatus === 'string'
        ? item.data.featureStatus as FeatureStatus
        : undefined,
      sinceVersion: typeof item.data.sinceVersion === 'string' ? item.data.sinceVersion : undefined,
    }));

  const navigationPool = source.getPages().filter((item) => item.url !== '/docs');
  const navigationVisibility = await Promise.all(
    navigationPool.map(async (item) => {
      if (!SYSTEM_ROLES.includes(session.role) && item.url.startsWith('/docs/manuais-tecnicos')) return false;
      if (session.role === Role.CLIENTE_ADMIN || session.role === Role.CLIENTE_USER) {
        const relativeSlug = item.url.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
        const requiredSegments = getRequiredSegmentsForDocSlug(relativeSlug);
        if (requiredSegments.length === 0) return true;
        return canAccessByCompanySegment(session.userId, requiredSegments);
      }
      return true;
    }),
  );

  const visibleNavigationPages = navigationPool.filter((_, index) => navigationVisibility[index]);
  const currentIndex = visibleNavigationPages.findIndex((item) => item.url === docSlug);
  const previousPage = currentIndex > 0 ? visibleNavigationPages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < visibleNavigationPages.length - 1
    ? visibleNavigationPages[currentIndex + 1]
    : null;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{ enabled: false }}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsReadingProgress />
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/90">
        {breadcrumbItems.map((item, index) => (
          <div key={item.href} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span className="text-muted-foreground/50">/</span> : null}
            <Link
              href={item.href}
              className="rounded-sm px-1 py-0.5 transition-colors hover:bg-accent/35 hover:text-foreground"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>
      <DocsTitle>{page.data.title}</DocsTitle>
      <div className="mt-3">
        <DocsSurface className="p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <DocsFeatureBadge status={featureStatus} version={sinceVersion} />
            <DocsReadingTime minutes={readingTimeMinutes} />
          </div>
          <div className="mt-3">
            <DocsDescription>{page.data.description}</DocsDescription>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border border-border/40 bg-background/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Navegacao</p>
              <p className="mt-1 text-xs text-muted-foreground/85">Use o menu lateral para navegar entre modulos e guias.</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Busca Rapida</p>
              <p className="mt-1 text-xs font-medium">Ctrl + K</p>
              <p className="text-xs text-muted-foreground/85">Encontre paginas e secoes sem sair da leitura.</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/45 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Leitura</p>
              <p className="mt-1 text-xs text-muted-foreground/85">Use o indice da direita para ir direto ao bloco da secao.</p>
            </div>
          </div>
          <div className="mt-3">
            <DocsMetaChips status={status} owner={owner} updatedAtLabel={formattedLastUpdated ?? undefined} />
          </div>
        </DocsSurface>
      </div>
      <DocsBody className="space-y-8">
        <DocsSurface className="p-5 md:p-7 docs-content-surface">
          <MDXContent
            components={{
              ...defaultMdxComponents,
              a: createRelativeLink(source, page),
              Tip,
              Note,
              Warning,
              Danger,
              CodeTabs,
              CodeTab,
              PlaygroundInline,
            }}
          />
        </DocsSurface>
        <DocsNextSteps items={nextSteps} />
        <DocsKeyboardShortcuts previousHref={previousPage?.url} nextHref={nextPage?.url} />
        <DocsTocScrollSpy />
        <DocsPageViewTracker href={docSlug} title={String(page.data.title)} />
        <DocsPageFeedback slug={docSlug} title={String(page.data.title)} />
        {lastUpdateDate ? (
          <DocsSurface className="border-border/35 bg-background/25 px-3 py-2 md:px-3.5 md:py-2.5">
            <PageLastUpdate date={lastUpdateDate} className="text-xs text-muted-foreground/85" />
          </DocsSurface>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params = source.generateParams();
  return [{ slug: [] as string[] }, ...params];
}

export const dynamicParams = false;

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: String(page.data.title),
      description: typeof page.data.description === 'string' ? page.data.description : undefined,
      images: [
        {
          url: `/api/og/docs?slug=${encodeURIComponent((params.slug ?? []).join('/'))}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: String(page.data.title),
      description: typeof page.data.description === 'string' ? page.data.description : undefined,
      images: [`/api/og/docs?slug=${encodeURIComponent((params.slug ?? []).join('/'))}`],
    },
  };
}
