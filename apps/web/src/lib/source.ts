import { docs } from '../../.source'
import { loader } from 'fumadocs-core/source';

// Configura o loader para apontar para a base URL correta dos seus documentos e converte a configuração do Fumadocs para o formato esperado pelo RootProvider.
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
