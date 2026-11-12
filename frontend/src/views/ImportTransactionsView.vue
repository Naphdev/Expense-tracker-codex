<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import { api } from "@/lib/api";
import { parseImportFile, type ParsedImportTable } from "@/lib/importFiles";
import { formatDate, formatTHB } from "@/lib/money";

type TxType = "income" | "expense";
type DateFormat = "auto" | "dmy" | "mdy" | "ymd";
type RowState = "ready" | "duplicate" | "invalid" | "imported" | "already_imported" | "failed";
interface Account { id: string; name: string; accountType: string }
interface ImportTransaction {
  type: TxType;
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: "cash" | "bank" | "card" | "e_wallet" | "other";
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  clientRequestId: string;
}
interface PossibleDuplicate {
  id: string;
  title: string;
  date: string;
  amount: number;
  rowNumber?: number;
}
interface PreviewRow {
  rowNumber: number;
  raw: string[];
  status: RowState;
  transaction?: ImportTransaction;
  errors: string[];
  duplicate?: PossibleDuplicate;
  include: boolean;
  allowDuplicate: boolean;
}

const incomeCategories = ["salary", "freelance", "business", "investment_income", "bonus", "other"];
const expenseCategories = ["food", "transportation", "shopping", "housing", "utilities", "entertainment", "healthcare", "education", "subscription", "other"];
const { t, locale } = useI18n();

const step = ref(0);
const fileInput = ref<HTMLInputElement>();
const file = ref<File>();
const tables = ref<ParsedImportTable[]>([]);
const tableId = ref("");
const hasHeader = ref(true);
const accounts = ref<Account[]>([]);
const accountId = ref("");
const loadingAccounts = ref(false);
const parsing = ref(false);
const checking = ref(false);
const importing = ref(false);
const fileError = ref("");
const pageError = ref("");
const previewRows = ref<PreviewRow[]>([]);
const importSummary = ref({ imported: 0, skipped: 0, failed: 0 });
const dateFormat = ref<DateFormat>("auto");
const positiveType = ref<TxType | "">("");

const mapping = reactive({ date: -1, title: -1, amount: -1, debit: -1, credit: -1, type: -1, category: -1, paymentMethod: -1 });

const stepLabels = computed(() => [t("import.stepFile"), t("import.stepMapping"), t("import.stepReview"), t("import.stepDone")]);
const table = computed(() => tables.value.find((item) => item.id === tableId.value));
const columnCount = computed(() => Math.max(0, ...(table.value?.rows.map((row) => row.length) ?? [])));
const headerRow = computed(() => hasHeader.value ? table.value?.rows[0] ?? [] : []);
const columnOptions = computed(() => {
  const rows = table.value?.rows ?? [];
  const sampleRowIndex = rows.findIndex((_row, rowIndex) => !hasHeader.value || rowIndex > 0);
  return Array.from({ length: columnCount.value }, (_, index) => ({
    index,
    label: headerRow.value[index]?.trim() || `${t("import.column")} ${index + 1}`,
    sample: sampleRowIndex >= 0 ? rows[sampleRowIndex]?.[index] ?? "" : "",
  }));
});
const dataRows = computed(() => {
  const rows = table.value?.rows ?? [];
  const first = hasHeader.value ? 1 : 0;
  return rows.slice(first).map((raw, index) => ({ rowNumber: first + index + 1, raw }));
});
const selectedCount = computed(() => previewRows.value.filter((row) => row.include && row.transaction).length);
const mappingValid = computed(() => {
  const amountSource = mapping.amount >= 0 || mapping.debit >= 0 || mapping.credit >= 0;
  const typeSource = mapping.type >= 0 || mapping.debit >= 0 || mapping.credit >= 0 || positiveType.value !== "";
  return mapping.date >= 0 && mapping.title >= 0 && amountSource && typeSource && dataRows.value.length > 0;
});

function guessColumn(patterns: RegExp[]) {
  return columnOptions.value.find((column) => patterns.some((pattern) => pattern.test(column.label.trim().toLowerCase())))?.index ?? -1;
}

