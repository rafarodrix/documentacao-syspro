export type Route = "agent://setup" | "agent://support";

export function normalizeRoute(target?: string): Route {
  return target === "agent://support" ? "agent://support" : "agent://setup";
}
