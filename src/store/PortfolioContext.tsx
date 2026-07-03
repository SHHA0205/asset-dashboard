import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Account,
  ComputedAccount,
  Currency,
  Holding,
  OtherAsset,
  PriceSnapshot,
  Region,
  SearchResult,
  SortKey,
  ViewFilter,
} from '../types';
import {
  deleteAccount as dbDeleteAccount,
  deleteHolding as dbDeleteHolding,
  deleteOtherAsset as dbDeleteOtherAsset,
  getMeta,
  loadAccounts,
  loadHoldings,
  loadOtherAssets,
  replaceAllData,
  saveAccount,
  saveHolding,
  saveOtherAsset,
  setMeta,
} from './db';
import { computeAccount, computePortfolioSummary, toYahooSymbol, weightedAverageBuyPrice } from '../utils/calculations';
import { fetchExchangeRate, fetchQuotes } from '../api/client';
import { fetchRemotePortfolio, pushRemotePortfolio } from '../api/auth';
import { useAuth } from './AuthContext';

interface PortfolioContextValue {
  accounts: Account[];
  holdings: Holding[];
  otherAssets: OtherAsset[];
  computedAccounts: ComputedAccount[];
  priceMap: Map<string, PriceSnapshot>;
  usdKrwRate: number;
  lastPriceUpdate: string | null;
  lastRateUpdate: string | null;
  priceError: string | null;
  rateError: string | null;
  apiStatus: 'loading' | 'connected' | 'error';
  isRefreshing: boolean;
  viewFilter: ViewFilter;
  sortKey: SortKey;
  recentSearches: SearchResult[];
  selectedAccountId: string | null;
  summary: ReturnType<typeof computePortfolioSummary>;
  setViewFilter: (f: ViewFilter) => void;
  setSortKey: (k: SortKey) => void;
  setSelectedAccountId: (id: string | null) => void;
  refreshPrices: () => Promise<void>;
  addAccount: (name: string, region: Region) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  addHolding: (
    accountId: string,
    stock: SearchResult,
    quantity: number,
    avgBuyPrice: number,
  ) => Promise<void>;
  removeHolding: (holdingId: string) => Promise<void>;
  updateHolding: (
    holdingId: string,
    fields: { quantity?: number; avg_buy_price?: number },
  ) => Promise<void>;
  addOtherAsset: (name: string, amount: number, currency: Currency, note: string) => Promise<void>;
  updateOtherAsset: (
    assetId: string,
    fields: { name?: string; amount?: number; currency?: Currency; note?: string },
  ) => Promise<void>;
  removeOtherAsset: (assetId: string) => Promise<void>;
  addRecentSearch: (result: SearchResult) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const DEFAULT_ACCOUNTS: Omit<Account, 'account_id'>[] = [
  { account_name: '1번 계좌 (키움)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 0 },
  { account_name: '2번 계좌 (키움)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 1 },
  { account_name: '3번 계좌 (삼성)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 2 },
  { account_name: '4번 계좌 (미래)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 3 },
  { account_name: '5번 계좌 (한투)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 4 },
  { account_name: '6번 계좌 (NH)', region: 'KRX', base_currency: 'KRW', cash_balance: 0, display_order: 5 },
  { account_name: '7번 계좌 (미래에셋)', region: 'US', base_currency: 'USD', cash_balance: 0, display_order: 6 },
  { account_name: '8번 계좌 (키움)', region: 'US', base_currency: 'USD', cash_balance: 0, display_order: 7 },
  { account_name: '9번 계좌 (한투)', region: 'US', base_currency: 'USD', cash_balance: 0, display_order: 8 },
  { account_name: '10번 계좌 (토스)', region: 'US', base_currency: 'USD', cash_balance: 0, display_order: 9 },
];

const DEMO_HOLDINGS: Omit<Holding, 'holding_id' | 'account_id'>[] = [
  { ticker: '005930', symbol: '005930.KS', name: '삼성전자', market: 'KOSPI', quantity: 10, avg_buy_price: 60000 },
  { ticker: '000660', symbol: '000660.KS', name: 'SK하이닉스', market: 'KOSPI', quantity: 5, avg_buy_price: 200000 },
  { ticker: '005380', symbol: '005380.KS', name: '현대차', market: 'KOSPI', quantity: 3, avg_buy_price: 200000 },
];

async function seedInitialData() {
  const existing = await loadAccounts();
  if (existing.length > 0) return;

  const accounts: Account[] = [];
  for (const a of DEFAULT_ACCOUNTS) {
    const account: Account = { ...a, account_id: uuidv4() };
    await saveAccount(account);
    accounts.push(account);
  }

  const firstAccount = accounts[0];
  for (const h of DEMO_HOLDINGS) {
    await saveHolding({ ...h, holding_id: uuidv4(), account_id: firstAccount.account_id });
  }

  const usAccount = accounts.find((a) => a.region === 'US');
  if (usAccount) {
    await saveHolding({
      holding_id: uuidv4(),
      account_id: usAccount.account_id,
      ticker: 'AAPL',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'NASDAQ',
      quantity: 10,
      avg_buy_price: 150,
    });
    await saveHolding({
      holding_id: uuidv4(),
      account_id: usAccount.account_id,
      ticker: 'MSFT',
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      market: 'NASDAQ',
      quantity: 5,
      avg_buy_price: 350,
    });
  }
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [otherAssets, setOtherAssets] = useState<OtherAsset[]>([]);
  const [priceMap, setPriceMap] = useState<Map<string, PriceSnapshot>>(new Map());
  const [usdKrwRate, setUsdKrwRate] = useState(0);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null);
  const [lastRateUpdate, setLastRateUpdate] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('display_order');
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [accs, holds, others, recent] = await Promise.all([
      loadAccounts(),
      loadHoldings(),
      loadOtherAssets(),
      getMeta<SearchResult[]>('recentSearches'),
    ]);
    setAccounts(accs);
    setHoldings(holds);
    setOtherAssets(others);
    if (recent) setRecentSearches(recent);
  }, []);

  const pushToCloud = useCallback(async () => {
    if (!isAuthenticated) return;
    setSyncStatus('syncing');
    try {
      const [accs, holds, others, recent] = await Promise.all([
        loadAccounts(),
        loadHoldings(),
        loadOtherAssets(),
        getMeta<SearchResult[]>('recentSearches'),
      ]);
      await pushRemotePortfolio({
        accounts: accs,
        holdings: holds,
        otherAssets: others,
        recentSearches: recent || [],
      });
      setSyncStatus('synced');
    } catch (err) {
      console.error('Cloud sync failed:', err);
      setSyncStatus('error');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    (async () => {
      try {
        if (isAuthenticated) {
          const [localOthers, remote] = await Promise.all([
            loadOtherAssets(),
            fetchRemotePortfolio(),
          ]);
          const remoteOthers = remote.otherAssets ?? [];
          const mergedOthers = remoteOthers.length > 0 ? remoteOthers : localOthers;
          await replaceAllData(
            remote.accounts || [],
            remote.holdings || [],
            remote.recentSearches || [],
            mergedOthers,
          );
          await reload();
          if (remoteOthers.length === 0 && localOthers.length > 0) {
            await pushToCloud();
          }
        } else {
          await seedInitialData();
          await reload();
        }
      } catch (err) {
        console.error('Init failed:', err);
        await seedInitialData();
        await reload();
      }
      setLoaded(true);
    })();
  }, [isAuthenticated, reload, pushToCloud]);

  useEffect(() => {
    if (!loaded || !isAuthenticated) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      pushToCloud();
    }, 2000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [accounts, holdings, otherAssets, recentSearches, loaded, isAuthenticated, pushToCloud]);

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const symbols = [...new Set(holdings.map((h) => h.symbol))];

      let quoteResult = { quotes: [] as PriceSnapshot[], error: null as string | null };
      let rateResult = { rate: 0, fetchedAt: '', error: null as string | null };

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          [quoteResult, rateResult] = await Promise.all([
            symbols.length > 0 ? fetchQuotes(symbols) : Promise.resolve({ quotes: [], error: null }),
            fetchExchangeRate(),
          ]);
          break;
        } catch {
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (quoteResult.quotes.length > 0) {
        setPriceMap((prev) => {
          const newMap = new Map(prev);
          for (const q of quoteResult.quotes) {
            newMap.set(q.symbol, q);
          }
          return newMap;
        });
        const latest = quoteResult.quotes.reduce((a, b) =>
          a.fetched_at > b.fetched_at ? a : b,
        );
        setLastPriceUpdate(latest.fetched_at);
      }
      setPriceError(quoteResult.error);

      if (rateResult.rate && rateResult.rate > 0) {
        setUsdKrwRate(rateResult.rate);
        setLastRateUpdate(rateResult.fetchedAt);
      }
      setRateError(rateResult.error);

      const hasLiveQuotes = quoteResult.quotes.some((q) => q.current_price > 0);
      const hasLiveRate = (rateResult.rate ?? 0) > 0;

      if (hasLiveQuotes || hasLiveRate) {
        setApiStatus('connected');
        setPriceError(quoteResult.error);
      } else {
        setApiStatus('error');
        setPriceError('시세/환율 조회 실패 — start.bat 을 다시 실행해 보세요.');
      }
    } catch (err) {
      setApiStatus('error');
      setPriceError('API 서버 연결 실패 — start.bat 을 실행한 뒤 http://localhost:3001 로 접속하세요.');
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [holdings]);

  useEffect(() => {
    if (!loaded) return;
    refreshPrices();
    const interval = setInterval(refreshPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return;
    refreshPrices();
  }, [holdings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const computedAccounts = useMemo(() => {
    let computed = accounts.map((a) => computeAccount(a, holdings, priceMap, usdKrwRate));

    if (viewFilter !== 'all') {
      computed = computed.filter((c) => c.account.region === viewFilter);
    }

    switch (sortKey) {
      case 'total_value':
        computed = [...computed].sort((a, b) => b.totalValueKRW - a.totalValueKRW);
        break;
      case 'return_rate':
        computed = [...computed].sort((a, b) => b.returnRate - a.returnRate);
        break;
      default:
        computed = [...computed].sort((a, b) => a.account.display_order - b.account.display_order);
    }

    return computed;
  }, [accounts, holdings, priceMap, usdKrwRate, viewFilter, sortKey]);

  const summary = useMemo(
    () =>
      computePortfolioSummary(
        accounts.map((a) => computeAccount(a, holdings, priceMap, usdKrwRate)),
        otherAssets,
        usdKrwRate,
      ),
    [accounts, holdings, otherAssets, priceMap, usdKrwRate],
  );

  const addAccount = useCallback(
    async (name: string, region: Region) => {
      const maxOrder = accounts.reduce((m, a) => Math.max(m, a.display_order), -1);
      const account: Account = {
        account_id: uuidv4(),
        account_name: name,
        region,
        base_currency: region === 'KRX' ? 'KRW' : 'USD',
        cash_balance: 0,
        display_order: maxOrder + 1,
      };
      await saveAccount(account);
      await reload();
    },
    [accounts, reload],
  );

  const updateAccount = useCallback(
    async (account: Account) => {
      await saveAccount(account);
      await reload();
    },
    [reload],
  );

  const removeAccount = useCallback(
    async (accountId: string) => {
      await dbDeleteAccount(accountId);
      if (selectedAccountId === accountId) setSelectedAccountId(null);
      await reload();
    },
    [reload, selectedAccountId],
  );

  const addHolding = useCallback(
    async (accountId: string, stock: SearchResult, quantity: number, avgBuyPrice: number) => {
      const symbol = stock.symbol || toYahooSymbol(stock.ticker, stock.market);
      const existing = holdings.find(
        (h) => h.account_id === accountId && h.symbol === symbol,
      );

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newPrice = weightedAverageBuyPrice(
          existing.quantity,
          existing.avg_buy_price,
          quantity,
          avgBuyPrice,
        );
        await saveHolding({
          ...existing,
          quantity: newQty,
          avg_buy_price: newPrice,
        });
      } else {
        await saveHolding({
          holding_id: uuidv4(),
          account_id: accountId,
          ticker: stock.ticker,
          symbol,
          name: stock.name,
          market: stock.market,
          quantity,
          avg_buy_price: avgBuyPrice,
        });
      }
      await reload();
    },
    [holdings, reload],
  );

  const removeHolding = useCallback(
    async (holdingId: string) => {
      await dbDeleteHolding(holdingId);
      await reload();
    },
    [reload],
  );

  const updateHolding = useCallback(
    async (holdingId: string, fields: { quantity?: number; avg_buy_price?: number }) => {
      const holding = holdings.find((h) => h.holding_id === holdingId);
      if (!holding) return;
      await saveHolding({
        ...holding,
        quantity: fields.quantity ?? holding.quantity,
        avg_buy_price: fields.avg_buy_price ?? holding.avg_buy_price,
      });
      await reload();
    },
    [holdings, reload],
  );

  const addOtherAsset = useCallback(
    async (name: string, amount: number, currency: Currency, note: string) => {
      const maxOrder = otherAssets.reduce((m, a) => Math.max(m, a.display_order), -1);
      const asset: OtherAsset = {
        other_asset_id: uuidv4(),
        name,
        amount,
        currency,
        note,
        display_order: maxOrder + 1,
      };
      await saveOtherAsset(asset);
      await reload();
      if (isAuthenticated) await pushToCloud();
    },
    [otherAssets, reload, isAuthenticated, pushToCloud],
  );

  const updateOtherAsset = useCallback(
    async (
      assetId: string,
      fields: { name?: string; amount?: number; currency?: Currency; note?: string },
    ) => {
      const asset = otherAssets.find((a) => a.other_asset_id === assetId);
      if (!asset) return;
      await saveOtherAsset({
        ...asset,
        name: fields.name ?? asset.name,
        amount: fields.amount ?? asset.amount,
        currency: fields.currency ?? asset.currency,
        note: fields.note ?? asset.note,
      });
      await reload();
      if (isAuthenticated) await pushToCloud();
    },
    [otherAssets, reload, isAuthenticated, pushToCloud],
  );

  const removeOtherAsset = useCallback(
    async (assetId: string) => {
      await dbDeleteOtherAsset(assetId);
      await reload();
      if (isAuthenticated) await pushToCloud();
    },
    [reload, isAuthenticated, pushToCloud],
  );

  const addRecentSearch = useCallback((result: SearchResult) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.symbol !== result.symbol);
      const next = [result, ...filtered].slice(0, 10);
      setMeta('recentSearches', next);
      return next;
    });
  }, []);

  const value: PortfolioContextValue = {
    accounts,
    holdings,
    otherAssets,
    computedAccounts,
    priceMap,
    usdKrwRate,
    lastPriceUpdate,
    lastRateUpdate,
    priceError,
    rateError,
    apiStatus,
    isRefreshing,
    viewFilter,
    sortKey,
    recentSearches,
    selectedAccountId,
    summary,
    setViewFilter,
    setSortKey,
    setSelectedAccountId,
    refreshPrices,
    addAccount,
    updateAccount,
    removeAccount,
    addHolding,
    removeHolding,
    updateHolding,
    addOtherAsset,
    updateOtherAsset,
    removeOtherAsset,
    addRecentSearch,
    syncStatus,
  };

  return (
    <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}