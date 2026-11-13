import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../lib/api";

export interface FinanceNotification {
  id: string;
  type: "budget_threshold" | "recurring_due";
  data: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export const useNotificationStore = defineStore("notifications", () => {
  const items = ref<FinanceNotification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref("");
  const knownIds = new Set<string>();
  let initialized = false;

  async function load(limit = 50) {
    loading.value = true;
    error.value = "";
    try {
      const response = await api.get("/notifications", { params: { limit } });
      const nextItems = response.data.data.items as FinanceNotification[];
      const addedItems = initialized ? nextItems.filter((item) => !knownIds.has(item.id)) : [];
      for (const item of nextItems) knownIds.add(item.id);
      initialized = true;
      items.value = nextItems;
      unreadCount.value = response.data.data.unreadCount;
      return addedItems;
    } catch {
      error.value = "notificationsUnavailable";
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id: string) {
    const item = items.value.find((notification) => notification.id === id);
    if (item?.readAt) return;
    await api.patch(`/notifications/${id}/read`);
    if (item) item.readAt = new Date().toISOString();
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  }

  async function markAllRead() {
    if (!unreadCount.value) return;
    await api.post("/notifications/read-all");
    const readAt = new Date().toISOString();
    for (const item of items.value) item.readAt ??= readAt;
    unreadCount.value = 0;
  }

  async function remove(id: string) {
    await api.delete(`/notifications/${id}`);
    const item = items.value.find((notification) => notification.id === id);
    if (item && !item.readAt) unreadCount.value = Math.max(0, unreadCount.value - 1);
    items.value = items.value.filter((notification) => notification.id !== id);
    knownIds.delete(id);
  }

  async function removeAll() {
    await api.delete("/notifications");
    items.value = [];
    unreadCount.value = 0;
    knownIds.clear();
  }

  return { items, unreadCount, loading, error, load, markRead, markAllRead, remove, removeAll };
});
