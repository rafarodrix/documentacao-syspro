// Config
export { SYSTEM_PERMISSIONS, ROLE_LABELS, ACCESS_MATRIX } from "./config/permissions";
export type { PermissionKey, AccessControlMatrix } from "./config/permissions";

// RBAC
export { hasPermission, hasAnyPermission } from "./rbac";

// Re-export all schemas
export * from "./application/schemas/user-schema";
export * from "./application/schemas/company-schema";
export * from "./application/schemas/contract-schema";
export * from "./application/schemas/address-schema";
export * from "./application/schemas/settings-schema";
export * from "./application/schemas/documento-schema";
export * from "./application/schemas/ticket-form.schema";

// DTOs
export * from "./application/dto/result.dto";
export * from "./application/dto/ticket.dto";

// Entities
export * from "./domain/entities/release.entity";
export * from "./domain/entities/ticket.entity";
