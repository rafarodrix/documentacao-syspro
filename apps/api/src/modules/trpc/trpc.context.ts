import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return {
    headers: req.headers,
    req,
    res,
  };
};

export type Context = ReturnType<typeof createContext>;
