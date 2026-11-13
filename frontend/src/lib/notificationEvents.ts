export const NOTIFICATION_REFRESH_EVENT = "finance:notification-refresh";

export function requestNotificationRefresh() {
  window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
}
