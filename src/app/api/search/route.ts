import { source } from '@/src/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export async function GET(req: Request) {
  const { GET } = createFromSource(source);
  return GET(req);
}
