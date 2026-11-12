<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header class="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="mt-1 text-[30px] leading-[1.12] tracking-[-0.04em] text-ink sm:text-[36px] sm:leading-[1.08]">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 max-w-[42rem] text-[15px] leading-6 tracking-[-0.01em] text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
