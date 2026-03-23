import type { ApiContext, ProcedureDefinition, RouterDefinition } from "./lib/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR",
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

async function executeProcedure<TInput, TOutput>(
  ctx: ApiContext,
  path: string,
  procedure: ProcedureDefinition<TInput, TOutput>,
  input: TInput,
): Promise<TOutput> {
  if (procedure.auth === "authenticated" && !ctx.session) {
    throw new ApiError("Nao autenticado.", "UNAUTHORIZED");
  }

  if (procedure.auth === "role") {
    if (!ctx.session) throw new ApiError("Nao autenticado.", "UNAUTHORIZED");
    if (!procedure.roles?.includes(ctx.session.role)) {
      throw new ApiError("Permissao negada.", "FORBIDDEN");
    }
  }

  ctx.logger.info("api.procedure.start", { path, kind: procedure.kind, requestId: ctx.requestId });

  try {
    const result = await procedure.handler({ ctx, input });
    ctx.logger.info("api.procedure.success", { path, requestId: ctx.requestId });
    return result;
  } catch (error) {
    ctx.logger.error("api.procedure.error", { path, requestId: ctx.requestId, error });
    if (error instanceof ApiError) throw error;
    throw new ApiError("Erro interno na procedure.", "INTERNAL_ERROR", error);
  }
}

export function defineQuery<TInput, TOutput>(
  config: Omit<ProcedureDefinition<TInput, TOutput>, "kind">,
): ProcedureDefinition<TInput, TOutput> {
  return { kind: "query", ...config };
}

export function defineMutation<TInput, TOutput>(
  config: Omit<ProcedureDefinition<TInput, TOutput>, "kind">,
): ProcedureDefinition<TInput, TOutput> {
  return { kind: "mutation", ...config };
}

export function createRouter<T extends RouterDefinition>(router: T): T {
  return router;
}

export function mergeRouters<T extends Record<string, RouterDefinition>>(routers: T) {
  return routers;
}

export async function callProcedure<TInput, TOutput>(args: {
  ctx: ApiContext;
  namespace: string;
  router: RouterDefinition;
  procedure: string;
  input: TInput;
}): Promise<TOutput> {
  const definition = args.router[args.procedure] as ProcedureDefinition<TInput, TOutput> | undefined;
  if (!definition) {
    throw new ApiError(`Procedure nao encontrada: ${args.namespace}.${args.procedure}`, "BAD_REQUEST");
  }

  return executeProcedure(args.ctx, `${args.namespace}.${args.procedure}`, definition, args.input);
}