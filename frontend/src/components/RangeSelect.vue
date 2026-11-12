<script setup lang="ts">
import { useI18n } from "vue-i18n";

const range = defineModel<string>("range", { required: true });
const startDate = defineModel<string>("startDate");
const endDate = defineModel<string>("endDate");
defineProps<{ showYear?: boolean }>();
const emit = defineEmits<{ change: [] }>();
const { t } = useI18n();
</script>
<template>
  <div class="grid min-w-0 gap-2">
    <div class="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
      <button
        v-for="value in ['this_week', 'this_month', 'last_month', ...(showYear ? ['this_year'] : []), 'custom']"
        :key="value"
        type="button"
        class="chip min-h-11 flex-1 border-transparent transition-colors sm:flex-none"
        :class="range === value ? 'ink-pill' : 'text-muted hover:bg-surface-2 hover:text-ink'"
        :aria-pressed="range === value"
        @click="range = value; emit('change')"
      >
        {{ t("dashboard." + (value === "this_week" ? "thisWeek" : value === "this_month" ? "thisMonth" : value === "last_month" ? "lastMonth" : value === "this_year" ? "thisYear" : "custom")) }}
      </button>
    </div>
    <div v-if="range === 'custom'" class="grid grid-cols-2 gap-2">
      <input v-model="startDate" type="date" class="field" @change="emit('change')" />
      <input v-model="endDate" type="date" class="field" @change="emit('change')" />
    </div>
  </div>
</template>
