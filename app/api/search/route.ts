// Rota API para busca de documentos usando Fumadocs
// Utiliza o índice de busca gerado a partir do source de documentos

import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source);
