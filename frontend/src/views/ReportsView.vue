<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { getComparisonPeriod, getReportPeriod, formatReportPeriod, type ReportRange } from "../lib/reportPeriods";

type AccountOption = { id: string; name: string };
type PdfLayout = "summary" | "detailed";
type TransactionType = "all" | "income" | "expense" | "transfer";

const { t, locale } = useI18n();
const auth = useAuthStore();
const timezone = computed(() => auth.user?.timezone || "Asia/Bangkok");
const initialPeriod = getReportPeriod("this_month", timezone.value, "", "");
const range = ref<ReportRange>("this_month");
const customStart = ref(initialPeriod?.start ?? "");
const customEnd = ref(initialPeriod?.end ?? "");
const compare = ref(true);
const accountId = ref("");
const type = ref<TransactionType>("all");
const category = ref("");
const pdfLayout = ref<PdfLayout>("summary");
const downloading = ref<"pdf" | "excel" | "">("");
const error = ref("");
const accounts = ref<AccountOption[]>([]);

const selectedPeriod = computed(() => getReportPeriod(range.value, timezone.value, customStart.value, customEnd.value));
const previousPeriod = computed(() => selectedPeriod.value && compare.value
  ? getComparisonPeriod(range.value, selectedPeriod.value)
  : null);
const selectedDatesLabel = computed(() => formatReportPeriod(selectedPeriod.value, locale.value));
const comparisonDatesLabel = computed(() => formatReportPeriod(previousPeriod.value, locale.value));
const customDatesInvalid = computed(() => range.value === "custom" && (
  !customStart.value || !customEnd.value || customStart.value > customEnd.value
));

async function loadAccounts() {
  try {
    const response = await api.get("/accounts");
    accounts.value = response.data.data;
  } catch {
    accounts.value = [];
  }
}

