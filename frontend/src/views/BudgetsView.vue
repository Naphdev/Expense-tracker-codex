<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { api } from "../lib/api";
import { formatTHB } from "../lib/money";
import { useToastStore } from "../stores/toast";
import { requestNotificationRefresh } from "../lib/notificationEvents";
import { useAuthStore } from "../stores/auth";

const { t, locale } = useI18n();
const toast = useToastStore();
const auth = useAuthStore();
const items = ref<{ id: string; category: string; amount: number; spent: number; remaining: number; percentUsed: number; warning: string }[]>([]);
const form = reactive({ category: "food", amount: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });

async function load() {
  if (auth.isOfflineSession) {
    items.value = (auth.offlineSnapshot?.budgets ?? []) as typeof items.value;
    return;
  }
  const res = await api.get("/budgets", { params: { month: form.month, year: form.year } });
  items.value = res.data.data;
}
async function create() {
  await api.post("/budgets", { ...form, amount: Number(form.amount) });
  requestNotificationRefresh();
  form.amount = "";
  toast.show(t("common.saved"));
  await load();
}
async function remove(id: string) {
  await api.delete(`/budgets/${id}`);
  await load();
}
onMounted(load);
watch(() => auth.isOfflineSession, load);
</script>
<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader eyebrow="Personal finance / Control" :title="t('budgets.title')" subtitle="Set spending limits and track how much is left." />

    <form v-if="!auth.isOfflineSession" class="card grid gap-3 p-5 sm:grid-cols-2 sm:p-6" @submit.prevent="create">
      <label class="grid gap-1.5"><span class="label">{{ t("tx.category") }}</span>
        <select v-model="form.category" class="field">
          <option v-for="c in ['food','transportation','shopping','housing','utilities','entertainment','healthcare','education','subscription','other']" :key="c" :value="c">{{ t("cats." + c) }}</option>
        </select>
      </label>
      <label class="grid gap-1.5"><span class="label">{{ t("tx.amount") }}</span>
        <input v-model="form.amount" class="field" type="number" inputmode="decimal" :placeholder="t('tx.amount')" required />
      </label>
      <button class="btn-primary sm:col-span-2">{{ t("budgets.create") }}</button>
    </form>

    <div v-if="!items.length" class="card"><div class="empty">{{ t("budgets.empty") }}</div></div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <article v-for="item in items" :key="item.id" class="card p-5">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-semibold text-ink">{{ t("cats." + item.category) }}</p>
          <button v-if="!auth.isOfflineSession" class="text-xs font-semibold text-danger hover:underline" @click="remove(item.id)">{{ t("tx.delete") }}</button>
        </div>
        <div class="mt-3 flex items-baseline justify-between">
          <p class="text-lg font-bold text-ink">{{ formatTHB(item.spent, locale) }}</p>
          <p class="text-xs text-muted">of {{ formatTHB(item.amount, locale) }}</p>
        </div>
        <div class="bar mt-3">
          <div class="bar-fill" :class="item.warning === 'exceeded' ? 'bg-danger' : item.warning === 'warning' ? 'bg-warning' : 'bg-success'" :style="{ width: Math.min(item.percentUsed, 100) + '%' }" />
        </div>
        <p class="mt-2 text-xs text-muted">{{ t("budgets.remaining") }} {{ formatTHB(item.remaining, locale) }}</p>
      </article>
    </div>
  </section>
</template>
