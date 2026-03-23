import { createRouter, defineMutation, defineQuery } from "../router";

export const companyRouter = createRouter({
  list: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async () => ({ status: "not-wired", router: "company", procedure: "list" }),
  }),
  byId: defineQuery<{ companyId: string }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ input }) => ({ status: "not-wired", router: "company", procedure: "byId", input }),
  }),
  save: defineMutation<{ companyId?: string; payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ input }) => ({ status: "not-wired", router: "company", procedure: "save", input }),
  }),
});