export type ApiLogger = {
  info: (event: string, meta?: Record<string, unknown>) => void;
  error: (event: string, meta?: Record<string, unknown>) => void;
};

export type AuthLikeSession = {
  userId: string;
  role: string;
  companyIds?: string[];
} | null;

export type ApiContext = {
  requestId: string;
  session: AuthLikeSession;
  logger: ApiLogger;
};

export type ProcedureHandler<TInput = void, TOutput = unknown> = (args: {
  ctx: ApiContext;
  input: TInput;
}) => Promise<TOutput>;

export type ProcedureDefinition<TInput = void, TOutput = unknown> = {
  kind: "query" | "mutation";
  auth: "public" | "authenticated" | "role";
  roles?: string[];
  handler: ProcedureHandler<TInput, TOutput>;
};

export type RouterDefinition = Record<string, ProcedureDefinition<any, any>>;