import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api, unwrap } from "../lib/api";
import { clearUserData, getUnlockedOfflineSnapshot, hasOfflineVault, lockOfflineVault, readOfflineVaultMetadata, unlockOfflineVault, type OfflineSnapshot } from "../lib/offlineDb";

const PENDING_LOGOUT_KEY = "pfa-pending-server-logout";

export interface User {
  id: string;
  name: string;
  email: string;
  preferredLanguage: "th" | "en";
  preferredTheme: "system" | "light" | "dark";
  currency: "THB";
  timezone: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const ready = ref(false);
  const offlineUnlockRequired = ref(false);
  const isOfflineSession = ref(false);
  const offlineSnapshot = ref<OfflineSnapshot | null>(null);
  const isAuthenticated = computed(() => Boolean(user.value));

  async function setOnlineUser(nextUser: User) {
    const metadata = await readOfflineVaultMetadata().catch(() => null);
    if (metadata && metadata.userId !== nextUser.id) await clearUserData().catch(() => undefined);
    user.value = nextUser;
    offlineUnlockRequired.value = false;
    isOfflineSession.value = false;
    offlineSnapshot.value = null;
  }

  async function completePendingLogout() {
    let pending = false;
    try { pending = localStorage.getItem(PENDING_LOGOUT_KEY) === "1"; } catch { return true; }
    if (!pending) return true;
    try {
      await api.post("/auth/logout");
      localStorage.removeItem(PENDING_LOGOUT_KEY);
      return true;
    } catch (cause) {
      if ((cause as { response?: { status?: number } })?.response?.status === 401) {
        localStorage.removeItem(PENDING_LOGOUT_KEY);
        return true;
      }
      return false;
    }
  }

  async function bootstrap() {
    try {
      if (!(await completePendingLogout())) {
        user.value = null;
        return;
      }
      const data = await unwrap<{ user: User }>(api.get("/auth/me"));
      await setOnlineUser(data.user);
    } catch (cause) {
      user.value = null;
      const hasNetworkFailure = typeof navigator !== "undefined" && !navigator.onLine;
      const status = (cause as { response?: { status?: number } })?.response?.status;
      if (hasNetworkFailure || status === undefined || status >= 500) {
        offlineUnlockRequired.value = await hasOfflineVault().catch(() => false);
      }
    } finally {
      ready.value = true;
    }
  }

  async function unlockOffline(passphrase: string) {
    const snapshot = await unlockOfflineVault(passphrase);
    offlineSnapshot.value = snapshot;
    user.value = snapshot.user as User;
    isOfflineSession.value = true;
    offlineUnlockRequired.value = false;
  }

  async function enterOfflineIfUnlocked() {
    const snapshot = await getUnlockedOfflineSnapshot();
    if (!snapshot) {
      const vaultAvailable = await hasOfflineVault().catch(() => false);
      user.value = null;
      offlineSnapshot.value = null;
      isOfflineSession.value = false;
      offlineUnlockRequired.value = vaultAvailable;
      return false;
    }
    offlineSnapshot.value = snapshot;
    user.value = snapshot.user as User;
    isOfflineSession.value = true;
    offlineUnlockRequired.value = false;
    return true;
  }

  async function refreshOnlineSession() {
    try {
      const data = await unwrap<{ user: User }>(api.get("/auth/me"));
      await setOnlineUser(data.user);
      return true;
    } catch {
      return false;
    }
  }

  async function lockOffline() {
    const wasOfflineSession = isOfflineSession.value;
    lockOfflineVault();
    if (!wasOfflineSession) return;
    user.value = null;
    offlineSnapshot.value = null;
    isOfflineSession.value = false;
    offlineUnlockRequired.value = await hasOfflineVault().catch(() => false);
  }

  async function login(email: string, password: string) {
    const data = await unwrap<{ user: User }>(api.post("/auth/login", { email, password }));
    try { localStorage.removeItem(PENDING_LOGOUT_KEY); } catch { /* Ignore unavailable browser storage. */ }
    await setOnlineUser(data.user);
  }

  async function register(name: string, email: string, password: string, preferredLanguage: "th" | "en") {
    const data = await unwrap<{ user: User }>(api.post("/auth/register", { name, email, password, preferredLanguage }));
    try { localStorage.removeItem(PENDING_LOGOUT_KEY); } catch { /* Ignore unavailable browser storage. */ }
    await setOnlineUser(data.user);
  }

  async function logout() {
    if (!isOfflineSession.value) {
      await api.post("/auth/logout");
    } else {
      try { localStorage.setItem(PENDING_LOGOUT_KEY, "1"); } catch { /* The local vault is still cleared below. */ }
      if (navigator.onLine) await completePendingLogout();
    }
    user.value = null;
    isOfflineSession.value = false;
    offlineUnlockRequired.value = false;
    offlineSnapshot.value = null;
    await clearUserData();
  }

  async function updateProfile(payload: Partial<User>) {
    const data = await unwrap<{ user: User }>(api.patch("/auth/me", payload));
    user.value = data.user as User;
  }

  return { user, ready, isAuthenticated, offlineUnlockRequired, isOfflineSession, offlineSnapshot, bootstrap, unlockOffline, enterOfflineIfUnlocked, refreshOnlineSession, completePendingLogout, lockOffline, login, register, logout, updateProfile };
});
