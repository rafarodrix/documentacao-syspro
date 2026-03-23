import type { SettingsInput } from "@dosc-syspro/contracts";
import type { SefazRoutesInput } from "@dosc-syspro/contracts";

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
