import { source } from '@/lib/source';
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
import { DocsSectionLinks } from '@/components/docs/DocsSectionLinks';
import { DocsMetaChips } from '@/components/docs/DocsMetaChips';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';
import { DocsReadingTime } from '@/components/docs/DocsReadingTime';
import { DocsPrevNextPreview } from '@/components/docs/DocsPrevNextPreview';
import { DocsKeyboardShortcuts } from '@/components/docs/DocsKeyboardShortcuts';
import { DocsTocScrollSpy } from '@/components/docs/DocsTocScrollSpy';
import { DocsSurface } from '@/components/docs/DocsSurface';
import { DocsReadingProgress } from '@/components/docs/DocsReadingProgress';
import { CodeTab, CodeTabs, Danger, Note, PlaygroundInline, Tip, Warning } from '@/components/docs/mdx';

function estimateReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
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
  const showCategory = slug.length === 1;

  const structuredData = (page.data as { structuredData?: { contents?: Array<{ content?: string }> } }).structuredData;
  const bodyText = structuredData?.contents?.map((item) => item.content ?? '').join(' ') ?? page.data.description ?? '';
  const readingTimeMinutes = estimateReadingTimeMinutes(`${String(page.data.title ?? '')} ${bodyText}`);

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

  const sectionLinks = visibleContextPages
    .slice(0, 8)
    .map((item) => ({
      href: item.url,
      title: String(item.data.title),
      description: typeof item.data.description === 'string' ? item.data.description : undefined,
      featureStatus: typeof item.data.featureStatus === 'string'
        ? item.data.featureStatus as FeatureStatus
        : undefined,
      sinceVersion: typeof item.data.sinceVersion === 'string' ? item.data.sinceVersion : undefined,
    }));

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
      breadcrumb={{ full: true }}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsReadingProgress />
      <DocsTitle>{page.data.title}</DocsTitle>
      <div className="mt-3">
        <DocsSurface className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <DocsFeatureBadge status={featureStatus} version={sinceVersion} />
            <DocsReadingTime minutes={readingTimeMinutes} />
          </div>
          <div className="mt-3">
            <DocsDescription>{page.data.description}</DocsDescription>
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
        {showCategory ? <DocsSectionLinks items={sectionLinks} /> : null}
        <DocsNextSteps items={nextSteps} />
        <DocsPrevNextPreview
          previous={previousPage ? {
            href: previousPage.url,
            title: String(previousPage.data.title),
            description: typeof previousPage.data.description === 'string' ? previousPage.data.description : undefined,
          } : undefined}
          next={nextPage ? {
            href: nextPage.url,
            title: String(nextPage.data.title),
            description: typeof nextPage.data.description === 'string' ? nextPage.data.description : undefined,
          } : undefined}
        />
        <DocsKeyboardShortcuts previousHref={previousPage?.url} nextHref={nextPage?.url} />
        <DocsTocScrollSpy />
        <DocsPageViewTracker href={docSlug} title={String(page.data.title)} />
        <DocsPageFeedback slug={docSlug} title={String(page.data.title)} />
        {lastUpdateDate ? <PageLastUpdate date={lastUpdateDate} /> : null}
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
