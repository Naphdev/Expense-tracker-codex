<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Bar, Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import PageHeader from "../components/PageHeader.vue";
import RangeSelect from "../components/RangeSelect.vue";
import { api } from "../lib/api";
import { formatTHB } from "../lib/money";
import { useThemeStore } from "../stores/theme";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const { t, locale } = useI18n();
const theme = useThemeStore();
const range = ref("this_month");
const startDate = ref("");
const endDate = ref("");
const cats = ref<{ category: string; amount: number }[]>([]);
const trends = ref<{ month: string; income: number; expenses: number }[]>([]);
const loading = ref(true);
const error = ref("");

const chartTone = computed(() => {
  const dark = theme.resolved() === "dark";
  return {
    text: dark ? "#ACBAD0" : "#71839B",
    grid: dark ? "#30425E" : "#E9EEF5",
    surface: dark ? "#152239" : "#FFFFFF",
    income: dark ? "#66C8A8" : "#147A65",
    expenses: dark ? "#F598A0" : "#C24750",
    categories: dark
      ? ["#8EAAFF", "#BEA9FF", "#66C8A8", "#F2C270", "#72BED5", "#ACBAD0"]
      : ["#3159D8", "#7A66C2", "#147A65", "#C17B2D", "#4389A8", "#7587A3"],
  };
});
const chartColors = computed(() => chartTone.value.categories);
const legendLabels = computed(() => ({ color: chartTone.value.text, padding: 18, usePointStyle: true, pointStyle: "circle" as const, font: { size: 12, weight: 400 } }));

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const params = { range: range.value, startDate: startDate.value || undefined, endDate: endDate.value || undefined };
    const [c, tr] = await Promise.all([
      api.get("/dashboard/categories", { params: { ...params, type: "expense" } }),
      api.get("/dashboard/trends", { params }),
    ]);
    cats.value = c.data.data;
    trends.value = tr.data.data;
  } catch {
    error.value = t("common.error");
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="space-y-6">
    <PageHeader eyebrow="Personal finance / Insights" :title="t('nav.analytics')" subtitle="Understand spending patterns and cash flow over time.">
      <template #actions>
        <RangeSelect v-model:range="range" v-model:startDate="startDate" v-model:endDate="endDate" show-year @change="load" />
      </template>
    </PageHeader>

    <div v-if="loading" class="grid gap-5 xl:grid-cols-2">
      <div class="h-80 animate-pulse rounded-2xl bg-surface"></div>
      <div class="h-80 animate-pulse rounded-2xl bg-surface"></div>
    </div>

    <div v-else-if="error" class="card p-4 text-sm text-danger">{{ error }} <button class="font-semibold underline" @click="load">{{ t("common.retry") }}</button></div>

    <template v-else>
      <div class="grid items-stretch gap-5 xl:grid-cols-2">
        <article class="card min-w-0 p-5 sm:p-6">
          <div class="mb-5">
            <p class="eyebrow">Breakdown</p>
            <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.expenses") }}</h2>
            <p class="mt-1 text-xs text-muted">Expense distribution by category</p>
          </div>
          <div v-if="cats.length" class="mx-auto h-[280px] max-w-[360px]">
            <Doughnut
              :data="{ labels: cats.map((c) => t('cats.' + c.category)), datasets: [{ data: cats.map((c) => c.amount), backgroundColor: chartColors, borderColor: chartTone.surface, borderWidth: 4, hoverOffset: 7 }] }"
              :options="{ responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: legendLabels } } }"
            />
          </div>
          <div v-else class="empty">{{ t("tx.empty") }}</div>
        </article>

        <article class="card min-w-0 p-5 sm:p-6">
          <div class="mb-5">
            <p class="eyebrow">Cash flow</p>
            <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.income") }} / {{ t("dashboard.expenses") }}</h2>
            <p class="mt-1 text-xs text-muted">Income and expense trends</p>
          </div>
          <div v-if="trends.length" class="h-[280px] w-full">
            <Bar
              :data="{ labels: trends.map((r) => r.month), datasets: [{ label: t('dashboard.income'), data: trends.map((r) => r.income), backgroundColor: chartTone.income, borderRadius: 999, maxBarThickness: 22 }, { label: t('dashboard.expenses'), data: trends.map((r) => r.expenses), backgroundColor: chartTone.expenses, borderRadius: 999, maxBarThickness: 22 }] }"
              :options="{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: legendLabels } }, scales: { x: { grid: { display: false }, ticks: { color: chartTone.text, font: { size: 12, weight: 400 } }, border: { display: false } }, y: { beginAtZero: true, grid: { color: chartTone.grid }, ticks: { color: chartTone.text, font: { size: 12, weight: 400 } }, border: { display: false } } } }"
            />
          </div>
          <div v-else class="empty">{{ t("tx.empty") }}</div>
        </article>
      </div>

      <article v-if="trends.length" class="card overflow-hidden">
        <div class="border-b border-line px-5 py-4">
          <p class="eyebrow">Summary</p>
          <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.cashFlow") }}</h2>
        </div>
        <ul class="divide-y divide-line-soft">
          <li v-for="row in trends" :key="row.month" class="flex items-center justify-between px-5 py-3 text-sm">
            <span class="text-muted">{{ row.month }}</span>
            <span class="font-bold tabular-nums" :class="row.income - row.expenses >= 0 ? 'text-success' : 'text-danger'">
              {{ formatTHB(row.income - row.expenses, locale) }}
            </span>
          </li>
        </ul>
      </article>
    </template>
  </section>
</template>
