<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import NavIcon from "@/components/NavIcon.vue";
import { useAuthStore } from "@/stores/auth";
import { useSyncStore } from "@/stores/sync";
import { useToastStore } from "@/stores/toast";
import { useNotificationStore } from "@/stores/notifications";

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const sync = useSyncStore();
const toast = useToastStore();
const notifications = useNotificationStore();
const userInitial = computed(() => auth.user?.name?.trim()?.charAt(0)?.toUpperCase() || "$");
let notificationRefresh: number | undefined;

onMounted(() => {
  void notifications.load(20);
  notificationRefresh = window.setInterval(() => void notifications.load(20), 60_000);
});
onUnmounted(() => {
  if (notificationRefresh !== undefined) window.clearInterval(notificationRefresh);
});

const items = computed(() => [
  { to: "/", label: t("nav.home"), icon: "home" as const },
  { to: "/transactions", label: t("nav.transactions"), icon: "list" as const },
  { to: "/transactions/new", label: t("nav.add"), icon: "add" as const, primary: true },
  { to: "/analytics", label: t("nav.analytics"), icon: "chart" as const },
  { to: "/profile", label: t("nav.profile"), icon: "user" as const },
]);

const more = computed(() => [
  { to: "/budgets", label: t("nav.budgets") },
  { to: "/goals", label: t("nav.goals") },
  { to: "/accounts", label: t("nav.accounts") },
  { to: "/recurring", label: t("nav.recurring") },
  { to: "/calendar", label: t("nav.calendar") },
  { to: "/advisor", label: t("nav.advisor") },
  { to: "/reports", label: t("nav.reports") },
]);

const currentTitle = computed(() => {
  if (route.path === "/transactions/new") return t("nav.add");
  if (/^\/transactions\/.+/.test(route.path)) return t("nav.transactions");
  return [...items.value, ...more.value].find((item) => active(item.to))?.label ?? t("app.name");
});

function active(to: string) {
  if (to === "/") return route.path === "/";
  if (to === "/transactions") return route.path === "/transactions" || /^\/transactions\/(?!new$).+/.test(route.path);
  return route.path.startsWith(to);
}
</script>

<template>
  <div class="min-h-dvh bg-bg text-ink">
    <div class="mx-auto flex min-h-dvh max-w-[1600px]">
      <aside class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-5 py-6 md:flex">
        <RouterLink to="/" class="flex items-center gap-3 px-1" :aria-label="`${t('app.name')} home`">
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-lg text-on-primary">$</span>
          <span class="text-[20px] tracking-[-0.6px] text-ink">{{ t("app.name") }}</span>
        </RouterLink>

        <nav class="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto" :aria-label="t('app.name')">
          <div class="grid gap-1">
            <RouterLink
              v-for="item in items.filter((i) => !i.primary)"
              :key="item.to"
              :to="item.to"
              class="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] tracking-[-0.2px] transition-colors"
              :class="active(item.to) ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-ink'"
              :aria-current="active(item.to) ? 'page' : undefined"
            >
              <NavIcon :name="item.icon" />
              {{ item.label }}
            </RouterLink>
          </div>

          <RouterLink to="/transactions/new" class="btn-primary mt-1 w-full !rounded-xl">
            <NavIcon name="add" />
            {{ t("nav.add") }}
          </RouterLink>

          <div>
            <p class="mb-2 px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ t("common.more") }}</p>
            <div class="grid gap-0.5">
              <RouterLink
                v-for="item in more"
                :key="item.to"
                :to="item.to"
                class="rounded-xl px-3.5 py-2 text-[14px] tracking-[-0.2px] transition-colors"
                :class="active(item.to) ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-ink'"
                :aria-current="active(item.to) ? 'page' : undefined"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </div>
        </nav>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 bg-bg/95 px-4 py-3 backdrop-blur-xl md:px-8 md:py-3.5">
          <div class="min-w-0 md:hidden">
            <p class="text-xs font-medium text-muted">{{ t("app.name") }}</p>
            <p class="truncate text-base font-semibold tracking-[-0.02em] text-ink">{{ currentTitle }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <RouterLink
              to="/notifications"
              class="relative grid h-11 w-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              :aria-label="notifications.unreadCount ? t('notifications.openWithUnread', { count: notifications.unreadCount }) : t('notifications.open')"
            >
              <NavIcon name="bell" />
              <span
                v-if="notifications.unreadCount"
                class="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
                aria-hidden="true"
              >{{ notifications.unreadCount > 99 ? "99+" : notifications.unreadCount }}</span>
            </RouterLink>
            <span class="chip hidden border border-line bg-surface text-ink sm:inline-flex">
              <span class="h-2 w-2 rounded-full" :class="sync.online ? 'bg-success' : 'bg-muted'" />
              {{ sync.online ? t("common.online") : t("common.offline") }}
            </span>
            <span v-if="sync.pending" class="chip border border-line bg-surface text-ink">{{ t("common.pending") }} {{ sync.pending }}</span>
            <button v-if="sync.status === 'error' || sync.pending" type="button" class="chip min-h-11 bg-primary text-on-primary hover:bg-primary-dark" :aria-label="t('common.retrySync')" @click="sync.flush()">
              {{ t("common.retrySync") }}
            </button>
            <RouterLink to="/profile" class="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary" :aria-label="t('nav.profile')">
              {{ userInitial }}
            </RouterLink>
          </div>
        </header>

        <main class="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pb-12 md:pt-6">
          <RouterView />
        </main>
      </div>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-nav/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(20,35,59,0.06)] backdrop-blur-xl md:hidden" :aria-label="t('app.name')">
      <ul class="grid grid-cols-5 px-1 py-1.5">
        <li v-for="item in items" :key="item.to" class="flex justify-center">
          <RouterLink
            :to="item.to"
            class="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] tracking-[-0.1px]"
            :class="item.primary ? '-mt-6' : active(item.to) ? 'text-primary' : 'text-muted'"
            :aria-current="active(item.to) ? 'page' : undefined"
            :aria-label="item.primary ? item.label : undefined"
          >
            <span v-if="item.primary" class="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20" :aria-label="item.label">
              <NavIcon name="add" />
            </span>
            <template v-else>
              <NavIcon :name="item.icon" />
              <span>{{ item.label }}</span>
            </template>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div
      v-if="toast.visible"
      class="fade-up fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-xl bg-[#14233B] px-5 py-3 text-[14px] tracking-[-0.01em] text-white shadow-lg shadow-[#14233B]/10 md:bottom-8"
      role="status"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