function guessColumns() {
  mapping.date = guessColumn([/\bdate\b/, /วันที่/, /value date/]);
  mapping.title = guessColumn([/description/, /details?/, /memo/, /narrative/, /รายการ/, /รายละเอียด/, /ชื่อ/]);
  mapping.amount = guessColumn([/amount/, /ยอดเงิน/, /จำนวนเงิน/, /\bvalue\b/, /total/]);
  mapping.debit = guessColumn([/\bdebit\b/, /withdraw/, /ถอน/, /จ่าย/, /เดบิต/]);
  mapping.credit = guessColumn([/\bcredit\b/, /deposit/, /ฝาก/, /รับ/, /เครดิต/]);
  mapping.type = guessColumn([/transaction type/, /\btype\b/, /ประเภท/]);
  mapping.category = guessColumn([/category/, /หมวด/]);
  mapping.paymentMethod = guessColumn([/payment method/, /payment type/, /channel/, /ช่องทาง/, /method/]);
}

function chooseTable(id: string) {
  tableId.value = id;
  previewRows.value = [];
  guessColumns();
}

function onTableChange(event: Event) {
  chooseTable((event.target as HTMLSelectElement).value);
}

function localizeFileError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("too large")) return t("import.tooLarge");
  if (message.includes("no selectable text")) return t("import.scannedPdf");
  if (message.includes("more than 1,000 rows")) return t("import.tooManyRows");
  if (message.includes("no table rows") || message.includes("no transaction rows")) return t("import.noRows");
  if (message.includes("encoding")) return t("import.encodingError");
  return t("import.parseError");
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const selected = target.files?.[0];
  if (!selected) return;
  fileError.value = "";
  pageError.value = "";
  parsing.value = true;
  file.value = selected;
  try {
    tables.value = await parseImportFile(selected);
    tableId.value = tables.value[0]?.id ?? "";
    previewRows.value = [];
    step.value = 1;
    guessColumns();
  } catch (error) {
    fileError.value = localizeFileError(error);
    tables.value = [];
    tableId.value = "";
  } finally {
    parsing.value = false;
  }
}

function parseDate(value: string, format: DateFormat): string | null {
  const text = value.trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  let year = 0;
  let month = 0;
  let day = 0;
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else {
    const parts = text.split(/[/.\-\s]/).filter(Boolean).map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      const excelSerial = Number(text);
      if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
        const date = new Date(Date.UTC(1899, 11, 30) + excelSerial * 86_400_000);
        return date.toISOString().slice(0, 10);
      }
      return null;
    }
    const [first, second, third] = parts;
    let resolved = format;
    if (resolved === "auto") {
      if (first > 31) resolved = "ymd";
      else if (third > 31) resolved = "dmy";
      else if (first > 12) resolved = "dmy";
      else if (second > 12) resolved = "mdy";
      else resolved = "dmy";
    }
    if (resolved === "ymd") { year = first!; month = second!; day = third!; }
    else if (resolved === "mdy") { month = first!; day = second!; year = third!; }
    else { day = first!; month = second!; year = third!; }
  }
  if (year >= 2400) year -= 543;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  let text = value.trim().replace(/\s|฿|THB|บาท/gi, "");
  if (!text) return null;
  const parenthesesNegative = text.startsWith("(") && text.endsWith(")");
  text = text.replace(/[()]/g, "");
  const negative = parenthesesNegative || /[-−]/.test(text);
  text = text.replace(/[+\-−]/g, "").replace(/[^\d.,]/g, "");
  if (!text) return null;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let normalized = text;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    normalized = text.replace(grouping, "").replace(decimal, ".");
  } else if (comma >= 0) {
    const decimals = text.length - comma - 1;
    normalized = decimals > 0 && decimals <= 2
      ? `${text.slice(0, comma).replace(/,/g, "")}.${text.slice(comma + 1)}`
      : text.replace(/,/g, "");
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, sign: negative ? -1 : 1 };
}

function resolveType(value: string): TxType | null {
  const normalized = value.trim().toLocaleLowerCase();
  if (["income", "credit", "deposit", "รายรับ", "เงินเข้า", "รับ", "ฝาก"].includes(normalized)) return "income";
  if (["expense", "debit", "withdraw", "withdrawal", "รายจ่าย", "เงินออก", "จ่าย", "ถอน"].includes(normalized)) return "expense";
  return null;
}

