<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";
import { formatTHB } from "@/lib/money";

const { t, locale } = useI18n();
const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
const year = ref(new Date().getFullYear());
const month = ref(new Date().getMonth() + 1);
const days = ref<{ date: string; type: string; title: string; amount: number }[]>([]);
const selected = ref("");

async function load() {
  const res = await api.get("/calendar", { params: { year: year.value, month: month.value } });
  days.value = res.data.data.days;
}
function prev() {
  if (month.value === 1) { month.value = 12; year.value -= 1; } else month.value -= 1;
  selected.value = "";
  void load();
}
function next() {
  if (month.value === 12) { month.value = 1; year.value += 1; } else month.value += 1;
  selected.value = "";
  void load();
}
const grid = computed(() => {
  const first = new Date(Date.UTC(year.value, month.value - 1, 1));
  const start = first.getUTCDay();
  const count = new Date(Date.UTC(year.value, month.value, 0)).getUTCDate();
  const cells: { day: number | null; key: string }[] = [];
  for (let i = 0; i < start; i += 1) cells.push({ day: null, key: `e-${i}` });
  for (let d = 1; d <= count; d += 1) cells.push({ day: d, key: `${year.value}-${month.value}-${d}` });
  return cells;
});
function marks(day: number) {
  const key = `${year.value}-${String(month.value).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return days.value.filter((item) => String(item.date).slice(0, 10) === key);
}
const selectedItems = computed(() => marks(Number(selected.value)));
onMounted(load);
</script>
<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <PageHeader eyebrow="Personal finance / Timeline" :title="t('calendar.title')" :subtitle="`${month} / ${year}`">
      <template #actions>
        <div class="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
          <button class="grid h-11 w-11 place-items-center rounded-xl text-lg text-muted hover:bg-surface-2" :aria-label="locale === 'th' ? 'เดือนก่อนหน้า' : 'Previous month'" @click="prev">‹</button>
          <button class="grid h-11 w-11 place-items-center rounded-xl text-lg text-muted hover:bg-surface-2" :aria-label="locale === 'th' ? 'เดือนถัดไป' : 'Next month'" @click="next">›</button>
        </div>
      </template>
    </PageHeader>

    <div class="card p-4 sm:p-5">
      <div class="grid grid-cols-7 gap-1 text-center">
        <span v-for="(d, i) in weekdays" :key="i" class="py-1 text-[11px] font-bold uppercase tracking-wide text-muted-2">{{ d }}</span>
      </div>
      <div class="mt-1 grid grid-cols-7 gap-1">
        <button
          v-for="cell in grid"
          :key="cell.key"
          class="relative flex min-h-16 flex-col items-start rounded-xl border p-2 text-left text-sm transition-colors"
          :class="[
            cell.day ? 'border-line bg-surface hover:border-primary/40' : 'border-transparent',
            selected === String(cell.day) && cell.day ? 'border-primary bg-primary-soft' : '',
          ]"
          :disabled="!cell.day"
          :aria-pressed="cell.day ? selected === String(cell.day) : undefined"
          :aria-label="cell.day ? `${t('calendar.title')} ${cell.day}` : undefined"
          @click="selected = String(cell.day)"
        >
          <span v-if="cell.day" class="text-xs font-semibold text-ink">{{ cell.day }}</span>
          <span class="mt-auto flex flex-wrap gap-1">
            <i v-for="(m, i) in cell.day ? marks(cell.day).slice(0, 4) : []" :key="i" class="h-1.5 w-1.5 rounded-full" :class="m.type === 'income' ? 'bg-success' : m.type === 'expense' ? 'bg-danger' : 'bg-primary'" />
          </span>
        </button>
      </div>
    </div>

    <div v-if="selected && selectedItems.length" class="card divide-y divide-line-soft overflow-hidden">
      <p class="px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted">{{ t("dashboard.recent") }} · {{ selected }}</p>
      <div v-for="(item, i) in selectedItems" :key="i" class="flex items-center justify-between gap-3 px-5 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="h-2 w-2 shrink-0 rounded-full" :class="item.type === 'income' ? 'bg-success' : item.type === 'expense' ? 'bg-danger' : 'bg-primary'" />
          <p class="truncate text-sm font-medium text-ink">{{ item.title }}</p>
        </div>
        <p class="shrink-0 text-sm font-bold tabular-nums" :class="item.type === 'income' ? 'text-success' : item.type === 'expense' ? 'text-danger' : 'text-muted'">{{ formatTHB(item.amount, locale) }}</p>
      </div>
    </div>
  </section>
</template>
