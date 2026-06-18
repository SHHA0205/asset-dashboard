import type { Currency } from '../types';

export function formatCurrency(value: number, currency: Currency, compact = false): string {
  if (currency === 'KRW') {
    if (compact && Math.abs(value) >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(1)}억원`;
    }
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPrice(value: number, currency: Currency): string {
  if (currency === 'KRW') {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function returnColor(value: number): string {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}