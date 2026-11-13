import { openDB, type IDBPDatabase } from "idb";

export interface LocalTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  title: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  description?: string;
  status?: string;
  pending?: boolean;
  updatedAt: string;
}

export interface QueueItem {
  clientRequestId: string;
  method: "create" | "update" | "delete";
  entity: "transaction";
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface OfflineSnapshot {
  user: { id: string; name: string; email: string; preferredLanguage?: "th" | "en"; preferredTheme?: "system" | "light" | "dark"; currency?: "THB"; timezone?: string };
  syncedAt: string;
  summary: Record<string, unknown>;
  transactions: LocalTransaction[];
  accounts: Array<Record<string, unknown>>;
  budgets: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
}

interface OfflinePayload {
  snapshot: OfflineSnapshot;
  queue: QueueItem[];
  localTransactions: LocalTransaction[];
}

interface VaultRecord {
  id: "snapshot";
  version: 1;
  userId: string;
  salt: string;
  iterations: number;
  iv: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
}

const VAULT_KEY = "snapshot";
const KDF_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let dbPromise: Promise<IDBPDatabase> | null = null;
let activeKey: CryptoKey | null = null;
let activePayload: OfflinePayload | null = null;
let activeRecord: VaultRecord | null = null;

export function db() {
  if (!dbPromise) {
    dbPromise = openDB("pfa-offline", 2, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("transactions")) database.createObjectStore("transactions", { keyPath: "id" });
        if (!database.objectStoreNames.contains("queue")) database.createObjectStore("queue", { keyPath: "clientRequestId" });
        if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta");
        if (!database.objectStoreNames.contains("vault")) database.createObjectStore("vault", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = KDF_ITERATIONS) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function writeEncryptedPayload(key: CryptoKey, payload: OfflinePayload, existing?: VaultRecord) {
  const database = await db();
  const metadata = activeRecord ?? existing;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  const record: VaultRecord = {
    id: VAULT_KEY,
    version: 1,
    userId: payload.snapshot.user.id,
    salt: metadata?.salt ?? "",
    iterations: metadata?.iterations ?? KDF_ITERATIONS,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: metadata?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await database.put("vault", record);
  activeKey = key;
  activePayload = payload;
  activeRecord = record;
}

export async function readOfflineVaultMetadata() {
  const database = await db();
  const record = await database.get("vault", VAULT_KEY) as VaultRecord | undefined;
  return record ? { userId: record.userId, createdAt: record.createdAt, updatedAt: record.updatedAt } : null;
}

export async function hasOfflineVault() {
  return Boolean(await readOfflineVaultMetadata());
}

export async function createOfflineVault(passphrase: string, snapshot: OfflineSnapshot) {
  const database = await db();
  const [legacyQueue, legacyTransactions] = await Promise.all([
    database.getAll("queue") as Promise<QueueItem[]>,
    database.getAll("transactions") as Promise<LocalTransaction[]>,
  ]);
  const mergedTransactions = new Map(snapshot.transactions.map((item) => [item.id, item]));
  for (const item of legacyTransactions) if (item.pending) mergedTransactions.set(item.id, item);
  const preparedSnapshot = { ...snapshot, transactions: [...mergedTransactions.values()].slice(0, 50) };
  const payload: OfflinePayload = { snapshot: preparedSnapshot, queue: legacyQueue, localTransactions: legacyTransactions };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const temporaryRecord: VaultRecord = {
    id: VAULT_KEY, version: 1, userId: snapshot.user.id, salt: bytesToBase64(salt),
    iterations: KDF_ITERATIONS, iv: "", ciphertext: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await writeEncryptedPayload(key, payload, temporaryRecord);
  // Remove the former unencrypted cache only after the encrypted copy is safely stored.
  await Promise.all([database.clear("transactions"), database.clear("queue"), database.clear("meta")]);
  return preparedSnapshot;
}

export async function unlockOfflineVault(passphrase: string) {
  const database = await db();
  const record = await database.get("vault", VAULT_KEY) as VaultRecord | undefined;
  if (!record) throw new Error("offline-vault-missing");
  try {
    const key = await deriveKey(passphrase, base64ToBytes(record.salt), record.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(record.iv) },
      key,
      base64ToBytes(record.ciphertext),
    );
    const payload = JSON.parse(decoder.decode(plaintext)) as OfflinePayload;
    if (payload.snapshot.user.id !== record.userId) throw new Error("offline-vault-user-mismatch");
    activeKey = key;
    activePayload = payload;
    activeRecord = record;
    return payload.snapshot;
  } catch {
    activeKey = null;
    activePayload = null;
    activeRecord = null;
    throw new Error("offline-vault-invalid-passphrase");
  }
}

export async function getUnlockedOfflineSnapshot() {
  return activePayload?.snapshot ?? null;
}

export function lockOfflineVault() {
  activeKey = null;
  activePayload = null;
  activeRecord = null;
}

export async function updateOfflineSnapshot(snapshot: OfflineSnapshot) {
  if (!activeKey || !activePayload) throw new Error("offline-vault-locked");
  const updated = { ...activePayload, snapshot };
  await writeEncryptedPayload(activeKey, updated);
}

export async function getQueue() {
  if (activePayload) return [...activePayload.queue];
  const database = await db();
  return database.getAll("queue") as Promise<QueueItem[]>;
}

export async function enqueue(item: QueueItem) {
  if (activePayload && activeKey) {
    activePayload.queue = [...activePayload.queue.filter((queued) => queued.clientRequestId !== item.clientRequestId), item];
    await writeEncryptedPayload(activeKey, activePayload);
    return;
  }
  throw new Error("offline-vault-unlocked-required");
}

export async function putTransaction(item: LocalTransaction) {
  if (!activePayload || !activeKey) throw new Error("offline-vault-unlocked-required");
  activePayload.localTransactions = [...activePayload.localTransactions.filter((transaction) => transaction.id !== item.id), item];
  const transactions = new Map(activePayload.snapshot.transactions.map((transaction) => [transaction.id, transaction]));
  transactions.set(item.id, item);
  activePayload.snapshot.transactions = [...transactions.values()].slice(0, 50);
  await writeEncryptedPayload(activeKey, activePayload);
}

export async function removeQueue(id: string) {
  if (activePayload && activeKey) {
    const completed = activePayload.queue.find((item) => item.clientRequestId === id);
    activePayload.queue = activePayload.queue.filter((item) => item.clientRequestId !== id);
    const transactionId = completed?.payload.id === undefined ? "" : String(completed.payload.id);
    if (transactionId) {
      activePayload.localTransactions = activePayload.localTransactions.filter((item) => item.id !== transactionId);
      if (completed?.method === "delete") {
        activePayload.snapshot.transactions = activePayload.snapshot.transactions.filter((item) => item.id !== transactionId);
      } else {
        activePayload.snapshot.transactions = activePayload.snapshot.transactions.map((item) =>
          item.id === transactionId ? { ...item, pending: false } : item,
        );
      }
    }
    await writeEncryptedPayload(activeKey, activePayload);
    return;
  }
  const database = await db();
  await database.delete("queue", id);
}

// Transaction caches are written only inside the encrypted vault when it is unlocked.
export async function cacheTransactions(items: LocalTransaction[]) {
  if (!activePayload || !activeKey) return;
  const updated = { ...activePayload.snapshot, transactions: items.slice(0, 50), syncedAt: new Date().toISOString() };
  await updateOfflineSnapshot(updated);
}

export async function getAllTransactions() {
  return activePayload?.snapshot.transactions ?? [];
}

export async function clearUserData() {
  activeKey = null;
  activePayload = null;
  activeRecord = null;
  const database = await db();
  await Promise.all([
    database.clear("transactions"), database.clear("queue"), database.clear("meta"), database.clear("vault"),
  ]);
}
