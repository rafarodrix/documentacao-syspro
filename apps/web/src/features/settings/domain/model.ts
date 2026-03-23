import type { SettingsInput } from "@dosc-syspro/contracts";
import type { SefazRoutesInput } from "@dosc-syspro/contracts";

export type SettingsSnapshot = SettingsInput;
export type SefazRoutesSnapshot = SefazRoutesInput;

export type SettingsActionSuccess<T = void> = T extends void
  ? {
      success: true;
      message?: string;
    }
  : {
      success: true;
      message?: string;
      data: T;
    };

export type SettingsActionFailure = {
  success: false;
  error: string;
};

export type SettingsActionResponse<T = void> = SettingsActionSuccess<T> | SettingsActionFailure;

export interface SettingsAdminViewData {
  rbacMatrixEnabled: boolean;
  sefazRoutes: SefazRoutesSnapshot;
}
