import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound, redirect } from 'next/navigation';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';
import { Role } from '@prisma/client';
import { requireSession, canAccessByCompanySegment } from '@/lib/auth-helpers';
import { getRequiredSegmentsForDocSlug, isTechnicalManualSlug } from '@/core/config/docs-access';
import { SYSTEM_ROLES } from '@/core/config/route-access';
import { DocsPageFeedback } from '@/components/docs/DocsPageFeedback';

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

  const MDXContent = page.data.body;
  const lastUpdated = typeof page.data.lastUpdated === 'string' ? page.data.lastUpdated : undefined;
  const owner = typeof page.data.owner === 'string' ? page.data.owner : undefined;
  const status = typeof page.data.status === 'string' ? page.data.status : undefined;
  const docSlug = `/docs${slug.length ? `/${slug.join('/')}` : ''}`;
  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(lastUpdated))
    : null;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
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
        <DocsPageFeedback slug={docSlug} title={String(page.data.title)} />
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
