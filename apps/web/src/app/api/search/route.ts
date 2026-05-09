import { getProtectedSession } from '@/lib/auth-helpers';
import { createDocsSourceForRole } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export async function GET(req: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const api = createFromSource(createDocsSourceForRole(session.role));
  const url = new URL(req.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return api.staticGET();
  }

  return api.GET(req);
}
