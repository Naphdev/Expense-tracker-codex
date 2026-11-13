<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { useAuthStore } from "../stores/auth";
import { useThemeStore, type ThemePref } from "../stores/theme";

const { t, locale } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();
const router = useRouter();

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

    <div class="card p-5">
      <p class="label">{{ t("profile.language") }}</p>
      <div class="grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
        <button class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="locale === 'en' ? 'ink-pill' : 'text-muted'" :aria-pressed="locale === 'en'" @click="setLang('en')">English</button>
        <button class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="locale === 'th' ? 'ink-pill' : 'text-muted'" :aria-pressed="locale === 'th'" @click="setLang('th')">ไทย</button>
      </div>
    </div>

    <div class="card p-5">
      <p class="label">{{ t("profile.theme") }}</p>
      <div class="grid grid-cols-3 gap-2 rounded-full bg-surface-2 p-1">
        <button v-for="value in (['system','light','dark'] as const)" :key="value" class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]" :class="theme.preference === value ? 'ink-pill' : 'text-muted'" :aria-pressed="theme.preference === value" @click="setTheme(value)">{{ t("profile." + value) }}</button>
      </div>
    </div>

    <nav class="card overflow-hidden">
      <RouterLink v-for="item in links" :key="item.to" :to="item.to" class="flex items-center justify-between border-b border-line-soft px-5 py-4 text-sm font-medium text-ink transition-colors last:border-0 hover:bg-surface-2">
        <span>{{ t(item.key) }}</span>
        <span class="text-muted">→</span>
      </RouterLink>
    </nav>

    <button class="btn-ghost w-full !border-danger/25 !text-danger hover:!bg-danger-soft" @click="logout">{{ t("auth.logout") }}</button>
  </section>
</template>
