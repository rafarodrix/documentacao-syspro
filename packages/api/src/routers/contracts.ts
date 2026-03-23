import { createRouter, defineMutation, defineQuery } from "../router";

export const contractsRouter = createRouter({
  list: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async () => ({ status: "not-wired", router: "contracts", procedure: "list" }),
  }),
  save: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => ({ status: "not-wired", router: "contracts", procedure: "save", input }),
  }),
});