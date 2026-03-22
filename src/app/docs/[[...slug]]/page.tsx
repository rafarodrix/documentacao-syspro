import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { PageLastUpdate } from 'fumadocs-ui/layouts/docs/page';
import { DocsCategory } from 'fumadocs-ui/page.server';
import { notFound, redirect } from 'next/navigation';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';
import { Role } from '@prisma/client';
import { requireSession, canAccessByCompanySegment } from '@/lib/auth-helpers';
import { getRequiredSegmentsForDocSlug, isTechnicalManualSlug } from '@/core/config/docs-access';
import { SYSTEM_ROLES } from '@/core/config/route-access';
import { DocsPageFeedback } from '@/components/docs/DocsPageFeedback';
import { DocsHomePage } from '@/components/docs/DocsHomePage';
import { DocsPageViewTracker } from '@/components/docs/DocsPageViewTracker';
import { DocsNextSteps } from '@/components/docs/DocsNextSteps';

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
      <DocsPage toc={[]} full={false}>
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
  const docSlug = `/docs${slug.length ? `/${slug.join('/')}` : ''}`;
  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(lastUpdated))
    : null;
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;
  const showCategory = slug.length === 1;

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

  const nextSteps = contextPages
    .filter((_, index) => visibility[index])
    .slice(0, 4)
    .map((item) => ({
      href: item.url,
      title: String(item.data.title),
      description: typeof item.data.description === 'string' ? item.data.description : undefined,
    }));

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: 'clerk' }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {(status || owner || formattedLastUpdated) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {status ? <span className="rounded-full border border-border/70 px-2 py-1">Status: {status}</span> : null}
          {owner ? <span className="rounded-full border border-border/70 px-2 py-1">Owner: {owner}</span> : null}
          {formattedLastUpdated ? (
            <span className="rounded-full border border-border/70 px-2 py-1">Atualizado em: {formattedLastUpdated}</span>
          ) : null}
        </div>
      ) : null}
      <DocsBody>
        <MDXContent
          components={{
            ...defaultMdxComponents,
            a: createRelativeLink(source, page),
          }}
        />
        {showCategory ? <DocsCategory page={page} from={source} className="mt-8" /> : null}
        <DocsNextSteps items={nextSteps} />
        <DocsPageViewTracker href={docSlug} title={String(page.data.title)} />
        <DocsPageFeedback slug={docSlug} title={String(page.data.title)} />
        {lastUpdateDate ? <PageLastUpdate date={lastUpdateDate} /> : null}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
