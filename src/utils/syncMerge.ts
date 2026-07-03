import type { Account, Holding, OtherAsset, SearchResult } from '../types';

export interface LocalPortfolioSnapshot {
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  recentSearches: SearchResult[];
  localUpdatedAt: string | null;
}

export interface RemotePortfolioSnapshot {
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  recentSearches: SearchResult[];
  updatedAt: string | null;
}

export interface MergedPortfolio {
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  recentSearches: SearchResult[];
  shouldPushLocal: boolean;
}

function hasData(accounts: Account[], holdings: Holding[], otherAssets: OtherAsset[]): boolean {
  return accounts.length > 0 || holdings.length > 0 || otherAssets.length > 0;
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function mergePortfolios(
  local: LocalPortfolioSnapshot,
  remote: RemotePortfolioSnapshot,
): MergedPortfolio {
  const remoteHasData = hasData(remote.accounts, remote.holdings, remote.otherAssets);
  const localHasData = hasData(local.accounts, local.holdings, local.otherAssets);

  if (remoteHasData && !localHasData) {
    return {
      accounts: remote.accounts,
      holdings: remote.holdings,
      otherAssets: remote.otherAssets,
      recentSearches: remote.recentSearches,
      shouldPushLocal: false,
    };
  }

  if (!remoteHasData && localHasData) {
    return {
      accounts: local.accounts,
      holdings: local.holdings,
      otherAssets: local.otherAssets,
      recentSearches: local.recentSearches,
      shouldPushLocal: true,
    };
  }

  if (remoteHasData && localHasData) {
    const remoteTime = parseTime(remote.updatedAt);
    const localTime = parseTime(local.localUpdatedAt);

    if (localTime > remoteTime) {
      return {
        accounts: local.accounts,
        holdings: local.holdings,
        otherAssets: local.otherAssets.length > 0 ? local.otherAssets : remote.otherAssets,
        recentSearches: local.recentSearches.length > 0 ? local.recentSearches : remote.recentSearches,
        shouldPushLocal: true,
      };
    }

    return {
      accounts: remote.accounts,
      holdings: remote.holdings,
      otherAssets: remote.otherAssets.length > 0 ? remote.otherAssets : local.otherAssets,
      recentSearches: remote.recentSearches.length > 0 ? remote.recentSearches : local.recentSearches,
      shouldPushLocal: false,
    };
  }

  return {
    accounts: [],
    holdings: [],
    otherAssets: [],
    recentSearches: [],
    shouldPushLocal: false,
  };
}