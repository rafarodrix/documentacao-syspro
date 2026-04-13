import "server-only";

import { fetchPlatformNotificationsGateway } from "@/features/settings/infrastructure/settings.gateway";

export async function getPlatformNotifications() {
  return fetchPlatformNotificationsGateway();
}
