import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Account, Holding } from '../types';

interface AssetDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
    indexes: { 'by-order': number };
  };
  holdings: {
    key: string;
    value: Holding;
    indexes: { 'by-account': string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AssetDB>('asset-dashboard', 1, {
      upgrade(db) {
        const accounts = db.createObjectStore('accounts', { keyPath: 'account_id' });
        accounts.createIndex('by-order', 'display_order');
        const holdings = db.createObjectStore('holdings', { keyPath: 'holding_id' });
        holdings.createIndex('by-account', 'account_id');
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

export async function loadAccounts(): Promise<Account[]> {
  const db = await getDB();
  const accounts = await db.getAll('accounts');
  return accounts.sort((a, b) => a.display_order - b.display_order);
}

export async function saveAccount(account: Account): Promise<void> {
  const db = await getDB();
  await db.put('accounts', account);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const db = await getDB();
  await db.delete('accounts', accountId);
  const holdings = await db.getAllFromIndex('holdings', 'by-account', accountId);
  for (const h of holdings) {
    await db.delete('holdings', h.holding_id);
  }
}

export async function loadHoldings(): Promise<Holding[]> {
  const db = await getDB();
  return db.getAll('holdings');
}

export async function saveHolding(holding: Holding): Promise<void> {
  const db = await getDB();
  await db.put('holdings', holding);
}

export async function deleteHolding(holdingId: string): Promise<void> {
  const db = await getDB();
  await db.delete('holdings', holdingId);
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const entry = await db.get('meta', key);
  return (entry?.value as T) ?? null;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

export async function replaceAllData(
  accounts: Account[],
  holdings: Holding[],
  recentSearches: unknown,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['accounts', 'holdings', 'meta'], 'readwrite');

  await tx.objectStore('accounts').clear();
  await tx.objectStore('holdings').clear();

  for (const account of accounts) {
    await tx.objectStore('accounts').put(account);
  }
  for (const holding of holdings) {
    await tx.objectStore('holdings').put(holding);
  }
  if (recentSearches) {
    await tx.objectStore('meta').put({ key: 'recentSearches', value: recentSearches });
  }

  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['accounts', 'holdings', 'meta'], 'readwrite');
  await tx.objectStore('accounts').clear();
  await tx.objectStore('holdings').clear();
  await tx.objectStore('meta').clear();
  await tx.done;
}