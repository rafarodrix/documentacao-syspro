import { getProtectedSession } from '@/lib/auth-helpers';
import { getDocScopeFromUrl, isDocsScope } from '@/lib/docs-scope';
import { createDocsSourceForRole } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export async function GET(req: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const explicitScope = url.searchParams.get('scope');
  const referer = req.headers.get('referer');
  const refererScope = (() => {
    if (!referer) return null;

    try {
      return getDocScopeFromUrl(new URL(referer).pathname);
    } catch {
      return null;
    }
  })();
  const scope = explicitScope && isDocsScope(explicitScope) ? explicitScope : refererScope;
  const api = createFromSource(createDocsSourceForRole(session.role, scope));
  const query = url.searchParams.get('query');

  if (!query) {
    return api.staticGET();
  }

  return api.GET(req);
}
