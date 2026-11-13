<script setup lang="ts">

import { computed, onMounted, ref } from "vue";

import { RouterLink } from "vue-router";

import { useI18n } from "vue-i18n";

import { Doughnut, Bar } from "vue-chartjs";

import {

  Chart as ChartJS,

  ArcElement,

  BarElement,

  CategoryScale,

  LinearScale,

  Tooltip,

  Legend,

} from "chart.js";

import RangeSelect from "../components/RangeSelect.vue";

import { api } from "../lib/api";

import { formatTHB } from "../lib/money";

import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";



ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);



const { t, locale } = useI18n();

const auth = useAuthStore();
const theme = useThemeStore();

const loading = ref(true);

const error = ref("");

const range = ref("this_month");

const startDate = ref("");

const endDate = ref("");

const data = ref<Record<string, unknown> | null>(null);



async function load() {

  loading.value = true;

  error.value = "";

  try {

    const params = {
      range: range.value,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    };
    let res;

    try {
      res = await api.get("/dashboard/summary", { params });
    } catch (cause) {
      const status = (cause as { response?: { status?: number } })?.response?.status;
      if (status !== 503) throw cause;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      res = await api.get("/dashboard/summary", { params });
    }

    data.value = res.data.data;

  } catch (cause) {

    const status = (cause as { response?: { status?: number } })?.response?.status;
    error.value = status === 503 ? t("common.serviceUnavailable") : t("common.error");

  } finally {

    loading.value = false;

  }

}



onMounted(load);



const totals = () => (data.value?.totals ?? {}) as Record<string, number>;

const categories = () =>

  (data.value?.categories ?? []) as { category: string; amount: number }[];

const trends = () =>

  (data.value?.trends ?? []) as { month: string; income: number; expenses: number }[];

const recent = () =>

  (data.value?.recentTransactions ?? []) as {

    id: string;

    title: string;

    amount: number;

    type: string;

    category: string;

  }[];

const goals = () =>

  (data.value?.goals ?? []) as {

    id: string;

    name: string;

    progress: number;

    currentAmount: number;

    targetAmount: number;

  }[];

const budgets = () =>

  (data.value?.budgets ?? []) as {

    category: string;

    percentUsed: number;

    warning: string;

  }[];



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

</script>



