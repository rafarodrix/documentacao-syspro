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
import { requireSession } from '@/lib/auth-helpers';
import {
  canUserAccessDocUrl,
} from '@/app/docs/docs-access';
import { DocsHomePage } from '@/components/docs/home/DocsHomePage';
import { DocsPageViewTracker } from '@/components/docs/DocsPageViewTracker';
import { DocsMetaChips } from '@/components/docs/DocsMetaChips';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/DocsFeatureBadge';
import { DocsReadingTime } from '@/components/docs/DocsReadingTime';
import { DocsKeyboardShortcuts } from '@/components/docs/DocsKeyboardShortcuts';
import { DocsTocScrollSpy } from '@/components/docs/DocsTocScrollSpy';
import { DocsSurface } from '@/components/docs/DocsSurface';
import { DocsReadingProgress } from '@/components/docs/DocsReadingProgress';
import SuporteSection from '@/components/docs/SuporteSection';
import { CodeTab, CodeTabs, Danger, Note, PlaygroundInline, Tip, Warning } from '@/components/docs/mdx';
// Utilitários movidos para lib/docs-utils — sem lógica inline no page
import {
  estimateReadingTimeMinutes,
  formatSlugLabel,
  formatDateLong,
} from '@/lib/docs-utils';
import { currentUserHasPermission } from '@/features/user-access/application/current-user-access';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const session = await requireSession();
  const slug = params.slug ?? [];
  const canViewTechnicalDocs = await currentUserHasPermission("tools:all");
  const docUrl = `/docs${slug.length ? `/${slug.join('/')}` : ''}`;

  const canAccessCurrentDoc = await canUserAccessDocUrl({
    url: docUrl,
    role: session.role,
    userId: session.userId,
    canViewTechnical: canViewTechnicalDocs,
  });
  if (!canAccessCurrentDoc) {
    redirect("/docs");
  }

  const page = source.getPage(params.slug);
  if (!page) notFound();

  // -------------------------------------------------------------------------
  // Home page — lista páginas visíveis para o usuário
  // -------------------------------------------------------------------------
  if (slug.length === 0) {
    const allPages = source.getPages().filter((item) => item.url !== '/docs');

    // Promise.all paralelo: antes eram dois Promise.all sequenciais
    const visibility = await Promise.all(
      allPages.map((item) =>
        canUserAccessDocUrl({ url: item.url, role: session.role, userId: session.userId, canViewTechnical: canViewTechnicalDocs }),
      ),
    );

    const visiblePages = allPages
      .filter((_, i) => visibility[i])
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
            canViewTechnical={canViewTechnicalDocs}
            role={session.role}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  // -------------------------------------------------------------------------
  // Página de conteúdo
  // -------------------------------------------------------------------------
  const MDXContent = page.data.body;
  const lastUpdated = typeof page.data.lastUpdated === 'string' ? page.data.lastUpdated : undefined;
  const owner = typeof page.data.owner === 'string' ? page.data.owner : undefined;
  const status = typeof page.data.status === 'string' ? page.data.status : undefined;
  const featureStatus = typeof page.data.featureStatus === 'string'
    ? page.data.featureStatus as FeatureStatus
    : undefined;
  const sinceVersion = typeof page.data.sinceVersion === 'string' ? page.data.sinceVersion : undefined;
  const docSlug = docUrl;

  // Datas formatadas via lib/docs-utils (sem lógica inline)
  const formattedLastUpdated = formatDateLong(lastUpdated);
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;

  // Estimativa de tempo de leitura via lib/docs-utils
  const structuredData = (page.data as { structuredData?: { contents?: Array<{ content?: string }> } }).structuredData;
  const bodyText = structuredData?.contents?.map((item) => item.content ?? '').join(' ') ?? page.data.description ?? '';
  const readingTimeMinutes = estimateReadingTimeMinutes(`${String(page.data.title ?? '')} ${bodyText}`);

  // Breadcrumb
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

  // Navegação anterior/próxima
  // Promise.all paralelo com a visibilidade do pool de navegação
  const navigationPool = source.getPages().filter((item) => item.url !== '/docs');
  const navigationVisibility = await Promise.all(
    navigationPool.map((item) =>
      canUserAccessDocUrl({ url: item.url, role: session.role, userId: session.userId, canViewTechnical: canViewTechnicalDocs }),
    ),
  );
  const visibleNavigationPages = navigationPool.filter((_, i) => navigationVisibility[i]);
  const currentIndex = visibleNavigationPages.findIndex((item) => item.url === docSlug);
  const previousPage = currentIndex > 0 ? visibleNavigationPages[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < visibleNavigationPages.length - 1
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
      <DocsSurface className="border-border/45 bg-background/35 p-3.5 md:p-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/90">
          {breadcrumbItems.map((item, index) => (
            <div key={item.href} className="inline-flex items-center gap-1.5">
              {index > 0 ? <span className="text-muted-foreground/45">/</span> : null}
              <Link
                href={item.href}
                className="rounded-sm px-1 py-0.5 transition-colors hover:bg-accent/35 hover:text-foreground"
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-2.5">
          <DocsTitle>{page.data.title}</DocsTitle>
        </div>
        <div className="mt-2.5">
          <DocsDescription>{page.data.description}</DocsDescription>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DocsFeatureBadge status={featureStatus} version={sinceVersion} />
          <DocsReadingTime minutes={readingTimeMinutes} />
        </div>
      </DocsSurface>
      <div className="mt-3">
        <DocsMetaChips status={status} owner={owner} updatedAtLabel={formattedLastUpdated ?? undefined} />
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
        <DocsKeyboardShortcuts previousHref={previousPage?.url} nextHref={nextPage?.url} />
        <DocsTocScrollSpy />
        <DocsPageViewTracker href={docSlug} title={String(page.data.title)} />
        <SuporteSection
          modulo={String(page.data.title)}
          moduleDescription={typeof page.data.description === 'string' ? page.data.description : undefined}
          feedback={{ slug: docSlug, title: String(page.data.title) }}
        />
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
      images: [{ url: `/api/og/docs?slug=${encodeURIComponent((params.slug ?? []).join('/'))}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: String(page.data.title),
      description: typeof page.data.description === 'string' ? page.data.description : undefined,
      images: [`/api/og/docs?slug=${encodeURIComponent((params.slug ?? []).join('/'))}`],
    },
  };
}
