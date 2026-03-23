import type { SettingsInput } from "@/core/application/schema/settings-schema";
import type { SefazRoutesInput } from "@/core/application/schema/sefaz-routes-schema";

export type SettingsSnapshot = SettingsInput;
export type SefazRoutesSnapshot = SefazRoutesInput;
export type SettingsActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export interface SettingsAdminViewData {
  rbacMatrixEnabled: boolean;
  sefazRoutes: SefazRoutesSnapshot;
}
