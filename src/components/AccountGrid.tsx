import { usePortfolio } from '../store/PortfolioContext';
import { AccountCard } from './AccountCard';
import type { ViewFilter, SortKey } from '../types';

export function AccountGrid() {
  const { computedAccounts, viewFilter, setViewFilter, sortKey, setSortKey } = usePortfolio();

  return (
    <section className="account-grid-section">
      <div className="grid-controls">
        <div className="filter-tabs">
          {(['all', 'KRX', 'US'] as ViewFilter[]).map((f) => (
            <button
              key={f}
              className={`tab ${viewFilter === f ? 'active' : ''}`}
              onClick={() => setViewFilter(f)}
            >
              {f === 'all' ? '전체 보기' : f === 'KRX' ? '국내 (KRX)' : '해외 (US)'}
            </button>
          ))}
        </div>

        <div className="sort-controls">
          <label>정렬:</label>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="display_order">표시 순서</option>
            <option value="total_value">자산 규모순</option>
            <option value="return_rate">수익률순</option>
          </select>
        </div>
      </div>

      <div className="account-grid">
        {computedAccounts.map((computed) => (
          <AccountCard key={computed.account.account_id} computed={computed} />
        ))}
      </div>

      {computedAccounts.length === 0 && (
        <p className="empty-grid">표시할 계좌가 없습니다. 설정에서 계좌를 추가하세요.</p>
      )}
    </section>
  );
}