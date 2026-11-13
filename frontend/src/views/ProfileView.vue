<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { useAuthStore } from "../stores/auth";
import { useThemeStore, type ThemePref } from "../stores/theme";
import { usePwaInstall } from "../lib/pwa";
import { createOfflineVault, readOfflineVaultMetadata, unlockOfflineVault, updateOfflineSnapshot, type OfflineSnapshot } from "../lib/offlineDb";
import { api } from "../lib/api";

const { t, locale } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();
const router = useRouter();
const { canPromptInstall, installed, shouldShowIosGuide, install: installPwa } = usePwaInstall();
const offlineReady = ref(false);
const offlineSavedAt = ref("");
const offlinePassphrase = ref("");
const offlinePassphraseConfirm = ref("");
const offlineError = ref("");
const offlineSuccess = ref(false);
const offlineSaving = ref(false);
const installHelpOpen = ref(false);

async function refreshOfflineStatus() {
  const metadata = await readOfflineVaultMetadata().catch(() => null);
  offlineReady.value = Boolean(metadata && metadata.userId === auth.user?.id);
  offlineSavedAt.value = metadata?.updatedAt ?? metadata?.createdAt ?? "";
}

async function saveOfflineData() {
  offlineError.value = "";
  offlineSuccess.value = false;
  if (offlinePassphrase.value.length < 10) {
    offlineError.value = t("profile.offlinePassphraseShort");
    return;
  }
  if (!offlineReady.value && offlinePassphrase.value !== offlinePassphraseConfirm.value) {
    offlineError.value = t("profile.offlinePassphraseMismatch");
    return;
  }
  if (!auth.user || auth.isOfflineSession) return;

  offlineSaving.value = true;
  try {
    const now = new Date();
    const [summaryResponse, transactionsResponse, accountsResponse, budgetsResponse, goalsResponse] = await Promise.all([
      api.get("/dashboard/summary", { params: { range: "this_month" } }),
      api.get("/transactions", { params: { sort: "date_desc", limit: 50 } }),
      api.get("/accounts"),
      api.get("/budgets", { params: { month: now.getMonth() + 1, year: now.getFullYear() } }),
      api.get("/saving-goals"),
    ]);
    const snapshot: OfflineSnapshot = {
      user: auth.user,
      syncedAt: now.toISOString(),
      summary: summaryResponse.data.data,
      transactions: transactionsResponse.data.data.items,
      accounts: accountsResponse.data.data,
      budgets: budgetsResponse.data.data,
      goals: goalsResponse.data.data,
    };

    const metadata = await readOfflineVaultMetadata();
    if (metadata) {
      if (metadata.userId !== auth.user.id) throw new Error("offline-vault-user-mismatch");
      await unlockOfflineVault(offlinePassphrase.value);
      await updateOfflineSnapshot(snapshot);
    } else {
      await createOfflineVault(offlinePassphrase.value, snapshot);
    }
    offlineSavedAt.value = snapshot.syncedAt;
    offlineReady.value = true;
    offlinePassphrase.value = "";
    offlinePassphraseConfirm.value = "";
    offlineSuccess.value = true;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    offlineError.value = message === "offline-vault-user-mismatch"
      ? t("profile.offlineOtherUser")
      : message === "offline-vault-invalid-passphrase"
        ? t("offline.invalidPassphrase")
        : t("profile.offlineSaveError");
  } finally {
    offlineSaving.value = false;
  }
}

onMounted(() => void refreshOfflineStatus());

async function setLang(value: "th" | "en") {
  locale.value = value;
  localStorage.setItem("pfa-lang", value);
  await auth.updateProfile({ preferredLanguage: value });
}
async function setTheme(value: ThemePref) {
  theme.setPreference(value);
  await auth.updateProfile({ preferredTheme: value });
}
async function logout() {
  await auth.logout();
  await router.push("/login");
}

