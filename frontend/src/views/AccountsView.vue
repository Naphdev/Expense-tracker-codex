<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";
import { formatTHB } from "@/lib/money";

const { t, locale } = useI18n();
const items = ref<{ id: string; name: string; accountType: string; balance: number }[]>([]);
const form = reactive({ name: "", accountType: "cash", balance: "0" });

async function load() {
  items.value = (await api.get("/accounts")).data.data;
}
async function create() {
  await api.post("/accounts", { ...form, balance: Number(form.balance) });
  await load();
}
onMounted(load);

const typeStyle: Record<string, string> = {
  cash: "bg-success-soft text-success",
  bank: "bg-primary-soft text-primary",
  e_wallet: "bg-warning-soft text-warning-dark",
  credit: "bg-danger-soft text-danger",
};
const total = () => items.value.reduce((sum, a) => sum + a.balance, 0);
</script>
<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader eyebrow="Personal finance / Balances" :title="t('accounts.title')" subtitle="Keep track of every wallet, bank and card." />

    <div class="rounded-[28px] border border-line bg-primary-soft p-6 text-ink sm:p-8">
      <p class="text-[12px] font-medium tracking-[-0.24px] text-muted">{{ t("accounts.balance") }}</p>
      <p class="money mt-2 text-[36px] sm:text-[44px]">{{ formatTHB(total(), locale) }}</p>
      <p class="mt-2 text-[14px] tracking-[-0.01em] text-muted">{{ items.length }} {{ items.length === 1 ? "account" : "accounts" }}</p>
    </div>

    <form class="card grid gap-3 p-5 sm:grid-cols-2 sm:p-6" @submit.prevent="create">
      <label class="grid gap-1.5"><span class="label">{{ t("tx.title") }}</span><input v-model="form.name" class="field" required /></label>
      <label class="grid gap-1.5"><span class="label">{{ t("accounts.title") }}</span>
        <select v-model="form.accountType" class="field">
          <option value="cash">{{ t("accounts.cash") }}</option>
          <option value="bank">{{ t("accounts.bank") }}</option>
          <option value="e_wallet">{{ t("accounts.e_wallet") }}</option>
          <option value="credit">{{ t("accounts.credit") }}</option>
        </select>
      </label>
      <label class="grid gap-1.5 sm:col-span-2"><span class="label">{{ t("accounts.balance") }}</span><input v-model="form.balance" class="field" type="number" inputmode="decimal" /></label>
      <button class="btn-primary sm:col-span-2">{{ t("accounts.create") }}</button>
    </form>

    <div v-if="!items.length" class="card"><div class="empty">{{ t("tx.empty") }}</div></div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <article v-for="item in items" :key="item.id" class="card flex items-center justify-between gap-3 p-4">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="typeStyle[item.accountType] || 'bg-surface-2 text-muted'">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-ink">{{ item.name }}</p>
            <p class="text-xs capitalize text-muted">{{ item.accountType }}</p>
          </div>
        </div>
        <p class="shrink-0 text-sm font-bold tabular-nums text-ink">{{ formatTHB(item.balance, locale) }}</p>
      </article>
    </div>
  </section>
</template>
