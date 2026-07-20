export type HealthStatus =
  | "HEALTHY"
  | "WARNING"
  | "CRITICAL"
  | "UNKNOWN"
  | "UPDATING"
  | "DISABLED";

export type ComponentReason = {
  code: string;
  severity: HealthStatus;
  title: string;
  description?: string;
  recommendation?: string;
};

export interface ManagedService {
  id: string;
  deviceId: string;
  type:
    | "TRILINK_AGENT"
    | "RUSTDESK"
    | "RATHOLE"
    | "UPDATER"
    | "RCLONE"
    | "BACKUP_AGENT";

  version?: string;
  runtimeStatus: "RUNNING" | "STOPPED" | "UNKNOWN";
  healthStatus: HealthStatus;

  complianceStatus:
    | "COMPLIANT"
    | "OUT_OF_SYNC"
    | "NOT_APPLICABLE";

  lastCheckedAt: string;
  reasons: ComponentReason[];
}
