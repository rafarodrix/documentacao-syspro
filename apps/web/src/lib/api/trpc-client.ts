import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@dosc-syspro/contracts/trpc';
import { getBackendApiBaseUrl } from '../backend-api';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // No browser, chamadas vão para a própria origem, e o proxy/rewrite (ou chamadas diretas) resolve
    return '/api';
  }
  // No servidor (Server Actions / SSR), usamos a URL interna da API
  return getBackendApiBaseUrl();
};

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      async headers() {
        if (typeof window === 'undefined') {
          // No servidor, injetamos headers via cookies do Next.js se necessário
          const { headers: getHeaders } = await import('next/headers');
          const requestHeaders = await getHeaders();
          const cookie = requestHeaders.get('cookie');
          return {
            ...(cookie ? { cookie } : {}),
            'x-trpc-source': 'nextjs-server',
          };
        }
        return {
          'x-trpc-source': 'nextjs-client',
        };
      },
    }),
  ],
});
