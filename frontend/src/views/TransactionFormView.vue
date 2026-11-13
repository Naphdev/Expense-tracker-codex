<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "../components/PageHeader.vue";
import { api } from "../lib/api";
import { todayISO } from "../lib/money";
import { useSyncStore } from "../stores/sync";
import { useToastStore } from "../stores/toast";
import { requestNotificationRefresh } from "../lib/notificationEvents";

const incomeCats = ["salary", "freelance", "business", "investment_income", "bonus", "other"];
const expenseCats = ["food", "transportation", "shopping", "housing", "utilities", "entertainment", "healthcare", "education", "subscription", "other"];
const methods = ["cash", "bank", "card", "e_wallet", "other"];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const sync = useSyncStore();
const toast = useToastStore();
const id = ref(route.params.id === "new" ? "" : String(route.params.id || ""));
const accounts = ref<{ id: string; name: string }[]>([]);
const error = ref("");
const saving = ref(false);
const deleting = ref(false);
const deleteError = ref("");
const deleteDialog = ref<HTMLDialogElement | null>(null);
const deleteCancelButton = ref<HTMLButtonElement | null>(null);
const form = reactive({
  type: "expense" as "income" | "expense" | "transfer",
  title: "",
  amount: "",
  category: "food",
  date: todayISO(),
  paymentMethod: "cash",
  sourceAccountId: "",
  destinationAccountId: "",
  description: "",
});

watch(
  () => form.type,
  (value) => {
    form.category = value === "income" ? "salary" : value === "transfer" ? "transfer" : "food";
  },
);

onMounted(async () => {
  try {
    const acc = await api.get("/accounts");
    accounts.value = acc.data.data;
  } catch {
    accounts.value = [];
  }
  if (id.value) {
    try {
      const res = await api.get(`/transactions/${id.value}`);
      Object.assign(form, {
        type: res.data.data.type,
        title: res.data.data.title,
        amount: String(res.data.data.amount),
        category: res.data.data.category,
        date: String(res.data.data.date).slice(0, 10),
        paymentMethod: res.data.data.paymentMethod,
        sourceAccountId: res.data.data.sourceAccountId || "",
        destinationAccountId: res.data.data.destinationAccountId || "",
        description: res.data.data.description || "",
      });
    } catch {
      error.value = t("common.error");
    }
  }
});

async function save() {
  error.value = "";
  const amount = Number(form.amount);
  if (!form.title || !amount || amount <= 0) {
    error.value = t("validation.amount");
    return;
  }
  saving.value = true;
  const payload = {
    ...form,
    amount,
    sourceAccountId: form.sourceAccountId || null,
    destinationAccountId: form.destinationAccountId || null,
    clientRequestId: crypto.randomUUID(),
  };
  try {
    if (sync.online) {
      if (id.value) await api.put(`/transactions/${id.value}`, payload);
      else await api.post("/transactions", payload);
    } else {
      const localId = id.value || `local-${payload.clientRequestId}`;
      await sync.queueChange(id.value ? "update" : "create", { ...payload, id: localId }, {
        id: localId,
        ...payload,
        updatedAt: new Date().toISOString(),
        pending: true,
      });
    }
    requestNotificationRefresh();
    toast.show(t("common.saved"));
    await router.push("/transactions");
  } catch {
    error.value = t("common.error");
  } finally {
    saving.value = false;
  }
}

function openDeleteConfirmation() {
  deleteError.value = "";
  deleteDialog.value?.showModal();
  requestAnimationFrame(() => deleteCancelButton.value?.focus());
}

function keepDeleteDialogOpen(event: Event) {
  if (deleting.value) event.preventDefault();
}

