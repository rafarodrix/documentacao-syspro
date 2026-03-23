import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export async function GET(req: Request) {
  const api = createFromSource(source);
  const url = new URL(req.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return api.staticGET();
  }

  return api.GET(req);
}
