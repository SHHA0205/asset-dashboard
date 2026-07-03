import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Account, Holding, OtherAsset } from '../types';

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
  other_assets: {
    key: string;
    value: OtherAsset;
    indexes: { 'by-order': number };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AssetDB>('asset-dashboard', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const accounts = db.createObjectStore('accounts', { keyPath: 'account_id' });
          accounts.createIndex('by-order', 'display_order');
          const holdings = db.createObjectStore('holdings', { keyPath: 'holding_id' });
          holdings.createIndex('by-account', 'account_id');
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('other_assets')) {
          const other = db.createObjectStore('other_assets', { keyPath: 'other_asset_id' });
          other.createIndex('by-order', 'display_order');
        }
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

export async function loadOtherAssets(): Promise<OtherAsset[]> {
  const db = await getDB();
  const items = await db.getAll('other_assets');
  return items.sort((a, b) => a.display_order - b.display_order);
}

export async function saveOtherAsset(asset: OtherAsset): Promise<void> {
  const db = await getDB();
  await db.put('other_assets', asset);
}

export async function deleteOtherAsset(assetId: string): Promise<void> {
  const db = await getDB();
  await db.delete('other_assets', assetId);
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
  otherAssets: OtherAsset[] = [],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['accounts', 'holdings', 'other_assets', 'meta'], 'readwrite');

  await tx.objectStore('accounts').clear();
  await tx.objectStore('holdings').clear();
  await tx.objectStore('other_assets').clear();

  for (const account of accounts) {
    await tx.objectStore('accounts').put(account);
  }
  for (const holding of holdings) {
    await tx.objectStore('holdings').put(holding);
  }
  for (const asset of otherAssets) {
    await tx.objectStore('other_assets').put(asset);
  }
  if (recentSearches) {
    await tx.objectStore('meta').put({ key: 'recentSearches', value: recentSearches });
  }

  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['accounts', 'holdings', 'other_assets', 'meta'], 'readwrite');
  await tx.objectStore('accounts').clear();
  await tx.objectStore('holdings').clear();
  await tx.objectStore('other_assets').clear();
  await tx.objectStore('meta').clear();
  await tx.done;
}