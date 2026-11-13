<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import NavIcon from "./NavIcon.vue";
import { useAuthStore } from "../stores/auth";
import { useSyncStore } from "../stores/sync";
import { useToastStore } from "../stores/toast";
import { useNotificationStore, type FinanceNotification } from "../stores/notifications";
import { formatTHB } from "../lib/money";
import { NOTIFICATION_REFRESH_EVENT } from "../lib/notificationEvents";
import { applyPwaUpdate, updateAvailable } from "../lib/pwa";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const sync = useSyncStore();
const toast = useToastStore();
const notifications = useNotificationStore();
const moreOpen = ref(false);
const moreTrigger = ref<HTMLButtonElement | null>(null);
const moreCloseButton = ref<HTMLButtonElement | null>(null);
const morePanel = ref<HTMLElement | null>(null);
let previousBodyOverflow = "";
const userInitial = computed(() => auth.user?.name?.trim()?.charAt(0)?.toUpperCase() || "$");
let notificationRefresh: number | undefined;
const shownBudgetAlertIds = new Set<string>(readShownBudgetAlertIds());
let notificationsInitialized = false;
let notificationRefreshInFlight = false;
let notificationRefreshPending = false;
let offlineLockTimer: number | undefined;
let offlineHiddenAt: number | null = null;
const offlineLockDelay = 5 * 60 * 1000;

function scheduleOfflineLock() {
  if (offlineLockTimer !== undefined) window.clearTimeout(offlineLockTimer);
  offlineLockTimer = undefined;
  if (document.visibilityState !== "hidden") {
    const wasAwayLongEnough = offlineHiddenAt !== null && Date.now() - offlineHiddenAt >= offlineLockDelay;
    offlineHiddenAt = null;
    if (wasAwayLongEnough) void auth.lockOffline();
    return;
  }
  if (offlineHiddenAt === null) offlineHiddenAt = Date.now();
  const remaining = Math.max(0, offlineLockDelay - (Date.now() - offlineHiddenAt));
  offlineLockTimer = window.setTimeout(async () => {
    offlineHiddenAt = null;
    await auth.lockOffline();
    if (auth.offlineUnlockRequired) await router.replace("/offline/unlock");
  }, remaining);
}

