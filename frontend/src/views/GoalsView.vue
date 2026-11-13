<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { api } from "../lib/api";
import { formatTHB } from "../lib/money";
import { useToastStore } from "../stores/toast";
import { useAuthStore } from "../stores/auth";

const { t, locale } = useI18n();
const toast = useToastStore();
const auth = useAuthStore();
const items = ref<Array<Record<string, unknown>>>([]);
const form = reactive({ name: "", targetAmount: "", targetDate: "", description: "" });
const contrib = reactive({ id: "", amount: "" });

async function load() {
  if (auth.isOfflineSession) {
    items.value = (auth.offlineSnapshot?.goals ?? []) as typeof items.value;
    return;
  }
  items.value = (await api.get("/saving-goals")).data.data;
}
async function create() {
  await api.post("/saving-goals", { ...form, targetAmount: Number(form.targetAmount) });
  toast.show(t("common.saved"));
  Object.assign(form, { name: "", targetAmount: "", targetDate: "", description: "" });
  await load();
}
async function contribute() {
  await api.post(`/saving-goals/${contrib.id}/contributions`, { amount: Number(contrib.amount) });
  contrib.amount = "";
  await load();
}
async function remove(id: string) {
  await api.delete(`/saving-goals/${id}`);
  await load();
}
onMounted(load);
watch(() => auth.isOfflineSession, load);
</script>
<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader eyebrow="Personal finance / Planning" :title="t('goals.title')" subtitle="Set savings targets and watch your progress grow." />

    <form v-if="!auth.isOfflineSession" class="card grid gap-3 p-5 sm:p-6" @submit.prevent="create">
      <label class="grid gap-1.5"><span class="label">{{ t("tx.title") }}</span><input v-model="form.name" class="field" :placeholder="t('tx.title')" required /></label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1.5"><span class="label">{{ t("goals.target") }}</span><input v-model="form.targetAmount" class="field" type="number" inputmode="decimal" required /></label>
        <label class="grid gap-1.5"><span class="label">{{ t("tx.date") }}</span><input v-model="form.targetDate" class="field" type="date" required /></label>
      </div>
      <button class="btn-primary">{{ t("goals.create") }}</button>
    </form>

    <div v-if="!items.length" class="card"><div class="empty">{{ t("goals.empty") }}</div></div>

    <div v-else class="grid gap-4">
      <article v-for="item in items" :key="String(item.id)" class="card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-ink">{{ item.name }}</p>
            <p class="mt-0.5 text-xs text-muted">{{ t("goals.current") }} {{ formatTHB(Number(item.currentAmount), locale) }} / {{ formatTHB(Number(item.targetAmount), locale) }}</p>
          </div>
          <button v-if="!auth.isOfflineSession" class="text-xs font-semibold text-danger hover:underline" @click="remove(String(item.id))">{{ t("tx.delete") }}</button>
        </div>
        <div class="bar mt-3">
          <div class="bar-fill bg-primary" :style="{ width: Math.min(Number(item.progress), 100) + '%' }" />
        </div>
        <form v-if="!auth.isOfflineSession" class="mt-4 flex gap-2" @submit.prevent="contrib.id = String(item.id); contribute()">
          <input v-model="contrib.amount" class="field flex-1" type="number" inputmode="decimal" :placeholder="t('goals.contribute')" />
          <button class="btn-soft shrink-0">{{ t("goals.contribute") }}</button>
        </form>
      </article>
    </div>
  </section>
</template>