async function remove() {
  if (!id.value || deleting.value) return;
  deleteError.value = "";
  deleting.value = true;
  try {
    if (sync.online) await api.delete(`/transactions/${id.value}`);
    else await sync.queueChange("delete", { id: id.value, clientRequestId: crypto.randomUUID() }, {
      id: id.value,
      type: form.type,
      title: form.title,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      paymentMethod: form.paymentMethod,
      updatedAt: new Date().toISOString(),
      pending: true,
    });
    deleteDialog.value?.close();
    await router.push("/transactions");
  } catch {
    deleteError.value = t("common.error");
  } finally {
    deleting.value = false;
  }
}
</script>
<template>
  <section class="mx-auto max-w-xl space-y-6">
    <PageHeader eyebrow="Personal finance / Activity" :title="id ? t('tx.edit') : t('tx.add')" subtitle="Record where your money goes." />

    <div class="grid grid-cols-3 gap-2 rounded-full bg-surface p-1">
      <button
        v-for="value in (['expense','income','transfer'] as const)"
        :key="value"
        type="button"
        class="h-[46px] rounded-full text-[12px] font-medium tracking-[-0.24px]"
        :class="form.type === value ? 'ink-pill' : 'text-muted hover:bg-surface-2'"
        @click="form.type = value"
      >
        {{ t("tx." + value) }}
      </button>
    </div>

    <form class="card grid gap-4 p-5 sm:p-6" @submit.prevent="save">
      <label class="grid gap-1.5"><span class="label">{{ t("tx.title") }}</span><input v-model="form.title" class="field" required /></label>
      <label class="grid gap-1.5"><span class="label">{{ t("tx.amount") }}</span><input v-model="form.amount" class="field" inputmode="decimal" type="number" step="0.01" min="0" required /></label>
      <label v-if="form.type !== 'transfer'" class="grid gap-1.5"><span class="label">{{ t("tx.category") }}</span>
        <select v-model="form.category" class="field">
          <option v-for="cat in form.type === 'income' ? incomeCats : expenseCats" :key="cat" :value="cat">{{ t("cats." + cat) }}</option>
        </select>
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5"><span class="label">{{ t("tx.date") }}</span><input v-model="form.date" class="field" type="date" required /></label>
        <label class="grid gap-1.5"><span class="label">{{ t("tx.method") }}</span>
          <select v-model="form.paymentMethod" class="field">
            <option v-for="m in methods" :key="m" :value="m">{{ t("methods." + m) }}</option>
          </select>
        </label>
      </div>
      <label v-if="form.type !== 'income'" class="grid gap-1.5"><span class="label">{{ t("tx.source") }}</span>
        <select v-model="form.sourceAccountId" class="field">
          <option value="">{{ t("tx.source") }}</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <label v-if="form.type !== 'expense'" class="grid gap-1.5"><span class="label">{{ t("tx.destination") }}</span>
        <select v-model="form.destinationAccountId" class="field">
          <option value="">{{ t("tx.destination") }}</option>
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </label>
      <label class="grid gap-1.5"><span class="label">{{ t("tx.description") }}</span><textarea v-model="form.description" class="field min-h-24 py-3" /></label>

      <p v-if="error" class="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{{ error }}</p>

      <div class="flex flex-col gap-2 sm:flex-row">
        <button class="btn-primary flex-1" :disabled="saving">{{ saving ? t("common.loading") : t("tx.save") }}</button>
        <button v-if="id" class="btn-danger sm:w-auto" type="button" @click="openDeleteConfirmation">{{ t("tx.delete") }}</button>
      </div>
    </form>

    <dialog
      ref="deleteDialog"
      class="delete-dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      @cancel="keepDeleteDialogOpen"
      @close="deleteError = ''"
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
            <h2 id="delete-dialog-title" class="text-lg font-semibold leading-6 text-ink">{{ t("tx.confirmDelete") }}</h2>
            <p id="delete-dialog-description" class="mt-2 text-sm leading-6 text-muted">{{ t("tx.deleteWarning") }}</p>
          </div>
        </div>

        <div v-if="form.title" class="mt-5 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <p class="text-xs font-medium text-muted">{{ t("tx.title") }}</p>
          <p class="mt-1 break-words text-sm font-semibold text-ink">{{ form.title }}</p>
        </div>

        <p v-if="deleteError" class="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">{{ deleteError }}</p>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            ref="deleteCancelButton"
            class="btn-ghost w-full sm:w-auto"
            type="button"
            :disabled="deleting"
            @click="deleteDialog?.close()"
          >{{ t("common.cancel") }}</button>
          <button class="btn-danger w-full sm:w-auto" type="button" :disabled="deleting" @click="remove">
            {{ deleting ? t("common.loading") : t("tx.delete") }}
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

@media (prefers-reduced-motion: reduce) {
  .delete-dialog-panel { animation: none; }
}
</style>
