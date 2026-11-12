<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";

const { t } = useI18n();
const range = ref("this_month");
const downloading = ref<"pdf" | "excel" | "">("");

async function download(kind: "pdf" | "excel") {
  downloading.value = kind;
  try {
    const res = await api.get(`/reports/export/${kind}`, { params: { range: range.value }, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "pdf" ? "finance-report.pdf" : "finance-report.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    downloading.value = "";
  }
}
</script>
<template>
  <section class="mx-auto max-w-2xl space-y-6">
    <PageHeader eyebrow="Personal finance / Export" :title="t('reports.title')" subtitle="Generate a shareable report of your finances." />

    <div class="card space-y-5 p-5 sm:p-6">
      <label class="grid gap-1.5">
        <span class="label">{{ t("reports.period") }}</span>
        <select v-model="range" class="field">
          <option value="this_week">{{ t("dashboard.thisWeek") }}</option>
          <option value="this_month">{{ t("dashboard.thisMonth") }}</option>
          <option value="last_month">{{ t("dashboard.lastMonth") }}</option>
        </select>
      </label>

      <div class="grid gap-3 sm:grid-cols-2">
        <button class="btn-primary" :disabled="downloading !== ''" @click="download('pdf')">
          {{ downloading === "pdf" ? t("common.loading") : t("reports.pdf") }}
        </button>
        <button class="btn-ghost" :disabled="downloading !== ''" @click="download('excel')">
          {{ downloading === "excel" ? t("common.loading") : t("reports.excel") }}
        </button>
      </div>
    </div>
  </section>
</template>
