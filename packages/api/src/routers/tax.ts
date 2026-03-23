import { createRouter, defineMutation, defineQuery } from "../router";

export const taxRouter = createRouter({
  overview: defineQuery({
    auth: "authenticated",
    handler: async () => ({ status: "not-wired", router: "tax", procedure: "overview" }),
  }),
  syncChunk: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => ({ status: "not-wired", router: "tax", procedure: "syncChunk", input }),
  }),
});