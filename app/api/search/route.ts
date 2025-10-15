// Rota API para busca de documentos usando Fumadocs
// Utiliza o índice de busca gerado a partir do source de documentos

import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Garante que a rota seja sempre processada dinamicamente
export const dynamic = 'force-dynamic';

export const { GET } = createFromSource(source);