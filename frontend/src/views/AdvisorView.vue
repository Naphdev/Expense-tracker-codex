<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { api } from "../lib/api";
import { formatTHB } from "../lib/money";

const { t, locale } = useI18n();
const message = ref("");
const loading = ref(false);
const error = ref("");
const conversationId = ref("");
const history = ref<{ role: string; content: string }[]>([]);
const conversations = ref<{ id: string; title: string }[]>([]);
const advice = ref<Record<string, unknown> | null>(null);
const context = ref<Record<string, unknown> | null>(null);

const suggested = () => [t("advisor.q1"), t("advisor.q2"), t("advisor.q3")];

async function loadConversations() {
  try {
    conversations.value = (await api.get("/ai/conversations")).data.data;
  } catch {
    conversations.value = [];
  }
}

async function openConversation(id: string) {
  const res = await api.get(`/ai/conversations/${id}`);
  conversationId.value = id;
  history.value = (res.data.data.messages as { role: string; content: string }[]).map((item) => {
    if (item.role === "assistant") {
      try {
        const parsed = JSON.parse(item.content) as { summary?: string };
        return { role: "assistant", content: parsed.summary || item.content };
      } catch {
        return item;
      }
    }
    return item;
  });
}

async function send(text = message.value) {
  if (!text.trim()) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await api.post("/ai/advice", { message: text, conversationId: conversationId.value || undefined });
    conversationId.value = res.data.data.conversationId;
    advice.value = res.data.data.advice;
    context.value = res.data.data.context;
    history.value.push({ role: "user", content: text }, { role: "assistant", content: res.data.data.advice.summary });
    message.value = "";
    await loadConversations();
  } catch {
    error.value = t("common.error");
  } finally {
    loading.value = false;
  }
}

onMounted(loadConversations);
</script>
<template>
  <section class="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-5">
    <PageHeader eyebrow="Personal finance / Assistant" :title="t('advisor.title')" subtitle="Ask questions and get guidance grounded in your own numbers." />

    <div v-if="context" class="grid grid-cols-3 gap-3">
      <div class="card p-4">
        <p class="text-xs font-medium text-muted">{{ t("dashboard.income") }}</p>
        <p class="mt-1 truncate text-base font-bold text-success">{{ formatTHB(Number((context as { thisMonth: { income: number } }).thisMonth.income), locale) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-muted">{{ t("dashboard.expenses") }}</p>
        <p class="mt-1 truncate text-base font-bold text-danger">{{ formatTHB(Number((context as { thisMonth: { expenses: number } }).thisMonth.expenses), locale) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-muted">{{ t("dashboard.savingRate") }}</p>
        <p class="mt-1 text-base font-bold text-primary">{{ (context as { thisMonth: { savingsRate: number } }).thisMonth.savingsRate }}%</p>
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1">
      <button v-for="q in suggested()" :key="q" class="chip shrink-0 border border-line bg-surface text-ink hover:bg-surface-2" @click="send(q)">{{ q }}</button>
    </div>

    <div v-if="conversations.length" class="flex gap-2 overflow-x-auto pb-1">
      <button v-for="item in conversations" :key="item.id" class="chip shrink-0 bg-surface-2 text-muted hover:text-ink" @click="openConversation(item.id)">{{ item.title }}</button>
    </div>

    <div class="flex-1 space-y-3">
      <p class="text-xs text-muted-2">{{ t("advisor.disclaimer") }}</p>

      <div v-for="(item, index) in history" :key="index" class="flex" :class="item.role === 'user' ? 'justify-end' : 'justify-start'">
        <div class="max-w-[85%] rounded-[28px] px-4 py-3 text-sm" :class="item.role === 'user' ? 'ink-pill' : 'card'">
          <p class="text-ink" :class="item.role === 'user' ? 'text-white' : ''">{{ item.content }}</p>
        </div>
      </div>

      <div v-if="advice && (advice.recommendations as string[] | undefined)?.length" class="card space-y-2 p-4">
        <p class="text-xs font-bold uppercase tracking-wide text-warning-dark">{{ t("advisor.insights") }}</p>
        <ul class="list-disc space-y-1 pl-5 text-sm text-ink">
          <li v-for="item in (advice.recommendations as string[])" :key="item">{{ item }}</li>
        </ul>
      </div>

      <p v-if="loading" class="text-sm text-muted">{{ t("common.loading") }}…</p>
      <p v-if="error" class="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{{ error }}</p>
    </div>

    <form class="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] flex gap-2 rounded-2xl border border-line bg-surface p-1.5 shadow-sm md:bottom-4" @submit.prevent="send()">
      <input v-model="message" class="field flex-1 border-0 bg-transparent focus:ring-0" :placeholder="t('advisor.placeholder')" :aria-label="t('advisor.placeholder')" />
      <button class="btn-primary shrink-0 px-5" :disabled="loading">{{ t("advisor.send") }}</button>
    </form>
  </section>
</template>
