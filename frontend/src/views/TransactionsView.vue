<script setup lang="ts">
import { onMounted, ref, toRaw } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";
import {
  cacheTransactions,
  getAllTransactions,
  type LocalTransaction,
} from "@/lib/offlineDb";
import { formatDate, formatTHB } from "@/lib/money";
import { useSyncStore } from "@/stores/sync";

const { t, locale } = useI18n();
const sync = useSyncStore();
const items = ref<LocalTransaction[]>([]);
const search = ref("");
const type = ref("");
const category = ref("");
const sort = ref("date_desc");
const startDate = ref("");
const endDate = ref("");
const loading = ref(true);
const error = ref("");
const expenseCats = [
  "food",
  "transportation",
  "shopping",
  "housing",
  "utilities",
  "entertainment",
  "healthcare",
  "education",
  "subscription",
  "other",
];

async function load() {
  loading.value = true;
  error.value = "";
  try {
    console.log("Online:", sync.online);
    if (sync.online) {
      const res = await api.get("/transactions", {
        params: {
          search: search.value || undefined,
          type: type.value || undefined,
          category: category.value || undefined,
          sort: sort.value,
          startDate: startDate.value || undefined,
          endDate: endDate.value || undefined,
          limit: 50,
        },
      });
      items.value = res.data.data.items;
      // await cacheTransactions(items.value);
      await cacheTransactions(JSON.parse(JSON.stringify(toRaw(items.value))));
    } else {
      items.value = await getAllTransactions();
    }
  } catch {
    try {
      items.value = await getAllTransactions();
    } catch {
      error.value = t("common.error");
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
<template>
  <section class="space-y-6">
    <PageHeader
      eyebrow="Personal finance / Activity"
      :title="t('nav.transactions')"
      subtitle="Search and filter all of your money movements."
    >
      <template #actions>
        <RouterLink to="/transactions/import" class="btn-ghost min-h-11">{{ t("import.title") }}</RouterLink>
      </template>
    </PageHeader>

    <div class="card space-y-3 p-4 sm:p-5">
      <input
        v-model="search"
        class="field"
        :placeholder="t('tx.search')"
        :aria-label="t('tx.search')"
        @change="load"
      />
      <div class="grid gap-2 sm:grid-cols-2">
        <select v-model="type" class="field" :aria-label="t('tx.all') + ' ' + t('tx.income') + '/' + t('tx.expense')" @change="load">
          <option value="">
            {{ t("tx.all") }} · {{ t("tx.income") }}/{{ t("tx.expense") }}
          </option>
          <option value="income">{{ t("tx.income") }}</option>
          <option value="expense">{{ t("tx.expense") }}</option>
          <option value="transfer">{{ t("tx.transfer") }}</option>
        </select>
        <select v-model="sort" class="field" :aria-label="t('tx.sort')" @change="load">
          <option value="date_desc">{{ t("tx.newest") }}</option>
          <option value="date_asc">{{ t("tx.oldest") }}</option>
          <option value="amount_desc">{{ t("tx.amountHigh") }}</option>
          <option value="amount_asc">{{ t("tx.amountLow") }}</option>
        </select>
      </div>
      <div class="grid gap-2 sm:grid-cols-3">
        <select v-model="category" class="field" :aria-label="t('tx.category')" @change="load">
          <option value="">{{ t("tx.category") }}</option>
          <option v-for="cat in expenseCats" :key="cat" :value="cat">
            {{ t("cats." + cat) }}
          </option>
        </select>
        <input v-model="startDate" type="date" class="field" :aria-label="locale === 'th' ? 'วันที่เริ่มต้น' : 'Start date'" @change="load" />
        <input v-model="endDate" type="date" class="field" :aria-label="locale === 'th' ? 'วันที่สิ้นสุด' : 'End date'" @change="load" />
      </div>
    </div>

    <div v-if="loading" class="space-y-2">
      <div
        v-for="n in 5"
        :key="n"
        class="h-[68px] animate-pulse rounded-2xl bg-surface"
      />
    </div>

    <div v-else-if="error" class="card p-4 text-sm text-danger">
      {{ error }}
      <button class="font-semibold underline" @click="load">
        {{ t("common.retry") }}
      </button>
    </div>

    <div v-else-if="!items.length" class="card">
      <div class="empty">{{ t("tx.empty") }}</div>
    </div>

    <ul v-else class="space-y-2">
      <li v-for="item in items" :key="item.id">
        <RouterLink
          :to="`/transactions/${item.id}`"
          class="card flex items-center justify-between gap-3 px-5 py-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              :class="
                item.type === 'income'
                  ? 'bg-success-soft text-success'
                  : item.type === 'expense'
                    ? 'bg-danger-soft text-danger'
                    : 'bg-surface-2 text-muted'
              "
            >
              <svg
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-if="item.type === 'income'" d="M12 19V5m-7 7 7-7 7 7" />
                <path
                  v-else-if="item.type === 'expense'"
                  d="M12 5v14m7-7-7 7-7-7"
                />
                <path v-else d="M4 12h16m-4-4 4 4-4 4" />
              </svg>
            </div>
            <div class="min-w-0">
              <p
                class="flex items-center gap-2 truncate text-sm font-semibold text-ink"
              >
                {{ item.title }}
                <span
                  v-if="item.pending"
                  class="chip bg-warning-soft text-warning-dark"
                  >{{ t("common.pending") }}</span
                >
              </p>
              <p class="mt-0.5 truncate text-xs text-muted">
                {{ t("cats." + item.category) }} ·
                {{ formatDate(item.date, locale) }}
              </p>
            </div>
          </div>
          <p
            class="shrink-0 text-sm font-bold tabular-nums"
            :class="
              item.type === 'income'
                ? 'text-success'
                : item.type === 'expense'
                  ? 'text-danger'
                  : 'text-muted'
            "
          >
            {{
              item.type === "expense" ? "-" : item.type === "income" ? "+" : ""
            }}{{ formatTHB(item.amount, locale) }}
          </p>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
