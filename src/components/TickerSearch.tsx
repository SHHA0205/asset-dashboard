import { useCallback, useEffect, useRef, useState } from 'react';
import { searchStocks } from '../api/client';
import type { SearchResult } from '../types';
import { usePortfolio } from '../store/PortfolioContext';
import { marketBadgeClass } from '../utils/formatters';

interface TickerSearchProps {
  region?: 'KRX' | 'US' | 'all';
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
}

export function TickerSearch({ region = 'all', onSelect, placeholder }: TickerSearchProps) {
  const { recentSearches, addRecentSearch } = usePortfolio();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const filterByRegion = useCallback(
    (items: SearchResult[]) => {
      if (region === 'all') return items;
      return items.filter((r) => r.region === region);
    },
    [region],
  );

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const data = await searchStocks(query);
      setResults(filterByRegion(data));
      setLoading(false);
      setIsOpen(true);
      setShowRecent(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filterByRegion]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    addRecentSearch(result);
    onSelect(result);
    setQuery('');
    setIsOpen(false);
    setShowRecent(false);
  };

  const displayResults = showRecent ? filterByRegion(recentSearches) : results;

  return (
    <div className="ticker-search" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.length < 2 && recentSearches.length > 0) {
            setShowRecent(true);
            setIsOpen(true);
          }
        }}
        placeholder={placeholder || '종목명, 티커, 종목코드 검색 (2글자 이상)'}
        className="search-input"
      />
      {loading && <span className="search-loading">검색 중...</span>}

      {isOpen && displayResults.length > 0 && (
        <ul className="search-dropdown">
          {showRecent && <li className="search-section-label">최근 검색</li>}
          {displayResults.map((r) => (
            <li key={r.symbol} onClick={() => handleSelect(r)} className="search-item">
              <div className="search-item-main">
                <span className="search-name">{r.name}</span>
                <span className="search-ticker">{r.ticker}</span>
              </div>
              <div className="search-item-meta">
                <span className={`badge badge-${marketBadgeClass(r.market, r.region)}`}>{r.market}</span>
                <span className="search-exchange">{r.exchange}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="search-empty">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}