import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../lib/api";
import { enqueue, getQueue, putTransaction, removeQueue, type LocalTransaction } from "../lib/offlineDb";
import { useAuthStore } from "./auth";

export const useSyncStore = defineStore("sync", () => {
  const online = ref(typeof navigator === "undefined" ? true : navigator.onLine);
  const auth = useAuthStore();
  const status = ref<"idle" | "syncing" | "error">("idle");
  const pending = ref(0);

  async function refreshPending() {
    pending.value = (await getQueue()).length;
  }

  async function queueChange(method: "create" | "update" | "delete", payload: Record<string, unknown>, local: LocalTransaction) {
    if (auth.isOfflineSession) throw new Error("offline-session-read-only");
    const clientRequestId = (payload.clientRequestId as string) || crypto.randomUUID();
    await putTransaction({ ...local, pending: true, id: local.id });
    await enqueue({
      clientRequestId,
      method,
      entity: "transaction",
      payload: { ...payload, clientRequestId },
      updatedAt: new Date().toISOString(),
    });
    await refreshPending();
    if (online.value) await flush();
  }

  async function flush() {
    if (!online.value || auth.isOfflineSession) return;
    const items = await getQueue();
    if (!items.length) return;
    status.value = "syncing";
    try {
      const { data } = await api.post("/sync", { operations: items });
      for (const result of data.data.results as { clientRequestId: string; status: string }[]) {
        if (result.status === "ok") await removeQueue(result.clientRequestId);
      }
      status.value = "idle";
    } catch {
      status.value = "error";
    }
    await refreshPending();
  }

  function listen() {
    window.addEventListener("online", () => {
      online.value = true;
      void (async () => {
        await auth.completePendingLogout();
        if (auth.isOfflineSession) await auth.refreshOnlineSession();
        await flush();
      })();
    });
    window.addEventListener("offline", () => {
      online.value = false;
      void auth.enterOfflineIfUnlocked();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void flush();
    });
  }

  return { online, status, pending, queueChange, flush, listen, refreshPending };
});
