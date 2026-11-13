<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import { hasOfflineVault } from "../../lib/offlineDb";

const { t, locale } = useI18n();
const auth = useAuthStore();
const router = useRouter();
const passphrase = ref("");
const error = ref("");
const loading = ref(false);
const vaultAvailable = ref(false);

onMounted(async () => {
  vaultAvailable.value = await hasOfflineVault().catch(() => false);
});

async function unlock() {
  if (loading.value) return;
  error.value = "";
  loading.value = true;
  try {
    await auth.unlockOffline(passphrase.value);
    if (auth.user?.preferredLanguage) locale.value = auth.user.preferredLanguage;
    await router.replace("/");
  } catch {
    error.value = t("offline.invalidPassphrase");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-ink">
    <section class="card w-full max-w-md space-y-5 p-6 sm:p-8">
      <div class="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">🔒</div>
      <div>
        <p class="eyebrow">{{ t("common.offline") }}</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ t("offline.title") }}</h1>
        <p class="mt-2 text-sm leading-6 text-muted">{{ t("offline.description") }}</p>
      </div>
      <form v-if="vaultAvailable" class="space-y-4" @submit.prevent="unlock">
        <label class="grid gap-1.5">
          <span class="label">{{ t("offline.passphrase") }}</span>
          <input v-model="passphrase" class="field" type="password" autocomplete="current-password" required autofocus />
        </label>
        <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
        <button class="btn-primary w-full" type="submit" :disabled="loading">
          {{ loading ? t("common.loading") : t("offline.unlock") }}
        </button>
      </form>
      <p v-else class="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{{ t("offline.noVault") }}</p>
      <RouterLink to="/login" class="block text-center text-sm font-medium text-primary hover:underline">{{ t("offline.onlineLogin") }}</RouterLink>
    </section>
  </main>
</template>
