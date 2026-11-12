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

let dbPromise: Promise<IDBPDatabase> | null = null;

export function db() {
  if (!dbPromise) {
    dbPromise = openDB("pfa-offline", 1, {
      upgrade(database) {
        database.createObjectStore("transactions", { keyPath: "id" });
        database.createObjectStore("queue", { keyPath: "clientRequestId" });
        database.createObjectStore("meta");
      },
    });
  }
  return dbPromise;
}

export async function cacheTransactions(items: LocalTransaction[]) {
  const database = await db();
  const tx = database.transaction("transactions", "readwrite");
  await tx.store.clear();
  for (const item of items) await tx.store.put(item);
  await tx.done;
}

export async function putTransaction(item: LocalTransaction) {
  const database = await db();
  await database.put("transactions", item);
}

export async function getAllTransactions() {
  const database = await db();
  return database.getAll("transactions") as Promise<LocalTransaction[]>;
}

export async function enqueue(item: QueueItem) {
  const database = await db();
  await database.put("queue", item);
}

export async function getQueue() {
  const database = await db();
  return database.getAll("queue") as Promise<QueueItem[]>;
}

export async function removeQueue(id: string) {
  const database = await db();
  await database.delete("queue", id);
}

export async function clearUserData() {
  const database = await db();
  await database.clear("transactions");
  await database.clear("queue");
  await database.clear("meta");
}
