import "server-only";

import { fetchPlatformNotificationsGateway } from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function getPlatformNotifications() {
  return fetchPlatformNotificationsGateway();
}
