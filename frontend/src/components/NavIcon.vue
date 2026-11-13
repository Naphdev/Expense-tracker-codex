<script setup lang="ts">
defineProps<{
  name: "home" | "list" | "add" | "chart" | "user" | "bell" | "more" | "wallet" | "target" | "account" | "repeat" | "calendar" | "advisor" | "report";
}>();
</script>
<template>
  <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-if="name === 'home'" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    <path v-else-if="name === 'list'" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    <path v-else-if="name === 'add'" d="M12 5v14M5 12h14" />
    <path v-else-if="name === 'chart'" d="M4 19h16M7 16V9m5 7V5m5 14v-6" />
    <path v-else-if="name === 'bell'" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    <template v-else-if="name === 'more'"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></template>
    <template v-else-if="name === 'wallet'"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18m-5 5h2M6 6V4h12v2" /></template>
    <template v-else-if="name === 'target'"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></template>
    <template v-else-if="name === 'account'"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.7-1.4 1.7-2 3-2s2.3.6 3 2m3-5h3m-3 3h3" /></template>
    <template v-else-if="name === 'repeat'"><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3" /></template>
    <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18m-13 4h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></template>
    <template v-else-if="name === 'advisor'"><path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z" /><path d="M5 3v3M3.5 4.5h3M5 18v3m-1.5-1.5h3" /></template>
    <template v-else-if="name === 'report'"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 17v-3m4 3V10m4 7v-5" /></template>
    <path v-else d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 1 0-14 0" />
  </svg>
</template>
