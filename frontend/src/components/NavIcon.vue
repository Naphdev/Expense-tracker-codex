<script setup lang="ts">
defineProps<{ name: "home" | "list" | "add" | "chart" | "user" | "bell" }>();
</script>
<template>
  <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-if="name === 'home'" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    <path v-else-if="name === 'list'" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    <path v-else-if="name === 'add'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'chart'" d="M4 19h16M7 16V9m5 7V5m5 14v-6" />
    <path v-else-if="name === 'bell'" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    <path v-else d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 1 0-14 0" />
  </svg>
</template>