function resolveCategory(value: string, type: TxType) {
  const options = type === "income" ? incomeCategories : expenseCategories;
  const normalized = value.trim().toLocaleLowerCase();
  const direct = options.find((category) => category === normalized);
  if (direct) return direct;
  const localized = options.find((category) => t(`cats.${category}` as never).toLocaleLowerCase() === normalized);
  if (localized) return localized;
  const aliases: Record<string, string> = {
    groceries: "food", restaurant: "food", dining: "food", travel: "transportation", rent: "housing",
    electricity: "utilities", medicine: "healthcare", medical: "healthcare", membership: "subscription",
    pay: "salary", wages: "salary", เงินเดือน: "salary", อาหาร: "food", เดินทาง: "transportation",
  };
  const alias = aliases[normalized];
  return options.includes(alias as never) ? alias! : "other";
}

function resolvePaymentMethod(value: string): ImportTransaction["paymentMethod"] {
  const normalized = value.trim().toLocaleLowerCase();
  if (["cash", "เงินสด"].includes(normalized)) return "cash";
  if (["card", "credit card", "บัตร"].includes(normalized)) return "card";
  if (["e_wallet", "ewallet", "wallet", "พร้อมเพย์", "วอลเล็ต"].includes(normalized)) return "e_wallet";
  if (["other", "อื่น ๆ"].includes(normalized)) return "other";
  return "bank";
}

function rowValue(row: string[], column: number) {
  return column >= 0 ? (row[column] ?? "").trim() : "";
}

function normalizeRow(row: string[], rowNumber: number): PreviewRow {
  const errors: string[] = [];
  const date = parseDate(rowValue(row, mapping.date), dateFormat.value);
  const title = rowValue(row, mapping.title);
  if (!date) errors.push(t("import.dateError"));
  if (!title) errors.push(t("import.titleError"));

  const debit = mapping.debit >= 0 ? parseAmount(rowValue(row, mapping.debit)) : null;
  const credit = mapping.credit >= 0 ? parseAmount(rowValue(row, mapping.credit)) : null;
  const amountValue = mapping.amount >= 0 ? parseAmount(rowValue(row, mapping.amount)) : null;
  let amount: number | null = null;
  let type: TxType | null = null;

  if (mapping.debit >= 0 || mapping.credit >= 0) {
    const debitAmount = debit?.amount ?? 0;
    const creditAmount = credit?.amount ?? 0;
    if (debitAmount > 0 && creditAmount > 0) errors.push(t("import.amountError"));
    else if (debitAmount > 0) { amount = debitAmount; type = "expense"; }
    else if (creditAmount > 0) { amount = creditAmount; type = "income"; }
  } else if (amountValue) {
    amount = amountValue.amount;
    type = mapping.type >= 0 ? resolveType(rowValue(row, mapping.type)) : null;
    if (!type) {
      if (mapping.type >= 0) errors.push(t("import.typeError"));
      else if (positiveType.value) type = amountValue.sign < 0 ? (positiveType.value === "income" ? "expense" : "income") : positiveType.value;
      else errors.push(t("import.typeError"));
    }
  } else {
    errors.push(t("import.amountError"));
  }

  if (!amount || amount <= 0) errors.push(t("import.amountError"));
  if (!type) errors.push(t("import.typeError"));
  if (errors.length || !date || !type || !amount) {
    return { rowNumber, raw: row, status: "invalid", errors: [...new Set(errors)], include: false, allowDuplicate: false };
  }

  const account = accountId.value || undefined;
  const transaction: ImportTransaction = {
    type,
    title,
    amount,
    category: resolveCategory(rowValue(row, mapping.category), type),
    date,
    paymentMethod: mapping.paymentMethod >= 0 ? resolvePaymentMethod(rowValue(row, mapping.paymentMethod)) : "bank",
    ...(account ? type === "expense" ? { sourceAccountId: account } : { destinationAccountId: account } : {}),
    clientRequestId: crypto.randomUUID(),
  };
  return { rowNumber, raw: row, status: "ready", transaction, errors: [], include: true, allowDuplicate: false };
}

