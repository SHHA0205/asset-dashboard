import { useMemo, useState } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { computeAccount } from '../utils/calculations';
import { formatCurrency, formatPercent, returnColor } from '../utils/formatters';
import { HoldingsTable } from './HoldingsTable';
import { AddHoldingModal } from './AddHoldingModal';

export function AccountDetail() {
  const {
    selectedAccountId,
    setSelectedAccountId,
    accounts,
    holdings,
    priceMap,
    usdKrwRate,
    removeHolding,
    updateHolding,
    updateAccount,
  } = usePortfolio();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');

  const computed = useMemo(() => {
    const account = accounts.find((a) => a.account_id === selectedAccountId);
    if (!account) return null;
    return computeAccount(account, holdings, priceMap, usdKrwRate);
  }, [accounts, holdings, priceMap, usdKrwRate, selectedAccountId]);

  if (!selectedAccountId || !computed) return null;

  const { account, holdings: computedHoldings, totalValue, returnRate, totalValueKRW, totalCost } = computed;

  const handleCashSave = async () => {
    const val = parseFloat(cashInput.replace(/,/g, '')) || 0;
    await updateAccount({ ...account, cash_balance: val });
    setEditingCash(false);
  };

  return (
    <div className="account-detail-overlay" onClick={() => setSelectedAccountId(null)}>
      <div className="account-detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <button className="btn-back" onClick={() => setSelectedAccountId(null)}>
            ← 대시보드
          </button>
          <div className="detail-title">
            <h2>{account.account_name}</h2>
            <span className={`region-badge ${account.region === 'KRX' ? 'card-krx' : 'card-us'}`}>
              {account.region === 'KRX' ? '국내 KRX' : '해외 US'}
            </span>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + 종목 추가
          </button>
        </div>

        <div className="detail-summary">
          <div className="detail-stat">
            <span className="stat-label">총자산</span>
            <span className="stat-value">{formatCurrency(totalValue, account.base_currency)}</span>
            {account.base_currency === 'USD' && (
              <span className="stat-sub">≈ {formatCurrency(totalValueKRW, 'KRW')}</span>
            )}
          </div>
          <div className="detail-stat">
            <span className="stat-label">매입원금</span>
            <span className="stat-value">{formatCurrency(totalCost, account.base_currency)}</span>
          </div>
          <div className="detail-stat">
            <span className="stat-label">수익률</span>
            <span className={`stat-value ${returnColor(returnRate)}`}>
              {formatPercent(returnRate)}
            </span>
          </div>
          <div className="detail-stat">
            <span className="stat-label">현금</span>
            {editingCash ? (
              <div className="cash-edit">
                <input
                  type="number"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  autoFocus
                />
                <button onClick={handleCashSave}>저장</button>
                <button onClick={() => setEditingCash(false)}>취소</button>
              </div>
            ) : (
              <span
                className="stat-value clickable"
                onClick={() => {
                  setCashInput(String(account.cash_balance));
                  setEditingCash(true);
                }}
              >
                {formatCurrency(account.cash_balance, account.base_currency)} ✎
              </span>
            )}
          </div>
        </div>

        <HoldingsTable
          holdings={computedHoldings}
          currency={account.base_currency}
          usdKrwRate={usdKrwRate}
          editable
          onUpdate={(id, fields) => updateHolding(id, fields)}
          onRemove={(id) => {
            if (confirm('이 종목을 삭제하시겠습니까?')) removeHolding(id);
          }}
        />

        {showAddModal && (
          <AddHoldingModal
            accountId={account.account_id}
            region={account.region}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    </div>
  );
}