<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";
import { formatDate, formatTHB, todayISO } from "@/lib/money";

const { t, locale } = useI18n();
const items = ref<Array<Record<string, unknown>>>([]);
const form = reactive({ type: "expense", title: "", amount: "", category: "subscription", frequency: "monthly", startDate: todayISO(), paymentMethod: "card" });

async function load() {
  items.value = (await api.get("/recurring")).data.data;
}
async function create() {
  await api.post("/recurring", { ...form, amount: Number(form.amount) });
  await load();
}
async function remove(id: string) {
  await api.delete(`/recurring/${id}`);
  await load();
}
onMounted(load);
</script>
<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader eyebrow="Personal finance / Automation" :title="t('recurring.title')" subtitle="Repeating payments you never want to miss." />

    <form class="card grid gap-3 p-5 sm:grid-cols-2 sm:p-6" @submit.prevent="create">
      <label class="grid gap-1.5"><span class="label">{{ t("tx.title") }}</span><input v-model="form.title" class="field" required /></label>
      <label class="grid gap-1.5"><span class="label">{{ t("tx.amount") }}</span><input v-model="form.amount" class="field" type="number" inputmode="decimal" required /></label>
      <label class="grid gap-1.5"><span class="label">{{ t("recurring.title") }}</span>
        <select v-model="form.frequency" class="field">
          <option value="daily">{{ t("recurring.daily") }}</option>
          <option value="weekly">{{ t("recurring.weekly") }}</option>
          <option value="monthly">{{ t("recurring.monthly") }}</option>
          <option value="yearly">{{ t("recurring.yearly") }}</option>
        </select>
      </label>
      <label class="grid gap-1.5"><span class="label">{{ t("tx.date") }}</span><input v-model="form.startDate" class="field" type="date" /></label>
      <button class="btn-primary sm:col-span-2">{{ t("recurring.create") }}</button>
    </form>

    <div v-if="!items.length" class="card"><div class="empty">{{ t("tx.empty") }}</div></div>

    <div v-else class="grid gap-3">
      <article v-for="item in items" :key="String(item.id)" class="card flex items-center justify-between gap-3 p-4">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-ink">{{ item.title }}</p>
            <p class="mt-0.5 truncate text-xs text-muted">
              {{ t("recurring.next") }} {{ formatDate(String(item.nextExecutionDate), locale) }}
              <span class="chip ml-1" :class="item.isActive ? 'bg-success-soft text-success' : 'bg-surface-2 text-muted'">{{ item.isActive ? t("recurring.active") : t("recurring.scheduled") }}</span>
            </p>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-sm font-bold tabular-nums" :class="item.type === 'income' ? 'text-success' : 'text-danger'">{{ formatTHB(Number(item.amount), locale) }}</p>
          <button class="text-xs font-semibold text-danger hover:underline" @click="remove(String(item.id))">{{ t("tx.delete") }}</button>
        </div>
      </article>
    </div>
  </section>
</template>
