import { useState } from 'react';
import type { ComputedAccount } from '../types';
import { usePortfolio } from '../store/PortfolioContext';
import { formatCurrency, formatPercent, returnColor } from '../utils/formatters';
import { HoldingsTable } from './HoldingsTable';
import { AddHoldingModal } from './AddHoldingModal';

interface AccountCardProps {
  computed: ComputedAccount;
}

export function AccountCard({ computed }: AccountCardProps) {
  const { account, holdings, totalValue, returnRate, totalValueKRW } = computed;
  const { usdKrwRate, setSelectedAccountId, updateHolding, removeHolding } = usePortfolio();
  const [showAddModal, setShowAddModal] = useState(false);

  const regionClass = account.region === 'KRX' ? 'card-krx' : 'card-us';

  return (
    <>
      <article
        className={`account-card ${regionClass}`}
        onClick={() => setSelectedAccountId(account.account_id)}
      >
        <div className="card-header">
          <div className="card-title-row">
            <h3 className="card-title">{account.account_name}</h3>
            <span className={`region-badge ${regionClass}`}>
              {account.region === 'KRX' ? '국내' : '해외'}
            </span>
          </div>
          <button
            className="btn-add-holding"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddModal(true);
            }}
          >
            + 종목
          </button>
        </div>

        <HoldingsTable
          holdings={holdings}
          currency={account.base_currency}
          usdKrwRate={usdKrwRate}
          editable
          onUpdate={(id, fields) => updateHolding(id, fields)}
          onRemove={(id) => {
            if (confirm('이 종목을 삭제하시겠습니까?')) removeHolding(id);
          }}
        />

        <div className="card-footer">
          <div className="card-total">
            <span className="card-total-label">계좌 총자산</span>
            <span className="card-total-value">
              {formatCurrency(totalValue, account.base_currency)}
            </span>
            {account.base_currency === 'USD' && usdKrwRate > 0 && (
              <span className="card-total-krw">
                ≈ {formatCurrency(totalValueKRW, 'KRW')}
              </span>
            )}
          </div>
          <div className={`card-return ${returnColor(returnRate)}`}>
            {formatPercent(returnRate)}
          </div>
        </div>

        {account.cash_balance > 0 && (
          <div className="cash-row">
            현금: {formatCurrency(account.cash_balance, account.base_currency)}
          </div>
        )}
      </article>

      {showAddModal && (
        <AddHoldingModal
          accountId={account.account_id}
          region={account.region}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}