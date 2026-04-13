import { prisma } from "@dosc-syspro/database";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

function ensureObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("Payload invalido para configuracoes.", "BAD_REQUEST");
  }
  return value as Record<string, unknown>;
}

function serializeSettingValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export const settingsRouter = createRouter({
  getAdminView: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async () => {
      const keys = [
        "remote.module.settings",
        "tax.sync.settings",
        "tickets.dashboard.settings",
      ];

      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: keys } },
        orderBy: [{ key: "asc" }],
      });

      return {
        keys,
        items: settings,
      };
    },
  }),
  saveGeneral: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER"],
    handler: async ({ input }) => {
      const payload = ensureObject(input.payload);
      const entries = Object.entries(payload);

      if (entries.length === 0) {
        throw new ApiError("Payload vazio para salvar configuracoes.", "BAD_REQUEST");
      }

      const updatedKeys: string[] = [];

      for (const [key, value] of entries) {
        const normalizedKey = key.trim();
        if (!normalizedKey) continue;

        await prisma.systemSetting.upsert({
          where: { key: normalizedKey },
          update: {
            value: serializeSettingValue(value),
          },
          create: {
            key: normalizedKey,
            value: serializeSettingValue(value),
          },
        });

        updatedKeys.push(normalizedKey);
      }

      return {
        updatedKeys,
        count: updatedKeys.length,
      };
    },
  }),
});