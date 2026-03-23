import { createRouter, defineMutation, defineQuery } from "../router";

export const ticketsRouter = createRouter({
  list: defineQuery({
    auth: "authenticated",
    handler: async () => ({ status: "not-wired", router: "tickets", procedure: "list" }),
  }),
  details: defineQuery<{ ticketId: string }, unknown>({
    auth: "authenticated",
    handler: async ({ input }) => ({ status: "not-wired", router: "tickets", procedure: "details", input }),
  }),
  quickAction: defineMutation<{ ticketId: string; action: string }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ input }) => ({ status: "not-wired", router: "tickets", procedure: "quickAction", input }),
  }),
});