function readShownBudgetAlertIds() {
  try {
    const ids: unknown = JSON.parse(window.localStorage.getItem("pfa-shown-budget-alerts") ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function persistShownBudgetAlertIds() {
  try {
    window.localStorage.setItem(
      "pfa-shown-budget-alerts",
      JSON.stringify([...shownBudgetAlertIds].slice(-200)),
    );
  } catch {
    // The toast still works when browser storage is unavailable.
  }
}

function showBudgetAlert(item: FinanceNotification) {
  const threshold = Number(item.data.threshold ?? 0);
  const category = t(`cats.${String(item.data.category ?? "other")}`);
  const message = `${t("notifications.budgetTitle", { threshold, category })} — ${t("notifications.budgetBody", {
    spent: formatTHB(Number(item.data.spent ?? 0), locale.value),
    amount: formatTHB(Number(item.data.amount ?? 0), locale.value),
    month: item.data.month,
    year: item.data.year,
  })}`;
  shownBudgetAlertIds.add(item.id);
  persistShownBudgetAlertIds();
  toast.show(message, { label: t("budgets.title"), to: "/budgets" });
}

async function refreshNotifications() {
  if (!sync.online || auth.isOfflineSession) return;
  if (notificationRefreshInFlight) {
    notificationRefreshPending = true;
    return;
  }
  notificationRefreshInFlight = true;
  try {
    const firstLoad = !notificationsInitialized;
    const added = await notifications.load(100);
    if (notifications.error) return;
    notificationsInitialized = true;
    const existingBudgetAlerts = notifications.items
      .filter((item) => item.type === "budget_threshold")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const budgetAlerts = (firstLoad ? existingBudgetAlerts : added)
      .filter((item) => item.type === "budget_threshold" && !shownBudgetAlertIds.has(item.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (firstLoad) {
      for (const item of existingBudgetAlerts) shownBudgetAlertIds.add(item.id);
      persistShownBudgetAlertIds();
    }
    if (budgetAlerts[0]) showBudgetAlert(budgetAlerts[0]);
  } finally {
    notificationRefreshInFlight = false;
    if (notificationRefreshPending) {
      notificationRefreshPending = false;
      void refreshNotifications();
    }
  }
}

function refreshWhenVisible() {
  if (document.visibilityState === "visible") void refreshNotifications();
}

async function confirmPwaUpdate() {
  if (window.confirm(t("pwa.updateConfirm"))) await applyPwaUpdate();
}

onMounted(() => {
  void sync.refreshPending();
  void refreshNotifications();
  notificationRefresh = window.setInterval(() => void refreshNotifications(), 10_000);
  window.addEventListener("focus", refreshWhenVisible);
  window.addEventListener(NOTIFICATION_REFRESH_EVENT, refreshWhenVisible);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  document.addEventListener("visibilitychange", scheduleOfflineLock);
  scheduleOfflineLock();
});
onUnmounted(() => {
  if (offlineLockTimer !== undefined) window.clearTimeout(offlineLockTimer);
  if (notificationRefresh !== undefined) window.clearInterval(notificationRefresh);
  window.removeEventListener("focus", refreshWhenVisible);
  window.removeEventListener(NOTIFICATION_REFRESH_EVENT, refreshWhenVisible);
  document.removeEventListener("visibilitychange", refreshWhenVisible);
  document.removeEventListener("visibilitychange", scheduleOfflineLock);
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
  ...(!auth.isOfflineSession ? [
    { to: "/recurring", label: t("nav.recurring") },
    { to: "/calendar", label: t("nav.calendar") },
    { to: "/advisor", label: t("nav.advisor") },
    { to: "/reports", label: t("nav.reports") },
  ] : []),
]);

const mobileMore = computed(() => [
  { to: "/budgets", label: t("nav.budgets"), icon: "wallet" as const },
  { to: "/goals", label: t("nav.goals"), icon: "target" as const },
  { to: "/accounts", label: t("nav.accounts"), icon: "account" as const },
  ...(!auth.isOfflineSession ? [
    { to: "/recurring", label: t("nav.recurring"), icon: "repeat" as const },
    { to: "/calendar", label: t("nav.calendar"), icon: "calendar" as const },
    { to: "/advisor", label: t("nav.advisor"), icon: "advisor" as const },
    { to: "/reports", label: t("nav.reports"), icon: "report" as const },
  ] : []),
  { to: "/profile", label: t("nav.profile"), icon: "user" as const },
]);

const mobileItems = computed(() => [
  ...items.value.filter((item) => item.to !== "/profile" && (!auth.isOfflineSession || item.to === "/" || item.to === "/transactions")),
  { to: "__more", label: t("common.more"), icon: "more" as const, primary: false },
]);
const moreActive = computed(() => mobileMore.value.some((item) => active(item.to)));

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

function closeMore() {
  moreOpen.value = false;
}

function setMoreTrigger(element: unknown) {
  moreTrigger.value = element instanceof HTMLButtonElement ? element : null;
}

function handleMoreSheetKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeMore();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = morePanel.value?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(moreOpen, async (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    moreCloseButton.value?.focus();
  } else {
    document.body.style.overflow = previousBodyOverflow;
    await nextTick();
    moreTrigger.value?.focus();
  }
});

watch(() => route.fullPath, closeMore);
watch(() => auth.isOfflineSession, (offline) => {
  scheduleOfflineLock();
  if (offline && !["/", "/transactions", "/accounts", "/budgets", "/goals", "/profile"].includes(route.path)) {
    void router.replace("/");
  }
});
watch(() => auth.offlineUnlockRequired, (required) => {
  if (required && route.path !== "/offline/unlock") void router.replace("/offline/unlock");
});
watch(() => auth.isAuthenticated, (authenticated) => {
  if (!authenticated && !auth.offlineUnlockRequired && !route.meta.public) void router.replace("/login");
});
</script>

<template>
  <div class="min-h-dvh bg-bg text-ink">
    <div class="mx-auto flex min-h-dvh max-w-[1600px]">
      <aside class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-5 py-6 md:flex">
        <RouterLink to="/" class="flex items-center gap-3 px-1" :aria-label="`${t('app.name')} home`">
          <img src="/finance-letter-f.svg" alt="" class="h-10 w-10 rounded-2xl" />
          <span class="text-[20px] tracking-[-0.6px] text-ink">{{ t("app.name") }}</span>
        </RouterLink>

        <nav class="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto" :aria-label="t('app.name')">
          <div class="grid gap-1">
            <RouterLink
              v-for="item in items.filter((i) => !i.primary && (!auth.isOfflineSession || i.to === '/' || i.to === '/transactions'))"
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

          <RouterLink v-if="!auth.isOfflineSession" to="/transactions/new" class="btn-primary mt-1 w-full !rounded-xl">
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
          <div class="flex min-w-0 items-center gap-2 md:hidden">
            <img src="/finance-letter-f.svg" alt="" class="h-9 w-9 shrink-0 rounded-xl" />
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted">{{ t("app.name") }}</p>
              <p class="truncate text-base font-semibold tracking-[-0.02em] text-ink">{{ currentTitle }}</p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <RouterLink v-if="!auth.isOfflineSession"
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
              <span class="h-2 w-2 rounded-full" :class="sync.online && !auth.isOfflineSession ? 'bg-success' : 'bg-muted'" />
              {{ sync.online && !auth.isOfflineSession ? t("common.online") : t("common.offline") }}
            </span>
            <span v-if="sync.pending" class="chip border border-line bg-surface text-ink">{{ t("common.pending") }} {{ sync.pending }}</span>
            <button v-if="!auth.isOfflineSession && (sync.status === 'error' || sync.pending)" type="button" class="chip min-h-11 bg-primary text-on-primary hover:bg-primary-dark" :aria-label="t('common.retrySync')" @click="sync.flush()">
              {{ t("common.retrySync") }}
            </button>
            <RouterLink to="/profile" class="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary" :aria-label="t('nav.profile')">
              {{ userInitial }}
            </RouterLink>
          </div>
        </header>

        <div v-if="updateAvailable" class="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-ink md:mx-8">
          <span>{{ t("pwa.updateAvailable") }}</span>
          <button type="button" class="btn-primary min-h-10 shrink-0 px-4" @click="confirmPwaUpdate">{{ t("pwa.update") }}</button>
        </div>

        <main class="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pb-12 md:pt-6">
          <div v-if="auth.isOfflineSession" class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-ink" role="status">
            <span class="font-semibold">{{ t("pwa.offlineReadOnly") }}</span>
            <span v-if="auth.offlineSnapshot" class="text-xs text-muted">{{ t("pwa.lastSynced", { date: new Date(auth.offlineSnapshot.syncedAt).toLocaleString(locale) }) }}</span>
          </div>
          <RouterView />
        </main>
      </div>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-nav/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(20,35,59,0.06)] backdrop-blur-xl md:hidden" :aria-label="t('app.name')">
      <ul class="grid px-1 py-1.5" :class="auth.isOfflineSession ? 'grid-cols-3' : 'grid-cols-5'">
        <li v-for="item in mobileItems" :key="item.to" class="flex justify-center">
          <button
            v-if="item.to === '__more'"
            :ref="setMoreTrigger"
            type="button"
            class="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] tracking-[-0.1px] transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            :class="moreActive ? 'text-primary' : 'text-muted'"
            :aria-expanded="moreOpen"
            aria-haspopup="dialog"
            aria-controls="mobile-more-sheet"
            @click="moreOpen = true"
          >
            <NavIcon name="more" />
            <span>{{ item.label }}</span>
          </button>
          <RouterLink
            v-else
            :to="item.to"
            class="flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] tracking-[-0.1px] transition-colors hover:bg-surface-2"
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

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="moreOpen" class="fixed inset-0 z-50 md:hidden" @keydown="handleMoreSheetKeydown">
        <button
          type="button"
          class="absolute inset-0 h-full w-full bg-[#14233B]/45"
          :aria-label="t('common.cancel')"
          @click="closeMore"
        />
        <section
          id="mobile-more-sheet"
          ref="morePanel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-more-title"
          tabindex="-1"
          class="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_45px_rgba(20,35,59,0.18)]"
        >
          <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          <div class="mb-4 flex items-center justify-between">
            <h2 id="mobile-more-title" class="text-lg font-semibold text-ink">{{ t("common.more") }}</h2>
            <button
              ref="moreCloseButton"
              type="button"
              class="grid min-h-11 min-w-11 place-items-center rounded-xl text-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              :aria-label="t('common.cancel')"
              @click="closeMore"
            >×</button>
          </div>
          <nav :aria-label="t('common.more')" class="grid grid-cols-2 gap-2">
            <RouterLink
              v-for="item in mobileMore"
              :key="item.to"
              :to="item.to"
              class="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              :class="active(item.to) ? 'border-primary/40 bg-primary-soft text-primary' : ''"
              :aria-current="active(item.to) ? 'page' : undefined"
              @click="closeMore"
            >
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary" aria-hidden="true">
                <NavIcon :name="item.icon" />
              </span>
              <span class="min-w-0 truncate">{{ item.label }}</span>
            </RouterLink>
          </nav>
        </section>
      </div>
    </Transition>

    <div
      v-if="toast.visible"
      class="fade-up fixed left-4 right-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-40 flex items-center gap-4 rounded-xl bg-[#14233B] px-5 py-3 text-[14px] tracking-[-0.01em] text-white shadow-lg shadow-[#14233B]/10 sm:left-auto sm:right-6 sm:top-20 sm:max-w-md md:right-8"
      role="status"
    >
      <span class="min-w-0 break-words">{{ toast.message }}</span>
      <RouterLink v-if="toast.action" :to="toast.action.to" class="shrink-0 font-semibold underline underline-offset-2">
        {{ toast.action.label }}
      </RouterLink>
    </div>
  </div>
</template>
