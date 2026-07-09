import { createDocsSourceForRole, createDocsTreeForUser, source } from '@/lib/source';
import { findNeighbour } from 'fumadocs-core/page-tree';
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
import { canUserAccessDocUrl } from '@/lib/docs-access';
import { DocsPageViewTracker } from '@/components/docs/docs-page-view-tracker';
import { DocsMetaChips } from '@/components/docs/docs-meta-chips';
import { DocsFeatureBadge, type FeatureStatus } from '@/components/docs/docs-feature-badge';
import { DocsReadingTime } from '@/components/docs/docs-reading-time';
import { DocsKeyboardShortcuts } from '@/components/docs/docs-keyboard-shortcuts';
import { DocsTocScrollSpy } from '@/components/docs/docs-toc-scroll-spy';
import { DocsSurface } from '@/components/docs/docs-surface';
import { DocsReadingProgress } from '@/components/docs/docs-reading-progress';
import { DocsPrintShell } from '@/components/docs/print';
import { getSettingsAction } from '@/features/settings/application/settings-read.queries';
import SuporteSection from '@/components/docs/suporte-section';
import { CodeTab, CodeTabs, Danger, Note, PlaygroundInline, Tip, Warning } from '@/components/docs/mdx';
import {
  estimateReadingTimeMinutes,
  formatDateLong,
} from '@/lib/docs-utils';
import { DOCS_BASE_PATH, getDefaultDocsRouteForRole } from '@/lib/docs-scope';

export default async function PortalDocsPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const session = await requireSession();
  const slug = params.slug ?? [];
  const docUrl = `${DOCS_BASE_PATH}${slug.length ? `/${slug.join('/')}` : ''}`;

  if (slug.length === 0) {
    redirect(getDefaultDocsRouteForRole(session.role));
  }

  const canAccessCurrentDoc = await canUserAccessDocUrl({
    url: docUrl,
    userId: session.userId,
    role: session.role,
  });
  if (!canAccessCurrentDoc) {
    redirect(getDefaultDocsRouteForRole(session.role));
  }

  const docsSource = createDocsSourceForRole(session.role);
  const page = docsSource.getPage(slug);
  if (!page) {
    const expectedPrefix = slug.length > 0
      ? `${DOCS_BASE_PATH}/${slug.join('/')}/`
      : `${DOCS_BASE_PATH}/`;
      
    const candidatePages = docsSource.getPages().filter((item) => item.url.startsWith(expectedPrefix));
    
    for (const candidate of candidatePages) {
      const canAccessCandidate = await canUserAccessDocUrl({
        url: candidate.url,
        userId: session.userId,
        role: session.role,
      });
      if (canAccessCandidate) {
        redirect(candidate.url);
      }
    }

    notFound();
  }

  const MDXContent = page.data.body;
  const lastUpdated = typeof page.data.lastUpdated === 'string' ? page.data.lastUpdated : undefined;
  const owner = typeof page.data.owner === 'string' ? page.data.owner : undefined;
  const status = typeof page.data.status === 'string' ? page.data.status : undefined;
  const featureStatus = typeof page.data.featureStatus === 'string'
    ? page.data.featureStatus as FeatureStatus
    : undefined;
  const sinceVersion = typeof page.data.sinceVersion === 'string' ? page.data.sinceVersion : undefined;
  const docSlug = docUrl;

  const formattedLastUpdated = formatDateLong(lastUpdated);
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;
  const structuredData = (page.data as { structuredData?: { contents?: Array<{ content?: string }> } }).structuredData;
  const bodyText = structuredData?.contents?.map((item) => item.content ?? '').join(' ') ?? page.data.description ?? '';
  const readingTimeMinutes = estimateReadingTimeMinutes(`${String(page.data.title ?? '')} ${bodyText}`);
  const docsTree = await createDocsTreeForUser(session.userId, session.role);
  const neighbours = findNeighbour(docsTree, docSlug, { separateRoot: true });
  const settingsResult = await getSettingsAction();
  const printContactInfo = {
    companyName: settingsResult.success ? settingsResult.data.companyName : "",
    siteUrl: settingsResult.success ? settingsResult.data.supportSiteUrl : "",
    supportEmail: settingsResult.success ? settingsResult.data.supportEmail : "",
    supportPhone: settingsResult.success ? settingsResult.data.supportPhone : "",
  };

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{ enabled: false }}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsReadingProgress />
      <DocsBody className="space-y-8">
        <DocsPrintShell title={String(page.data.title)} contactInfo={printContactInfo}>
          <DocsSurface className="docs-print-page-header p-3.5 md:p-5">
            <div>
              <DocsTitle>{page.data.title}</DocsTitle>
            </div>
            <div className="mt-2.5">
              <DocsDescription>{page.data.description}</DocsDescription>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DocsFeatureBadge status={featureStatus} version={sinceVersion} />
              <DocsReadingTime minutes={readingTimeMinutes} />
              <DocsMetaChips status={status} owner={owner} updatedAtLabel={formattedLastUpdated ?? undefined} />
            </div>
          </DocsSurface>
          <DocsSurface className="bg-background/30 p-5 md:p-7 docs-content-surface">
            <MDXContent
              components={{
                ...defaultMdxComponents,
                a: createRelativeLink(docsSource, page),
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
          {lastUpdateDate ? (
            <DocsSurface className="bg-background/20 px-3 py-2 md:px-3.5 md:py-2.5">
              <PageLastUpdate date={lastUpdateDate} className="text-xs text-muted-foreground/85" />
            </DocsSurface>
          ) : null}
        </DocsPrintShell>
        <DocsKeyboardShortcuts previousHref={neighbours.previous?.url} nextHref={neighbours.next?.url} />
        <DocsTocScrollSpy />
        <DocsPageViewTracker href={docSlug} title={String(page.data.title)} />
        {!(
          page.file.name === 'index' || 
          slug.includes('suporte') || 
          (page.data as any).hideSupportSection === true || 
          (page.data as any).showSupport === false
        ) && (
          <SuporteSection
            modulo={String(page.data.title)}
            moduleDescription={typeof page.data.description === 'string' ? page.data.description : undefined}
            feedback={{ slug: docSlug, title: String(page.data.title) }}
          />
        )}
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
  const slug = params.slug ?? [];
  if (slug.length === 0) {
    return {
      title: "Documentacao",
      description: "Central de documentacao do portal.",
    };
  }

  const page = source.getPage(slug);
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