function possibleDuplicateKey(row: PreviewRow) {
  const transaction = row.transaction;
  if (!transaction) return "";
  const account = transaction.sourceAccountId ?? transaction.destinationAccountId ?? "-";
  return [transaction.date, transaction.type, transaction.amount.toFixed(2), transaction.title.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(), account].join("|");
}

function statusLabel(status: RowState) {
  if (status === "ready") return t("import.ready");
  if (status === "duplicate") return t("import.duplicate");
  if (status === "invalid" || status === "failed") return t("import.invalid");
  if (status === "imported" || status === "already_imported") return t("import.imported");
  return t("import.skipped");
}

async function buildPreview() {
  pageError.value = "";
  previewRows.value = [];
  if (!mappingValid.value) {
    pageError.value = t("import.previewRequired");
    return;
  }
  checking.value = true;
  const rows = dataRows.value.map(({ rowNumber, raw }) => normalizeRow(raw, rowNumber));
  const firstSeen = new Map<string, number>();
  for (const row of rows) {
    if (!row.transaction) continue;
    const key = possibleDuplicateKey(row);
    const seenAt = firstSeen.get(key);
    if (seenAt !== undefined) {
      row.status = "duplicate";
      row.include = false;
      row.duplicate = { id: "", title: "", date: row.transaction.date, amount: row.transaction.amount, rowNumber: seenAt };
    } else {
      firstSeen.set(key, row.rowNumber);
    }
  }

  try {
    const candidates = rows.filter((row) => row.transaction);
    for (let offset = 0; offset < candidates.length; offset += 100) {
      const chunk = candidates.slice(offset, offset + 100);
      const response = await api.post("/transactions/import/preview", {
        items: chunk.map((row) => ({ rowNumber: row.rowNumber, transaction: row.transaction })),
      });
      const remote = response.data.data.items as Array<{ rowNumber: number; status: string; errors?: string[]; duplicate?: PossibleDuplicate }>;
      for (const result of remote) {
        const local = rows.find((row) => row.rowNumber === result.rowNumber);
        if (!local) continue;
        if (local.status === "duplicate" && !local.duplicate?.id) continue;
        if (result.status === "duplicate") {
          local.status = "duplicate";
          local.include = false;
          local.duplicate = result.duplicate;
        } else if (result.status === "invalid") {
          local.status = "invalid";
          local.include = false;
          local.errors = result.errors ?? [t("import.invalid")];
        }
      }
    }
    previewRows.value = rows;
    step.value = 2;
  } catch {
    previewRows.value = rows;
    pageError.value = t("import.previewError");
  } finally {
    checking.value = false;
  }
}

function setIncluded(row: PreviewRow) {
  if (row.status === "duplicate") row.allowDuplicate = row.include;
}

async function importSelected() {
  pageError.value = "";
  const selected = previewRows.value.filter((row) => row.include && row.transaction);
  if (!selected.length) {
    importSummary.value = {
      imported: 0,
      skipped: previewRows.value.filter((row) => row.status === "duplicate" || row.status === "ready").length,
      failed: previewRows.value.filter((row) => row.status === "invalid").length,
    };
    step.value = 3;
    return;
  }

  importing.value = true;
  const summary = {
    imported: 0,
    skipped: previewRows.value.filter((row) => !row.include && (row.status === "duplicate" || row.status === "ready")).length,
    failed: previewRows.value.filter((row) => row.status === "invalid").length,
  };
  try {
    for (let offset = 0; offset < selected.length; offset += 100) {
      const chunk = selected.slice(offset, offset + 100);
      const response = await api.post("/transactions/import", {
        items: chunk.map((row) => ({
          rowNumber: row.rowNumber,
          transaction: row.transaction,
          allowDuplicate: row.allowDuplicate,
        })),
      });
      const result = response.data.data as {
        created: number;
        skipped: number;
        failed: number;
        items: Array<{ rowNumber: number; status: RowState; errors?: string[]; duplicate?: PossibleDuplicate }>;
      };
      summary.imported += result.created;
      summary.skipped += result.skipped;
      summary.failed += result.failed;
      for (const imported of result.items) {
        const local = previewRows.value.find((row) => row.rowNumber === imported.rowNumber);
        if (!local) continue;
        local.status = imported.status;
        local.errors = imported.errors ?? [];
        if (imported.duplicate) local.duplicate = imported.duplicate;
        if (imported.status === "duplicate") local.include = false;
      }
    }
    importSummary.value = summary;
    step.value = 3;
  } catch {
    pageError.value = t("import.resultError");
  } finally {
    importing.value = false;
  }
}