const links = [
  { to: "/budgets", key: "nav.budgets" },
  { to: "/goals", key: "nav.goals" },
  { to: "/accounts", key: "nav.accounts" },
  { to: "/recurring", key: "nav.recurring" },
  { to: "/calendar", key: "nav.calendar" },
  { to: "/advisor", key: "nav.advisor" },
  { to: "/reports", key: "nav.reports" },
];
</script>
<template>
  <section class="mx-auto max-w-2xl space-y-5">
    <PageHeader eyebrow="Personal finance / Account" :title="t('profile.title')" />

    <div class="card flex items-center gap-4 p-5">
      <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-[25px] tracking-[-0.75px] text-primary">
        {{ (auth.user?.name || "?").charAt(0).toUpperCase() }}
      </span>
      <div class="min-w-0">
        <p class="truncate text-base font-bold text-ink">{{ auth.user?.name }}</p>
        <p class="truncate text-sm text-muted">{{ auth.user?.email }}</p>
      </div>
    </div>

    <section class="card space-y-4 p-5" aria-labelledby="profile-install-title">
      <div class="flex items-start gap-3">
        <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2.5" width="14" height="19" rx="3" />
            <path d="M9 5.5h6M10 18h4" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="profile-install-title" class="text-sm font-semibold text-ink">{{ t("profile.installApp") }}</h2>
          <p class="mt-1 text-sm leading-6 text-muted">{{ t("profile.installDescription") }}</p>
        </div>
        <span v-if="installed" class="chip shrink-0 bg-success-soft text-success">{{ t("profile.installed") }}</span>
        <button v-else-if="canPromptInstall" class="btn-primary min-h-11 shrink-0 px-4" type="button" @click="installPwa">{{ t("profile.installNow") }}</button>
        <button v-else-if="!shouldShowIosGuide" class="btn-ghost min-h-11 shrink-0 px-4" type="button" :aria-expanded="installHelpOpen" aria-controls="profile-install-help" @click="installHelpOpen = !installHelpOpen">{{ t("profile.installHelp") }}</button>
      </div>

      <ol v-if="shouldShowIosGuide" class="grid gap-2 rounded-xl bg-surface-2 p-4 text-sm leading-6 text-text">
        <li>{{ t("profile.iosInstallStep1") }}</li>
        <li>{{ t("profile.iosInstallStep2") }}</li>
        <li>{{ t("profile.iosInstallStep3") }}</li>
      </ol>
      <p v-else-if="!installed && !canPromptInstall && installHelpOpen" id="profile-install-help" class="rounded-xl bg-surface-2 px-4 py-3 text-xs leading-5 text-muted">{{ t("profile.installBrowserHelp") }}</p>
    </section>

    <section class="card space-y-4 p-5" aria-labelledby="offline-data-title">
      <div>
        <h2 id="offline-data-title" class="text-sm font-semibold text-ink">{{ t("profile.offlineTitle") }}</h2>
        <p class="mt-1 text-sm leading-6 text-muted">{{ t("profile.offlineDescription") }}</p>
        <p class="mt-2 text-xs leading-5 text-muted">{{ t("profile.offlineSecurityNote") }}</p>
      </div>
      <p v-if="auth.isOfflineSession" class="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{{ t("profile.offlineReady") }}</p>
      <template v-else>
        <p v-if="offlineReady" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          {{ t("profile.offlineReady") }}
          <span v-if="offlineSavedAt" class="mt-1 block text-xs">{{ t("profile.offlineSavedAt", { date: new Date(offlineSavedAt).toLocaleString(locale) }) }}</span>
        </p>
        <form class="grid gap-3" @submit.prevent="saveOfflineData">
          <label class="grid gap-1.5">
            <span class="label">{{ t("profile.offlinePassphrase") }}</span>
            <input v-model="offlinePassphrase" class="field" type="password" autocomplete="new-password" required minlength="10" />
          </label>
          <label v-if="!offlineReady" class="grid gap-1.5">
            <span class="label">{{ t("profile.offlineConfirm") }}</span>
            <input v-model="offlinePassphraseConfirm" class="field" type="password" autocomplete="new-password" required minlength="10" />
          </label>
          <p v-if="offlineError" class="text-sm text-danger" role="alert">{{ offlineError }}</p>
          <p v-if="offlineSuccess" class="text-sm text-success" role="status">{{ t("profile.offlineReady") }}</p>
          <button class="btn-primary w-full" type="submit" :disabled="offlineSaving">
            {{ offlineSaving ? t("common.loading") : offlineReady ? t("profile.offlineRefresh") : t("profile.offlineSave") }}
          </button>
        </form>
      </template>
    </section>

    <div v-if="!auth.isOfflineSession" class="card p-5">
      <p class="label">{{ t("profile.language") }}</p>
      <div class="grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
        <button class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="locale === 'en' ? 'ink-pill' : 'text-muted'" :aria-pressed="locale === 'en'" @click="setLang('en')">English</button>
        <button class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="locale === 'th' ? 'ink-pill' : 'text-muted'" :aria-pressed="locale === 'th'" @click="setLang('th')">ไทย</button>
      </div>
    </div>

    <div v-if="!auth.isOfflineSession" class="card p-5">
      <p class="label">{{ t("profile.theme") }}</p>
      <div class="grid grid-cols-3 gap-2 rounded-full bg-surface-2 p-1">
        <button v-for="value in (['system','light','dark'] as const)" :key="value" class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="theme.preference === value ? 'ink-pill' : 'text-muted'" :aria-pressed="theme.preference === value" @click="setTheme(value)">{{ t("profile." + value) }}</button>
      </div>
    </div>

    <nav v-if="!auth.isOfflineSession" class="card overflow-hidden">
      <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="flex items-center justify-between border-b border-line-soft px-5 py-4 text-sm font-medium text-ink transition-colors last:border-0 hover:bg-surface-2">
        <span>{{ t(item.key) }}</span>
        <span class="text-muted">→</span>
      </RouterLink>
    </nav>

    <button class="btn-ghost w-full !border-danger/25 !text-danger hover:!bg-danger-soft" @click="logout">{{ t("auth.logout") }}</button>
  </section>
</template>
