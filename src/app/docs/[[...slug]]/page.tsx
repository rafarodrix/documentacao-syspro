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

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent
          components={{
            ...defaultMdxComponents,
            a: createRelativeLink(source, page),
          }}
        />
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
