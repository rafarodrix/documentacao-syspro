import { createRouter, defineMutation, defineQuery } from "../router";

export const settingsRouter = createRouter({
  getAdminView: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async () => ({ status: "not-wired", router: "settings", procedure: "getAdminView" }),
  }),
  saveGeneral: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => ({ status: "not-wired", router: "settings", procedure: "saveGeneral", input }),
  }),
});