<template>

  <main class="dashboard-page mx-auto w-full max-w-[1400px] space-y-7 pb-10 text-ink sm:space-y-8">

    <!-- Header -->

    <header class="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">

      <div>

        <p class="mb-2 text-sm font-medium text-muted">{{ t("app.tagline") }}</p>

        <h1 class="text-[32px] leading-[1.08] tracking-[-0.04em] text-ink sm:text-[40px] sm:leading-[1.05]">

          {{ t("dashboard.greeting", { name: auth.user?.name?.split(" ")[0] || "" }) }}

        </h1>

        <p class="mt-2 text-[15px] leading-6 text-muted">

          Your financial snapshot, all in one place.

        </p>

      </div>

      <div class="w-full sm:w-auto sm:min-w-[250px]">

        <RangeSelect

          v-model:range="range"

          v-model:startDate="startDate"

          v-model:endDate="endDate"

          @change="load"

        />

      </div>

    </header>



    <!-- Loading -->

    <div v-if="loading" class="space-y-6">

      <div class="grid gap-4 xl:grid-cols-12">

        <div class="h-64 animate-pulse rounded-2xl bg-surface-2 xl:col-span-5"></div>

        <div class="grid grid-cols-2 gap-4 xl:col-span-7">

          <div v-for="n in 4" :key="n" class="h-28 animate-pulse rounded-2xl bg-surface-2"></div>

        </div>

      </div>

      <div class="grid gap-5 xl:grid-cols-2">

        <div class="h-80 animate-pulse rounded-2xl bg-surface-2"></div>

        <div class="h-80 animate-pulse rounded-2xl bg-surface-2"></div>

      </div>

    </div>



    <!-- Error -->

    <div

      v-else-if="error"

      role="alert"

      class="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-surface px-5 py-16 text-center"

    >

      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">

        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">

          <circle cx="12" cy="12" r="10" />

          <path d="M12 8v4m0 4h.01" />

        </svg>

      </div>

      <h3 class="font-semibold text-ink">Something went wrong</h3>

      <p class="mt-2 text-sm text-muted">{{ error }}</p>

      <button

        class="btn-primary mt-5"

        @click="load"

      >

        {{ t("common.retry") }}

      </button>

    </div>



    <template v-else>

      <!-- Main financial overview -->

      <section class="grid items-stretch gap-4 xl:grid-cols-12">

        <article class="relative isolate flex min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-[#14233B] p-6 text-white sm:p-8 xl:col-span-5">

          <div class="relative">

            <div class="flex items-center justify-between gap-3">

              <div class="flex items-center gap-3">

                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#B8C7E1]">

                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">

                    <rect x="2" y="5" width="20" height="15" rx="2" />

                    <path d="M2 10h20M7 15h3" />

                  </svg>

                </div>

                <div>

                  <p class="text-[12px] tracking-[-0.24px]">{{ t("dashboard.available") }}</p>

                  <p class="mt-0.5 text-base tracking-[-0.02em] text-white/90">Total balance</p>

                </div>

              </div>

              <span class="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/85">

                Overview

              </span>

            </div>



            <p class="money mt-8 break-words text-[38px] sm:text-[52px]">

              {{ formatTHB(totals().availableBalance || 0, locale) }}

            </p>

            <div class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/75">

              <span>{{ t("dashboard.cashFlow") }}</span>

              <span>

                {{ formatTHB(totals().netCashFlow || 0, locale) }}

              </span>

            </div>



            <div class="mt-8 max-w-[320px] rounded-2xl border border-white/15 bg-white/5 p-5 text-white">

              <div class="flex items-center justify-between gap-3">

                <p class="text-sm text-white/80">{{ t("dashboard.savingRate") }}</p>

                <p class="text-xl font-semibold tabular-nums">{{ totals().monthlySavingRate || 0 }}%</p>

              </div>

              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white/20">

                <div

                  class="h-full rounded-full bg-[#B8C7E1] transition-[width] duration-500"

                  :style="{ width: Math.min(Math.max(totals().monthlySavingRate || 0, 0), 100) + '%' }"

                ></div>

              </div>

            </div>

          </div>

        </article>



        <!-- KPI cards -->

        <div class="metrics-grid grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface xl:col-span-7">

          <article class="metric-item min-w-0 p-4 sm:p-5">

            <div class="flex items-center justify-between gap-2">

              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">

                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">

                  <path d="M12 19V5m-7 7 7-7 7 7" />

                </svg>

              </div>


            </div>

            <p class="mt-5 text-xs font-medium text-muted">{{ t("dashboard.income") }}</p>

            <p class="mt-1 break-words text-xl font-bold tracking-tight text-success sm:text-2xl">

              {{ formatTHB(totals().income || 0, locale) }}

            </p>

            <p class="mt-2 text-xs text-muted">Total income for selected period</p>

          </article>



          <article class="metric-item min-w-0 p-4 sm:p-5">

            <div class="flex items-center justify-between gap-2">

              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger">

                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">

                  <path d="M12 5v14m7-7-7 7-7-7" />

                </svg>

              </div>


            </div>

            <p class="mt-5 text-xs font-medium text-muted">{{ t("dashboard.expenses") }}</p>

            <p class="mt-1 break-words text-xl font-bold tracking-tight text-danger sm:text-2xl">

              {{ formatTHB(totals().expenses || 0, locale) }}

            </p>

            <p class="mt-2 text-xs text-muted">Total expenses for selected period</p>

          </article>



          <article class="metric-item min-w-0 p-4 sm:p-5">

            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">

                <path d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />

              </svg>

            </div>

            <p class="mt-5 text-xs font-medium text-muted">{{ t("dashboard.savings") }}</p>

            <p class="mt-1 break-words text-xl font-bold tracking-tight text-ink sm:text-2xl">

              {{ formatTHB(totals().totalSavings || 0, locale) }}

            </p>

            <p class="mt-2 text-xs text-muted">Accumulated savings</p>

          </article>



          <article class="metric-item min-w-0 p-4 sm:p-5">

            <div class="flex items-center justify-between gap-2">

              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning">

                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">

                  <rect x="3" y="3" width="18" height="18" rx="3" />

                  <path d="M8 12h8m-4-4v8" />

                </svg>

              </div>


            </div>

            <p class="mt-5 text-xs font-medium text-muted">{{ t("dashboard.budgetUsage") }}</p>

            <p class="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">

              {{ totals().monthlyBudgetUsage || 0 }}%

            </p>

            <p class="mt-2 text-xs text-muted">Monthly budget utilization</p>

          </article>

        </div>

      </section>



      <!-- Analytics -->

      <section class="grid items-stretch gap-4 xl:grid-cols-2">

        <article class="min-w-0 rounded-[24px] border border-line bg-surface p-5 transition duration-200 sm:p-6">

          <div class="mb-6 flex items-start justify-between gap-3">

            <div>

              <p class="text-xs font-semibold text-primary">Analytics</p>

              <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.expenses") }}</h2>

              <p class="mt-1 text-xs text-muted">Expense breakdown by category</p>

            </div>

            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">

                <path d="M12 3v9h9A9 9 0 1 1 12 3Z" />

                <path d="M16 3.5A9 9 0 0 1 21 9h-9V3" />

              </svg>

            </div>

          </div>

          <div v-if="categories().length" class="mx-auto h-[280px] max-w-[390px]">

            <Doughnut

              :data="{

                labels: categories().map((c) => t('cats.' + c.category)),

                datasets: [{

                  data: categories().map((c) => c.amount),

                  backgroundColor: chartColors,

                  borderColor: chartTone.surface,

                  borderWidth: 4,

                  hoverOffset: 7,

                }],

              }"

              :options="{

                responsive: true,

                maintainAspectRatio: false,

                cutout: '72%',

                plugins: {

                  legend: {

                    position: 'bottom',

                    labels: {

                      color: chartTone.text,

                      padding: 18,

                      usePointStyle: true,

                      pointStyle: 'circle',

                      font: { size: 11 },

                    },

                  },

                },

              }"

            />

          </div>

          <div v-else class="flex min-h-[280px] flex-col items-center justify-center text-center">

            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">

                <circle cx="12" cy="12" r="9" />

                <path d="M12 3v9l7 4" />

              </svg>

            </div>

            <p class="mt-3 text-sm text-muted">{{ t("tx.empty") }}</p>

          </div>

        </article>



        <article class="min-w-0 rounded-[24px] border border-line bg-surface p-5 transition duration-200 sm:p-6">

          <div class="mb-6 flex items-start justify-between gap-3">

            <div>

              <p class="text-xs font-semibold text-primary">Cash flow</p>

              <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.income") }} / {{ t("dashboard.expenses") }}</h2>

              <p class="mt-1 text-xs text-muted">Income and expense trends</p>

            </div>

            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">

                <path d="M3 3v18h18" />

                <path d="m7 14 4-4 4 3 6-7" />

              </svg>

            </div>

          </div>

          <div v-if="trends().length" class="h-[280px] w-full">

            <Bar

              :data="{

                labels: trends().map((r) => r.month),

                datasets: [

                  {

                    label: t('dashboard.income'),

                    data: trends().map((r) => r.income),

                    backgroundColor: chartTone.income,

                    borderRadius: 6,

                    maxBarThickness: 26,

                  },

                  {

                    label: t('dashboard.expenses'),

                    data: trends().map((r) => r.expenses),

                    backgroundColor: chartTone.expenses,

                    borderRadius: 6,

                    maxBarThickness: 26,

                  },

                ],

              }"

              :options="{

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                  legend: {

                    position: 'bottom',

                    labels: {

                      color: chartTone.text,

                      padding: 18,

                      usePointStyle: true,

                      pointStyle: 'circle',

                      font: { size: 11 },

                    },

                  },

                },

                scales: {

                  x: {

                    grid: { display: false },

                    ticks: { color: chartTone.text, font: { size: 12, weight: 400 } },

                    border: { display: false },

                  },

                  y: {

                    beginAtZero: true,

                    grid: { color: chartTone.grid },

                    ticks: { color: chartTone.text, font: { size: 12, weight: 400 } },

                    border: { display: false },

                  },

                },

              }"

            />

          </div>

          <div v-else class="flex min-h-[280px] flex-col items-center justify-center text-center">

            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">

                <path d="M3 3v18h18" />

                <path d="m7 14 4-4 4 3 6-7" />

              </svg>

            </div>

            <p class="mt-3 text-sm text-muted">{{ t("tx.empty") }}</p>

          </div>

        </article>

      </section>



      <!-- Activity and goals -->

      <section class="grid items-start gap-4 xl:grid-cols-5">

        <article class="min-w-0 rounded-[24px] border border-line bg-surface p-5 sm:p-6 xl:col-span-3">

          <div class="mb-5 flex items-center justify-between gap-3">

            <div>

              <p class="text-xs font-semibold text-primary">Activity</p>

              <h2 class="mt-1 text-base font-bold text-ink">{{ t("dashboard.recent") }}</h2>

              <p class="mt-1 text-xs text-muted">Your latest financial activities</p>

            </div>

            <RouterLink

              to="/transactions"

              class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-primary/30 hover:bg-primary-soft"

            >

              {{ t("nav.transactions") }}

              <span aria-hidden="true">→</span>

            </RouterLink>

          </div>



          <div v-if="recent().length" class="divide-y divide-line-soft">

            <div

              v-for="item in recent()"

              :key="item.id"

              class="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"

            >

              <div class="flex min-w-0 items-center gap-3">

                <div

                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"

                  :class="{

                    'bg-success-soft text-success': item.type === 'income',

                    'bg-danger-soft text-danger': item.type === 'expense',

                    'bg-surface-2 text-muted': item.type !== 'income' && item.type !== 'expense',

                  }"

                >

                  <svg v-if="item.type === 'income'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">

                    <path d="M12 19V5m-7 7 7-7 7 7" />

                  </svg>

                  <svg v-else-if="item.type === 'expense'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">

                    <path d="M12 5v14m7-7-7 7-7-7" />

                  </svg>

                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">

                    <rect x="3" y="3" width="18" height="18" rx="4" />

                    <path d="M8 12h8" />

                  </svg>

                </div>

                <div class="min-w-0">

                  <p class="truncate text-sm font-semibold text-ink">{{ item.title }}</p>

                  <p class="mt-1 truncate text-xs text-muted-2">{{ t("cats." + item.category) }}</p>

                </div>

              </div>

              <p

                class="shrink-0 text-sm font-bold tabular-nums"

                :class="{

                  'text-success': item.type === 'income',

                  'text-danger': item.type === 'expense',

                  'text-muted': item.type !== 'income' && item.type !== 'expense',

                }"

              >

                {{ item.type === "expense" ? "-" : item.type === "income" ? "+" : "" }}{{ formatTHB(item.amount, locale) }}

              </p>

            </div>

          </div>

          <div v-else class="flex flex-col items-center justify-center py-12 text-center">

            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">

                <rect x="3" y="3" width="18" height="18" rx="3" />

                <path d="M8 12h8m-8-4h8m-8 8h5" />

              </svg>

            </div>

            <p class="mt-3 text-sm text-muted">{{ t("tx.empty") }}</p>

          </div>

        </article>



        <article class="min-w-0 rounded-[24px] border border-line bg-surface p-5 sm:p-6 xl:col-span-2">

          <div class="mb-6 flex items-center gap-3">

            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">

                <circle cx="12" cy="12" r="9" />

                <circle cx="12" cy="12" r="5" />

                <circle cx="12" cy="12" r="1" />

              </svg>

            </div>

            <div>

              <p class="text-xs font-semibold text-primary">Planning</p>

              <h2 class="mt-0.5 text-base font-bold text-ink">{{ t("dashboard.goals") }}</h2>

            </div>

          </div>



          <div v-if="goals().length" class="space-y-6">

            <div v-for="goal in goals()" :key="goal.id">

              <div class="mb-2 flex items-start justify-between gap-3">

                <div class="min-w-0">

                  <p class="truncate text-sm font-semibold text-ink">{{ goal.name }}</p>

                  <p class="mt-1 text-xs text-muted-2">

                    {{ formatTHB(goal.currentAmount, locale) }} / {{ formatTHB(goal.targetAmount, locale) }}

                  </p>

                </div>

                <span class="shrink-0 text-sm font-bold text-primary">{{ Math.round(goal.progress) }}%</span>

              </div>

              <div class="h-2.5 overflow-hidden rounded-full bg-surface-2">

                <div

                  class="h-full rounded-full bg-primary transition-[width] duration-500"

                  :style="{ width: Math.min(Math.max(goal.progress, 0), 100) + '%' }"

                ></div>

              </div>

            </div>

          </div>

          <div v-else class="flex flex-col items-center justify-center py-12 text-center">

            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">

              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">

                <circle cx="12" cy="12" r="9" />

                <circle cx="12" cy="12" r="5" />

              </svg>

            </div>

            <p class="mt-3 text-sm text-muted">{{ t("goals.empty") }}</p>

          </div>

        </article>

      </section>



      <!-- Budget overview -->

      <section class="rounded-[24px] border border-line bg-surface p-5 transition duration-200 sm:p-6">

        <div class="mb-6 flex items-center gap-3">

          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning">

            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">

              <rect x="3" y="3" width="18" height="18" rx="3" />

              <path d="M8 8h8m-8 4h8m-8 4h4" />

            </svg>

          </div>

          <div>

            <p class="text-xs font-semibold text-warning-dark">Control</p>

            <h2 class="text-base font-bold text-ink">{{ t("nav.budgets") }}</h2>

            <p class="mt-1 text-xs text-muted">Budget utilization overview</p>

          </div>

        </div>



        <div v-if="budgets().length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <div v-for="b in budgets()" :key="b.category" class="rounded-xl border border-line-soft bg-surface-2 p-4">

            <div class="mb-3 flex items-start justify-between gap-3">

              <p class="text-sm font-semibold text-ink">{{ t("cats." + b.category) }}</p>

              <span

                class="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"

                :class="{

                  'bg-success-soft text-success': b.percentUsed < 80,

                  'bg-warning-soft text-warning-dark': b.percentUsed >= 80 && b.percentUsed < 100,

                  'bg-danger-soft text-danger': b.percentUsed >= 100,

                }"

              >

                {{ b.percentUsed }}%

              </span>

            </div>

            <div class="h-2 overflow-hidden rounded-full bg-surface-2">

              <div

                class="h-full rounded-full transition-all duration-500"

                :class="{

                  'bg-success': b.percentUsed < 80,

                  'bg-warning': b.percentUsed >= 80 && b.percentUsed < 100,

                  'bg-danger': b.percentUsed >= 100,

                }"

                :style="{ width: Math.min(Math.max(b.percentUsed, 0), 100) + '%' }"

              ></div>

            </div>

            <p v-if="b.warning !== 'ok'" class="mt-3 text-xs font-medium text-warning-dark">

              {{ b.warning }}

            </p>

          </div>

        </div>

        <div v-else class="flex flex-col items-center justify-center py-10 text-center">

          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">

            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">

              <rect x="3" y="3" width="18" height="18" rx="3" />

              <path d="M8 12h8" />

            </svg>

          </div>

          <p class="mt-3 text-sm text-muted">{{ t("budgets.empty") }}</p>

        </div>

      </section>

    </template>

  </main>

</template>