async function download(kind: "pdf" | "excel") {
  error.value = "";
  if (customDatesInvalid.value) {
    error.value = !customStart.value || !customEnd.value ? t("reports.customRangeError") : t("reports.invalidDates");
    return;
  }
  downloading.value = kind;
  try {
    const params = {
      range: range.value,
      startDate: range.value === "custom" ? customStart.value : undefined,
      endDate: range.value === "custom" ? customEnd.value : undefined,
      compare: String(compare.value),
      accountId: accountId.value || undefined,
      type: type.value,
      category: category.value || undefined,
      language: locale.value,
      pdfLayout: pdfLayout.value,
    };
    const response = await api.get("/reports/export/" + kind, { params, responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    const periodTag = selectedPeriod.value
      ? selectedPeriod.value.start + "-to-" + selectedPeriod.value.end
      : "custom";
    anchor.download = kind === "pdf"
      ? "finance-report-" + periodTag + "-" + pdfLayout.value + ".pdf"
      : "finance-report-" + periodTag + ".xlsx";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } catch {
    error.value = t("reports.exportError");
  } finally {
    downloading.value = "";
  }
}

onMounted(loadAccounts);
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader
      eyebrow="Personal finance / Export"
      :title="t('reports.title')"
      :subtitle="t('reports.subtitle')"
    />

    <div class="card space-y-6 p-5 sm:p-6">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.period") }}</span>
          <select v-model="range" class="field">
            <option value="this_week">{{ t("dashboard.thisWeek") }}</option>
            <option value="this_month">{{ t("dashboard.thisMonth") }}</option>
            <option value="last_month">{{ t("dashboard.lastMonth") }}</option>
            <option value="this_year">{{ t("reports.thisYear") }}</option>
            <option value="custom">{{ t("reports.custom") }}</option>
          </select>
        </label>
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.account") }}</span>
          <select v-model="accountId" class="field">
            <option value="">{{ t("reports.allAccounts") }}</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
      </div>

      <div v-if="range === 'custom'" class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.startDate") }}</span>
          <input v-model="customStart" class="field" type="date" :max="customEnd || undefined" />
        </label>
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.endDate") }}</span>
          <input v-model="customEnd" class="field" type="date" :min="customStart || undefined" />
        </label>
      </div>

      <fieldset class="rounded-2xl border border-line bg-surface-2/50 p-4">
        <legend class="px-1 text-sm font-semibold text-ink">{{ t("reports.compare") }}</legend>
        <label class="flex min-h-11 items-start gap-3">
          <input v-model="compare" type="checkbox" class="mt-1 h-4 w-4 accent-primary" />
          <span class="text-sm font-medium text-ink">{{ t("reports.compare") }}</span>
        </label>
        <p id="report-compare-help" class="mt-1 text-xs leading-5 text-muted">{{ t("reports.compareHelp") }}</p>
        <div class="mt-3 grid gap-1 text-xs sm:grid-cols-2">
          <p><span class="font-semibold text-ink">{{ t("reports.selectedDates") }}:</span> {{ selectedDatesLabel || "—" }}</p>
          <p v-if="compare"><span class="font-semibold text-ink">{{ t("reports.comparisonDates") }}:</span> {{ comparisonDatesLabel || "—" }}</p>
        </div>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.type") }}</span>
          <select v-model="type" class="field">
            <option value="all">{{ t("reports.allTypes") }}</option>
            <option value="income">{{ t("reports.income") }}</option>
            <option value="expense">{{ t("reports.expense") }}</option>
            <option value="transfer">{{ t("reports.transfer") }}</option>
          </select>
        </label>
        <label class="grid gap-1.5">
          <span class="label">{{ t("reports.category") }}</span>
          <select v-model="category" class="field">
            <option value="">{{ t("reports.allCategories") }}</option>
            <option v-for="item in ['salary','freelance','business','investment_income','bonus','food','transportation','shopping','housing','utilities','entertainment','healthcare','education','subscription','other','transfer']" :key="item" :value="item">
              {{ t('cats.' + item) }}
            </option>
          </select>
        </label>
      </div>

      <div class="space-y-2">
        <p class="label">{{ t("reports.pdfFormat") }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors"
            :class="pdfLayout === 'summary' ? 'border-primary bg-primary-soft/50' : 'border-line hover:bg-surface-2'">
            <input v-model="pdfLayout" class="mt-1 h-4 w-4 accent-primary" type="radio" value="summary" />
            <span class="grid gap-1">
              <span class="text-sm font-semibold text-ink">{{ t("reports.summaryPdf") }}</span>
              <span class="text-xs leading-5 text-muted">{{ t("reports.summaryHelp") }}</span>
            </span>
          </label>
          <label class="flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors"
            :class="pdfLayout === 'detailed' ? 'border-primary bg-primary-soft/50' : 'border-line hover:bg-surface-2'">
            <input v-model="pdfLayout" class="mt-1 h-4 w-4 accent-primary" type="radio" value="detailed" />
            <span class="grid gap-1">
              <span class="text-sm font-semibold text-ink">{{ t("reports.detailedPdf") }}</span>
              <span class="text-xs leading-5 text-muted">{{ t("reports.detailedHelp") }}</span>
            </span>
          </label>
        </div>
      </div>

      <div class="rounded-xl bg-surface-2 px-4 py-3 text-xs leading-5 text-muted">
        <p>{{ t("reports.excelContents") }}</p>
        <p>{{ t("reports.includedData") }}</p>
        <p class="mt-1">{{ t("reports.budgetNote") }}</p>
      </div>

      <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button class="btn-primary min-h-12" :disabled="downloading !== '' || customDatesInvalid" @click="download('pdf')">
          {{ downloading === "pdf" ? t("common.loading") : t("reports.pdf") }}
        </button>
        <button class="btn-ghost min-h-12" :disabled="downloading !== '' || customDatesInvalid" @click="download('excel')">
          {{ downloading === "excel" ? t("common.loading") : t("reports.excel") }}
        </button>
      </div>
    </div>
  </section>
</template>
