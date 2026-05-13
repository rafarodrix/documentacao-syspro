import { z } from "zod";

export const storageModuleBindingSchema = z.object({
  bucketName: z.string().trim().default(""),
  publicBaseUrl: z.string().trim().default(""),
  prefix: z.string().trim().default(""),
});

export const storageR2SettingsSchema = z.object({
  provider: z.literal("r2").default("r2"),
  endpoint: z.string().trim().default(""),
  accessKeyId: z.string().trim().default(""),
  secretAccessKey: z.string().trim().default(""),
  signedUrlTtlSeconds: z.coerce.number().int().min(60).max(86400).default(900),
  fallbackToDatabase: z.boolean().default(true),
  defaultBucketName: z.string().trim().default(""),
  defaultPublicBaseUrl: z.string().trim().default(""),
  modules: z.object({
    tickets: storageModuleBindingSchema.default({
      bucketName: "",
      publicBaseUrl: "",
      prefix: "tickets",
    }),
    evolution: storageModuleBindingSchema.default({
      bucketName: "",
      publicBaseUrl: "",
      prefix: "evolution-media",
    }),
    chatwoot: storageModuleBindingSchema.default({
      bucketName: "",
      publicBaseUrl: "",
      prefix: "chatwoot-media",
    }),
    default: storageModuleBindingSchema.default({
      bucketName: "",
      publicBaseUrl: "",
      prefix: "shared",
    }),
  }).default({
    tickets: { bucketName: "", publicBaseUrl: "", prefix: "tickets" },
    evolution: { bucketName: "", publicBaseUrl: "", prefix: "evolution-media" },
    chatwoot: { bucketName: "", publicBaseUrl: "", prefix: "chatwoot-media" },
    default: { bucketName: "", publicBaseUrl: "", prefix: "shared" },
  }),
});

export const DEFAULT_STORAGE_R2_SETTINGS: z.output<typeof storageR2SettingsSchema> = {
  provider: "r2",
  endpoint: "",
  accessKeyId: "",
  secretAccessKey: "",
  signedUrlTtlSeconds: 900,
  fallbackToDatabase: true,
  defaultBucketName: "",
  defaultPublicBaseUrl: "",
  modules: {
    tickets: { bucketName: "", publicBaseUrl: "", prefix: "tickets" },
    evolution: { bucketName: "", publicBaseUrl: "", prefix: "evolution-media" },
    chatwoot: { bucketName: "", publicBaseUrl: "", prefix: "chatwoot-media" },
    default: { bucketName: "", publicBaseUrl: "", prefix: "shared" },
  },
};

export type StorageModuleBindingInput = z.input<typeof storageModuleBindingSchema>;
export type StorageModuleBinding = z.output<typeof storageModuleBindingSchema>;
export type StorageR2SettingsInput = z.input<typeof storageR2SettingsSchema>;
export type StorageR2Settings = z.output<typeof storageR2SettingsSchema>;
