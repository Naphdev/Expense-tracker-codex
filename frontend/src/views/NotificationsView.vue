<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { formatTHB } from "../lib/money";
import { useNotificationStore, type FinanceNotification } from "../stores/notifications";

const { t, locale } = useI18n();
const notifications = useNotificationStore();
const hasItems = computed(() => notifications.items.length > 0);
const deleteError = computed(() => notifications.error === "deleteFailed");
const deleteDialog = ref<HTMLDialogElement | null>(null);
const deleteCancelButton = ref<HTMLButtonElement | null>(null);
const pendingDeleteId = ref<string | null>(null);
const deleting = ref(false);
const pendingDeleteItem = computed(() => notifications.items.find((item) => item.id === pendingDeleteId.value));

function title(item: FinanceNotification) {
  if (item.type === "budget_threshold") {
    return t("notifications.budgetTitle", {
      threshold: Number(item.data.threshold ?? 0),
      category: t(`cats.${String(item.data.category ?? "other")}`),
    });
  }
  return t("notifications.recurringTitle");
}

function body(item: FinanceNotification) {
  if (item.type === "budget_threshold") {
    return t("notifications.budgetBody", {
      spent: formatTHB(Number(item.data.spent ?? 0), locale.value),
      amount: formatTHB(Number(item.data.amount ?? 0), locale.value),
      month: item.data.month,
      year: item.data.year,
    });
  }
  return t("notifications.recurringBody", {
    title: String(item.data.title ?? ""),
    date: formatDateValue(String(item.data.dueDate ?? "")),
    amount: formatTHB(Number(item.data.amount ?? 0), locale.value),
  });
}

