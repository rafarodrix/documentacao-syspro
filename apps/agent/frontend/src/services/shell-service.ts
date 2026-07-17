import { GetCurrentTarget, ListNotifications } from "../bindings";
import { uistate } from "../../wailsjs/go/models";
import { normalizeRoute, type Route } from "../types/route";
import type { NotificationView } from "../types/agent-ui";

export async function fetchCurrentTarget(): Promise<Route> {
  const target = await GetCurrentTarget();
  return normalizeRoute(target);
}

export async function fetchNotifications(): Promise<NotificationView[]> {
  const notifications = await ListNotifications();
  return notifications.map(mapNotification);
}

export function mapNotifications(notifications: Array<uistate.Notification> | null | undefined): NotificationView[] {
  return (notifications ?? []).map(mapNotification);
}

function mapNotification(notification: uistate.Notification): NotificationView {
  return {
    id: notification.id ?? "",
    title: notification.title ?? "",
    message: notification.message ?? "",
    severity: notification.severity ?? "info",
    occurredAt: notification.occurred_at ? new Date(notification.occurred_at) : null,
  };
}
