export type Region = 'KRX' | 'US';
export type Currency = 'KRW' | 'USD';
export type ViewFilter = 'all' | 'KRX' | 'US';
export type SortKey = 'display_order' | 'total_value' | 'return_rate';

export interface Account {
  account_id: string;
  account_name: string;
  region: Region;
  base_currency: Currency;
  cash_balance: number;
  display_order: number;
}

export interface Holding {
  holding_id: string;
  account_id: string;
  ticker: string;
  symbol: string;
  name: string;
  market: string;
  quantity: number;
  avg_buy_price: number;
}

export interface PriceSnapshot {
  symbol: string;
  current_price: number;
  currency: Currency;
  change: number;
  changePercent: number;
  fetched_at: string;
}

export interface ExchangeRate {
  pair: string;
  rate: number;
  fetched_at: string;
}

export interface SearchResult {
  symbol: string;
  ticker: string;
  name: string;
  market: string;
  exchange: string;
  currency: Currency;
  region: Region;
}

export interface ComputedHolding {
  holding: Holding;
  currentPrice: number;
  marketValue: number;
  returnRate: number;
  weight: number;
}

export interface ComputedAccount {
  account: Account;
  holdings: ComputedHolding[];
  totalMarketValue: number;
  totalCost: number;
  totalValue: number;
  returnRate: number;
  totalValueKRW: number;
}

export interface PortfolioSummary {
  totalAssetsKRW: number;
  totalCostKRW: number;
  totalReturnRate: number;
  totalProfitKRW: number;
  domesticKRW: number;
  overseasKRW: number;
}