function startOver() {
  step.value = 0;
  file.value = undefined;
  tables.value = [];
  tableId.value = "";
  previewRows.value = [];
  fileError.value = "";
  pageError.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

onMounted(async () => {
  loadingAccounts.value = true;
  try {
    const response = await api.get("/accounts");
    accounts.value = response.data.data;
    accountId.value = accounts.value.find((account) => account.accountType === "bank")?.id ?? "";
  } catch {
    pageError.value = t("import.loadError");
  } finally {
    loadingAccounts.value = false;
  }
});

watch(hasHeader, guessColumns);
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <PageHeader eyebrow="Personal finance / Activity" :title="t('import.title')" :subtitle="t('import.subtitle')" />

    <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" :aria-label="t('import.title')">
      <li v-for="(label, index) in stepLabels" :key="label" class="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold sm:text-sm" :class="step === index ? 'bg-primary text-on-primary' : step > index ? 'bg-primary-soft text-primary' : 'bg-surface text-muted'" :aria-current="step === index ? 'step' : undefined">
        <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-[11px]">{{ index + 1 }}</span>
        <span>{{ label }}</span>
      </li>
    </ol>

    <div v-if="pageError" class="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{{ pageError }}</div>

    <div v-if="step === 0" class="card space-y-5 p-5 sm:p-7">
      <div>
        <h2 class="text-lg font-semibold text-ink">{{ t("import.chooseFile") }}</h2>
        <p class="mt-2 text-sm leading-6 text-muted">{{ t("import.formats") }}</p>
        <p class="mt-1 text-xs text-muted-2">{{ t("import.fileHelp") }}</p>
      </div>
      <label for="transaction-import-file" class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-2 px-5 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40">
        <svg class="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
        </svg>
        <span class="mt-3 font-semibold text-ink">{{ file?.name ?? t("import.chooseFile") }}</span>
        <span class="mt-1 text-xs text-muted">{{ t("import.fileHelp") }}</span>
        <input id="transaction-import-file" ref="fileInput" class="sr-only" type="file" accept=".csv,.txt,.xlsx,.xlsm,.pdf,.docx" @change="onFileChange" />
      </label>
      <div v-if="parsing" class="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />{{ t("common.loading") }}
      </div>
      <p v-if="fileError" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{{ fileError }}</p>
    </div>

    <div v-else-if="step === 1" class="space-y-5">
      <div class="card grid gap-5 p-5 sm:p-7">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ file?.name }}</h2>
            <p class="mt-1 text-sm text-muted">{{ t("import.mappingHelp") }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="step = 0">{{ t("import.back") }}</button>
        </div>

        <label v-if="tables.length > 1" class="grid gap-1.5 sm:max-w-sm">
          <span class="label">{{ t("import.table") }}</span>
          <select class="field" :value="tableId" @change="onTableChange">
            <option v-for="item in tables" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>

        <label class="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input v-model="hasHeader" type="checkbox" class="h-5 w-5 accent-primary" />
          {{ t("import.firstRowHeader") }}
        </label>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label class="grid gap-1.5"><span class="label">{{ t("import.date") }} *</span>
            <select v-model.number="mapping.date" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.titleField") }} *</span>
            <select v-model.number="mapping.title" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.amount") }}</span>
            <select v-model.number="mapping.amount" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.debit") }}</span>
            <select v-model.number="mapping.debit" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.credit") }}</span>
            <select v-model.number="mapping.credit" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.type") }}</span>
            <select v-model.number="mapping.type" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.category") }}</span>
            <select v-model.number="mapping.category" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.paymentMethod") }}</span>
            <select v-model.number="mapping.paymentMethod" class="field"><option :value="-1">—</option><option v-for="column in columnOptions" :key="column.index" :value="column.index">{{ column.label }} · {{ column.sample }}</option></select>
          </label>
          <label class="grid gap-1.5"><span class="label">{{ t("import.dateFormat") }}</span>
            <select v-model="dateFormat" class="field"><option value="auto">{{ t("import.dateAuto") }}</option><option value="dmy">{{ t("import.dmy") }}</option><option value="mdy">{{ t("import.mdy") }}</option><option value="ymd">{{ t("import.ymd") }}</option></select>
          </label>
          <label v-if="mapping.type < 0 && mapping.debit < 0 && mapping.credit < 0" class="grid gap-1.5">
            <span class="label">{{ t("import.defaultType") }} *</span>
            <select v-model="positiveType" class="field"><option value="">{{ t("import.chooseType") }}</option><option value="income">{{ t("import.positiveIncome") }}</option><option value="expense">{{ t("import.positiveExpense") }}</option></select>
          </label>
          <label class="grid gap-1.5">
            <span class="label">{{ t("import.account") }}</span>
            <select v-model="accountId" class="field" :disabled="loadingAccounts"><option value="">{{ t("import.noAccount") }}</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option></select>
          </label>
        </div>

        <p v-if="!accounts.length && !loadingAccounts" class="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-dark">{{ t("import.noAccounts") }}</p>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p class="text-sm text-muted">{{ t("import.rows") }}: {{ dataRows.length.toLocaleString(locale) }}</p>
          <button type="button" class="btn-primary" :disabled="!mappingValid || checking || loadingAccounts" @click="buildPreview">
            {{ checking ? t("import.buildingPreview") : t("import.buildPreview") }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="step === 2" class="space-y-5">
      <div class="card overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ t("import.stepReview") }}</h2>
            <p class="mt-1 text-sm text-muted">{{ t("import.showAll", { count: previewRows.length.toLocaleString(locale) }) }}</p>
          </div>
          <button type="button" class="btn-ghost" @click="step = 1">{{ t("import.back") }}</button>
        </div>
        <div class="grid gap-3 border-b border-line bg-surface-2 px-5 py-4 text-sm sm:grid-cols-3">
          <p><strong class="text-ink">{{ t("import.ready") }}:</strong> {{ previewRows.filter((row) => row.status === 'ready').length }}</p>
          <p><strong class="text-warning-dark">{{ t("import.duplicate") }}:</strong> {{ previewRows.filter((row) => row.status === 'duplicate').length }}</p>
          <p><strong class="text-danger">{{ t("import.invalid") }}:</strong> {{ previewRows.filter((row) => row.status === 'invalid').length }}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead class="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr><th class="px-4 py-3">#</th><th class="px-4 py-3">{{ t("import.date") }}</th><th class="px-4 py-3">{{ t("import.titleField") }}</th><th class="px-4 py-3">{{ t("import.type") }}</th><th class="px-4 py-3">{{ t("import.amount") }}</th><th class="px-4 py-3">{{ t("import.category") }}</th><th class="px-4 py-3">{{ t("import.invalid") }}</th><th class="px-4 py-3">{{ t("import.include") }}</th></tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="row in previewRows" :key="row.rowNumber" class="align-top" :class="row.include ? 'bg-primary-soft/20' : ''">
                <td class="px-4 py-3 tabular-nums text-muted">{{ row.rowNumber }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ row.transaction ? formatDate(row.transaction.date, locale) : row.raw[mapping.date] }}</td>
                <td class="max-w-64 px-4 py-3"><span class="block truncate font-medium text-ink">{{ row.transaction?.title || row.raw[mapping.title] || "—" }}</span>
                  <span v-if="row.status === 'duplicate'" class="mt-1 block text-xs text-warning-dark">{{ row.duplicate?.rowNumber ? t("import.duplicateInFile", { row: row.duplicate.rowNumber }) : t("import.duplicateMatch", { title: row.duplicate?.title ?? "", date: row.duplicate?.date ?? "", amount: formatTHB(row.duplicate?.amount ?? 0, locale) }) }}</span>
                  <span v-else-if="row.errors.length" class="mt-1 block text-xs text-danger">{{ row.errors.join(" · ") }}</span>
                </td>
                <td class="px-4 py-3">{{ row.transaction ? t(`tx.${row.transaction.type}` as never) : "—" }}</td>
                <td class="px-4 py-3 whitespace-nowrap tabular-nums">{{ row.transaction ? formatTHB(row.transaction.amount, locale) : "—" }}</td>
                <td class="px-4 py-3">
                  <select v-if="row.transaction" v-model="row.transaction.category" class="field min-h-10 py-1 text-xs" :aria-label="`${t('import.category')} · ${row.rowNumber}`">
                    <option v-for="category in row.transaction.type === 'income' ? incomeCategories : expenseCategories" :key="category" :value="category">{{ t(`cats.${category}` as never) }}</option>
                  </select><span v-else>—</span>
                </td>
                <td class="px-4 py-3"><span class="chip" :class="row.status === 'duplicate' ? 'bg-warning-soft text-warning-dark' : row.status === 'invalid' || row.status === 'failed' ? 'bg-danger-soft text-danger' : row.status === 'imported' || row.status === 'already_imported' ? 'bg-success-soft text-success' : 'bg-surface-2 text-muted'">{{ statusLabel(row.status) }}</span></td>
                <td class="px-4 py-3">
                  <label v-if="row.status === 'ready' || row.status === 'duplicate'" class="flex min-h-11 items-center gap-2">
                    <input v-model="row.include" type="checkbox" class="h-5 w-5 accent-primary" @change="setIncluded(row)" />
                    <span class="sr-only">{{ row.status === "duplicate" ? t("import.importAnyway") : t("import.include") }}</span>
                  </label>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-muted">{{ t("import.fileHelp") }}</p>
          <button type="button" class="btn-primary" :disabled="importing" @click="importSelected">
            {{ importing ? t("import.importing") : selectedCount ? `${t('import.importSelected')} · ${selectedCount}` : t('import.complete') }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card space-y-5 p-5 sm:p-7">
      <div class="flex items-start gap-3">
        <span class="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success" aria-hidden="true">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        </span>
        <div><h2 class="text-xl font-semibold text-ink">{{ t("import.complete") }}</h2><p class="mt-1 text-sm text-muted">{{ file?.name }}</p></div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-success-soft p-4"><p class="text-xs text-success">{{ t("import.ready") }}</p><p class="mt-1 text-xl font-bold text-ink">{{ importSummary.imported }}</p></div>
        <div class="rounded-xl bg-warning-soft p-4"><p class="text-xs text-warning-dark">{{ t("import.duplicate") }}</p><p class="mt-1 text-xl font-bold text-ink">{{ importSummary.skipped }}</p></div>
        <div class="rounded-xl bg-danger-soft p-4"><p class="text-xs text-danger">{{ t("import.invalid") }}</p><p class="mt-1 text-xl font-bold text-ink">{{ importSummary.failed }}</p></div>
      </div>
      <p v-if="importSummary.failed" class="text-sm text-muted">{{ t("import.errorsBody") }}</p>
      <div v-if="previewRows.some((row) => row.status === 'failed' || row.status === 'invalid')" class="max-h-80 overflow-auto rounded-xl border border-line">
        <ul class="divide-y divide-line">
          <li v-for="row in previewRows.filter((item) => item.status === 'failed' || item.status === 'invalid')" :key="row.rowNumber" class="p-3 text-sm">
            <p class="font-semibold text-ink">{{ t("import.rowLabel", { row: row.rowNumber }) }} · {{ row.transaction?.title || row.raw[mapping.title] }}</p>
            <p class="mt-1 text-danger">{{ row.errors.join(" · ") }}</p>
          </li>
        </ul>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary" @click="startOver">{{ t("import.startOver") }}</button>
        <RouterLink to="/transactions" class="btn-ghost">{{ t("nav.transactions") }}</RouterLink>
      </div>
    </div>
  </section>
</template>
