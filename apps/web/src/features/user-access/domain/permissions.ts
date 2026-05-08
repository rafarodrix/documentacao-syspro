import { ROLE_LABELS as APP_ROLE_LABELS } from "@dosc-syspro/core";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";

export const ROLE_LABELS: Record<UserRoleValue, string> = APP_ROLE_LABELS as Record<UserRoleValue, string>;