function formatDateValue(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(locale.value === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function createdAt(value: string) {
  return new Intl.DateTimeFormat(locale.value === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function markRead(id: string) {
  try {
    await notifications.markRead(id);
  } catch {
    // Keep the notification unread if the update fails; the page can retry later.
  }
}

async function markAllRead() {
  try {
    await notifications.markAllRead();
  } catch {
    // Keep the unread count until the server confirms the update.
  }
}

async function openDeleteOne(id: string) {
  pendingDeleteId.value = id;
  notifications.error = "";
  deleteDialog.value?.showModal();
  await nextTick();
  deleteCancelButton.value?.focus();
}

async function openDeleteAll() {
  pendingDeleteId.value = null;
  notifications.error = "";
  deleteDialog.value?.showModal();
  await nextTick();
  deleteCancelButton.value?.focus();
}

function keepDeleteDialogOpen(event: Event) {
  if (deleting.value) event.preventDefault();
}

async function confirmDelete() {
  if (deleting.value) return;
  const id = pendingDeleteId.value;
  notifications.error = "";
  deleting.value = true;
  try {
    if (id) await notifications.remove(id);
    else await notifications.removeAll();
    deleteDialog.value?.close();
  } catch {
    notifications.error = "deleteFailed";
  } finally {
    deleting.value = false;
  }
}

</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageHeader eyebrow="Personal finance / Inbox" :title="t('notifications.title')" />
      <div class="flex flex-wrap gap-2">
        <button v-if="notifications.unreadCount" type="button" class="btn-ghost" @click="markAllRead">
          {{ t("notifications.markAll") }}
        </button>
        <button v-if="hasItems" type="button" class="btn-ghost min-h-11 !text-danger" @click="openDeleteAll">
          {{ t("notifications.deleteAll") }}
        </button>
      </div>
    </div>

    <p v-if="deleteError" class="text-sm text-danger" role="alert">{{ t("notifications.deleteFailed") }}</p>

    <div v-if="notifications.loading && !hasItems" class="space-y-3" aria-live="polite">
      <div v-for="item in 4" :key="item" class="h-24 animate-pulse rounded-2xl bg-surface-2" />
    </div>

    <div v-else-if="notifications.error" class="card space-y-3 p-5 text-sm text-danger" role="alert">
      <p>{{ t("notifications.unavailable") }}</p>
      <button type="button" class="font-semibold underline" @click="notifications.load(100)">{{ t("common.retry") }}</button>
    </div>

    <div v-else-if="!hasItems" class="card px-6 py-12 text-center">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
        </svg>
      </div>
      <p class="mt-4 font-semibold text-ink">{{ t("notifications.empty") }}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <RouterLink to="/budgets" class="btn-soft">{{ t("budgets.title") }}</RouterLink>
        <RouterLink to="/recurring" class="btn-soft">{{ t("recurring.title") }}</RouterLink>
      </div>
    </div>

    <ul v-else class="space-y-3" :aria-label="t('notifications.title')">
      <li v-for="item in notifications.items" :key="item.id">
        <article class="card flex items-start gap-3 p-4 sm:gap-4 sm:p-5" :class="item.readAt ? 'opacity-80' : 'border-primary/30'">
          <div
            class="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            :class="item.type === 'budget_threshold' ? 'bg-warning-soft text-warning-dark' : 'bg-primary-soft text-primary'"
            aria-hidden="true"
          >
            <svg v-if="item.type === 'budget_threshold'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19a8 8 0 1 1 16 0M12 11l4-3M12 19h.01" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <h2 class="text-sm font-semibold text-ink">{{ title(item) }}</h2>
              <span v-if="!item.readAt" class="chip bg-primary-soft text-primary">{{ t("notifications.unread") }}</span>
            </div>
            <p class="mt-1 text-sm text-muted">{{ body(item) }}</p>
            <p class="mt-2 text-xs text-muted-2">{{ createdAt(item.createdAt) }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <RouterLink
                :to="item.type === 'budget_threshold' ? '/budgets' : '/recurring'"
                class="btn-soft min-h-11"
                @click="markRead(item.id)"
              >{{ item.type === "budget_threshold" ? t("budgets.title") : t("recurring.title") }}</RouterLink>
              <button v-if="!item.readAt" type="button" class="btn-ghost min-h-11" @click="markRead(item.id)">
                {{ t("notifications.markRead") }}
              </button>
              <button type="button" class="btn-ghost min-h-11 !text-danger" :aria-label="t('notifications.deleteOne')" @click="openDeleteOne(item.id)">
                {{ t("notifications.deleteOne") }}
              </button>
            </div>
          </div>
        </article>
      </li>
    </ul>

    <dialog
      ref="deleteDialog"
      class="delete-dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      @cancel="keepDeleteDialogOpen"
      @close="notifications.error = ''"
    >
      <section class="delete-dialog-panel card p-5 sm:p-6">
        <div class="flex items-start gap-4">
          <div class="grid size-12 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3.75 2.9 19.5a1.4 1.4 0 0 0 1.2 2.1h15.8a1.4 1.4 0 0 0 1.2-2.1L12 3.75Z" />
              <path d="M12 9v5.25M12 17.5h.01" />
            </svg>
          </div>
          <div class="min-w-0 pt-0.5">
            <h2 id="delete-dialog-title" class="text-lg font-semibold leading-6 text-ink">
              {{ pendingDeleteId ? t('notifications.confirmDeleteTitle') : t('notifications.confirmDeleteAllTitle') }}
            </h2>
            <p id="delete-dialog-description" class="mt-2 text-sm leading-6 text-muted">
              {{ pendingDeleteId ? t('notifications.confirmDeleteWarning') : t('notifications.confirmDeleteAll', { count: notifications.items.length }) }}
            </p>
          </div>
        </div>

        <div v-if="pendingDeleteItem" class="mt-5 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <p class="text-xs font-medium text-muted">{{ t('notifications.title') }}</p>
          <p class="mt-1 break-words text-sm font-semibold text-ink">{{ title(pendingDeleteItem) }}</p>
          <p class="mt-1 break-words text-xs text-muted">{{ body(pendingDeleteItem) }}</p>
        </div>

        <p v-if="deleteError" class="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">{{ t('notifications.deleteFailed') }}</p>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button ref="deleteCancelButton" class="btn-ghost w-full sm:w-auto" type="button" :disabled="deleting" @click="deleteDialog?.close()">
            {{ t('common.cancel') }}
          </button>
          <button class="btn-danger w-full sm:w-auto" type="button" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? t('common.loading') : pendingDeleteId ? t('notifications.deleteOne') : t('notifications.deleteAll') }}
          </button>
        </div>
      </section>
    </dialog>
  </section>
</template>

<style scoped>
.delete-dialog {
  width: min(28rem, calc(100vw - 2rem));
  max-width: none;
  max-height: calc(100dvh - 2rem);
  margin: auto;
  padding: 0;
  overflow: visible;
  border: 0;
  background: transparent;
  color: var(--ink);
}

.delete-dialog::backdrop {
  background: rgb(12 23 40 / 58%);
  backdrop-filter: blur(3px);
}

.delete-dialog-panel {
  animation: delete-dialog-enter 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes delete-dialog-enter {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
