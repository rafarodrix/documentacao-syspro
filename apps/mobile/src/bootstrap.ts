import { MOBILE_ROUTES } from "./navigation";

export type MobileAppShell = {
  name: "@dosc-syspro/app-mobile";
  routes: typeof MOBILE_ROUTES;
  transport: {
    apiBaseUrlEnv: "MOBILE_API_BASE_URL";
    targetApp: "@dosc-syspro/app-api";
  };
  sharedPackages: ["@dosc-syspro/contracts", "@dosc-syspro/core", "@dosc-syspro/shared"];
};

export function createMobileAppShell(): MobileAppShell {
  return {
    name: "@dosc-syspro/app-mobile",
    routes: MOBILE_ROUTES,
    transport: {
      apiBaseUrlEnv: "MOBILE_API_BASE_URL",
      targetApp: "@dosc-syspro/app-api",
    },
    sharedPackages: ["@dosc-syspro/contracts", "@dosc-syspro/core", "@dosc-syspro/shared"],
  };
}