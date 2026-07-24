import { CLIENT_ROLES, type AppRole } from "@dosc-syspro/core";

export function canUseChatwootLazyLauncher(role: AppRole | null | undefined): boolean {
  return role ? CLIENT_ROLES.includes(role) : false;
}
