import type { ChatwootBehaviorSettings } from "@dosc-syspro/contracts/chatwoot";

export type IntegrationDiagnostics = {
  success: boolean;
  chatwoot?: {
    configured: boolean;
    source: string | null;
    activeConnections: number;
    runtime: Record<string, boolean>;
    diagnostics: unknown;
    behavior?: ChatwootBehaviorSettings;
  };
  storage?: {
    provider: string;
    configured: boolean;
    source?: "database" | "env" | "none";
    fallbackToDatabase?: boolean;
    mode: "public_base_url" | "signed_url";
    endpointHost: string | null;
    bucketName: string | null;
    publicBaseUrl: string | null;
    signedUrlTtlSeconds: number;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    modules?: Record<string, { bucketName: string | null; prefix: string }>;
    issues: string[];
  };
  error?: string;
};
