import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api, unwrap } from "../lib/api";
import { clearUserData } from "../lib/offlineDb";

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
  const isAuthenticated = computed(() => Boolean(user.value));

  async function bootstrap() {
    try {
      const data = await unwrap<{ user: User }>(api.get("/auth/me"));
      user.value = data.user;
    } catch {
      user.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function login(email: string, password: string) {
    const data = await unwrap<{ user: User }>(api.post("/auth/login", { email, password }));
    user.value = data.user;
  }

  async function register(name: string, email: string, password: string, preferredLanguage: "th" | "en") {
    const data = await unwrap<{ user: User }>(api.post("/auth/register", { name, email, password, preferredLanguage }));
    user.value = data.user;
  }

  async function logout() {
    await api.post("/auth/logout");
    user.value = null;
    await clearUserData();
  }

  async function updateProfile(payload: Partial<User>) {
    const data = await unwrap<{ user: User }>(api.patch("/auth/me", payload));
    user.value = data.user as User;
  }

  return { user, ready, isAuthenticated, bootstrap, login, register, logout, updateProfile };
});
