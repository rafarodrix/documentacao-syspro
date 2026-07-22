import type { AnyRouter } from "@trpc/server";

/**
 * Interface/tipo para o contrato do router tRPC entre cliente web e backend.
 * Permite que a aplicacao web consuma procedimentos tRPC sem importar diretamente o workspace apps/api.
 */
export type AppRouter = AnyRouter;
