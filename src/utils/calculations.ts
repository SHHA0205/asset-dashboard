import type {
  Account,
  ComputedAccount,
  ComputedHolding,
  Holding,
  PortfolioSummary,
  PriceSnapshot,
} from '../types';

export function toYahooSymbol(ticker: string, market: string): string {
  const upper = ticker.toUpperCase();
  if (upper.endsWith('.KS') || upper.endsWith('.KQ')) return upper;
  if (/^\d{6}$/.test(ticker)) {
    const m = market.toUpperCase();
    if (m.includes('KOSDAQ') || m === 'KQ') return `${ticker}.KQ`;
    return `${ticker}.KS`;
  }
  return upper;
}

export function computeHolding(
  holding: Holding,
  priceMap: Map<string, PriceSnapshot>,
  accountTotal: number,
): ComputedHolding {
  const snapshot = priceMap.get(holding.symbol);
  const currentPrice = snapshot?.current_price ?? holding.avg_buy_price;
  const marketValue = holding.quantity * currentPrice;
  const cost = holding.quantity * holding.avg_buy_price;
  const returnRate = cost > 0 ? ((marketValue - cost) / cost) * 100 : 0;
  const weight = accountTotal > 0 ? (marketValue / accountTotal) * 100 : 0;

  return { holding, currentPrice, marketValue, returnRate, weight };
}

export function computeAccount(
  account: Account,
  holdings: Holding[],
  priceMap: Map<string, PriceSnapshot>,
  usdKrwRate: number,
): ComputedAccount {
  const accountHoldings = holdings.filter((h) => h.account_id === account.account_id);

  const holdingValues = accountHoldings.map((h) => {
    const snapshot = priceMap.get(h.symbol);
    const price = snapshot?.current_price ?? h.avg_buy_price;
    return h.quantity * price;
  });

  const totalMarketValue = holdingValues.reduce((s, v) => s + v, 0);
  const totalValue = totalMarketValue + account.cash_balance;
  const totalCost =
    accountHoldings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0) + account.cash_balance;

  const computedHoldings = accountHoldings
    .map((h) => computeHolding(h, priceMap, totalMarketValue))
    .sort((a, b) => b.marketValue - a.marketValue);

  const returnRate = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  const totalValueKRW =
    account.base_currency === 'KRW' ? totalValue : totalValue * usdKrwRate;

  return {
    account,
    holdings: computedHoldings,
    totalMarketValue,
    totalCost,
    totalValue,
    returnRate,
    totalValueKRW,
  };
}

export function computePortfolioSummary(
  computedAccounts: ComputedAccount[],
): PortfolioSummary {
  let domesticKRW = 0;
  let overseasKRW = 0;
  let costKRW = 0;

  for (const a of computedAccounts) {
    if (a.account.region === 'KRX') {
      domesticKRW += a.totalValueKRW;
      costKRW += a.totalCost;
    } else {
      overseasKRW += a.totalValueKRW;
      const rate = a.totalValue > 0 ? a.totalValueKRW / a.totalValue : 1;
      costKRW += a.totalCost * rate;
    }
  }

  const totalAssetsKRW = domesticKRW + overseasKRW;
  const totalProfitKRW = totalAssetsKRW - costKRW;
  const totalReturnRate = costKRW > 0 ? (totalProfitKRW / costKRW) * 100 : 0;

  return {
    totalAssetsKRW,
    totalCostKRW: costKRW,
    totalReturnRate,
    totalProfitKRW,
    domesticKRW,
    overseasKRW,
  };
}

export function weightedAverageBuyPrice(
  existingQty: number,
  existingPrice: number,
  newQty: number,
  newPrice: number,
): number {
  const totalQty = existingQty + newQty;
  if (totalQty === 0) return 0;
  return (existingQty * existingPrice + newQty * newPrice) / totalQty;
}