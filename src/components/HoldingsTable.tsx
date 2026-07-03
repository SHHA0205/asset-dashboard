import { useEffect, useState } from 'react';
import type { ComputedHolding } from '../types';
import type { Currency } from '../types';
import { formatCurrency, formatPercent, formatPrice, formatQuantity, returnColor } from '../utils/formatters';

interface HoldingsTableProps {
  holdings: ComputedHolding[];
  currency: Currency;
  usdKrwRate: number;
  editable?: boolean;
  onUpdate?: (holdingId: string, fields: { quantity?: number; avg_buy_price?: number }) => void;
  onRemove?: (holdingId: string) => void;
}

function EditableCell({
  value,
  onSave,
  onClickStop,
}: {
  value: number;
  onSave: (v: number) => void;
  onClickStop: (e: React.SyntheticEvent) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(draft.replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0 && parsed !== value) {
      onSave(parsed);
    } else {
      setDraft(String(value));
    }
    setFocused(false);
  };

  return (
    <input
      type="text"
      className="cell-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        onClickStop(e);
        setFocused(true);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      onClick={onClickStop}
    />
  );
}

export function HoldingsTable({
  holdings,
  currency,
  usdKrwRate,
  editable = false,
  onUpdate,
  onRemove,
}: HoldingsTableProps) {
  const stopClick = (e: React.SyntheticEvent) => e.stopPropagation();

  if (holdings.length === 0) {
    return <p className="empty-holdings">보유 종목이 없습니다. + 종목 버튼으로 추가하세요.</p>;
  }

  return (
    <div className="holdings-table-wrap" onClick={stopClick}>
      <table className="holdings-table">
        <thead>
          <tr>
            <th>종목명</th>
            <th>비율</th>
            <th>현재가</th>
            <th>매입가</th>
            <th>수량</th>
            <th>수익률</th>
            <th>평가금액</th>
            {onRemove && <th></th>}
          </tr>
        </thead>
        <tbody>
          {holdings.map(({ holding, currentPrice, marketValue, returnRate, weight }) => (
            <tr key={holding.holding_id}>
              <td className="col-name">
                <span className="holding-name">{holding.name}</span>
                <span className="holding-ticker">({holding.ticker})</span>
              </td>
              <td>{weight.toFixed(1)}%</td>
              <td>{formatPrice(currentPrice, currency)}</td>
              <td className="col-editable">
                {editable && onUpdate ? (
                  <EditableCell
                    value={holding.avg_buy_price}
                    onSave={(v) => onUpdate(holding.holding_id, { avg_buy_price: v })}
                    onClickStop={stopClick}
                  />
                ) : (
                  formatPrice(holding.avg_buy_price, currency)
                )}
              </td>
              <td className="col-editable">
                {editable && onUpdate ? (
                  <EditableCell
                    value={holding.quantity}
                    onSave={(v) => onUpdate(holding.holding_id, { quantity: v })}
                    onClickStop={stopClick}
                  />
                ) : (
                  formatQuantity(holding.quantity, holding.market === 'CRYPTO')
                )}
              </td>
              <td className={returnColor(returnRate)}>{formatPercent(returnRate)}</td>
              <td>
                <div>{formatCurrency(marketValue, currency)}</div>
                {currency === 'USD' && usdKrwRate > 0 && (
                  <div className="krw-sub">
                    ≈ {formatCurrency(marketValue * usdKrwRate, 'KRW')}
                  </div>
                )}
              </td>
              {onRemove && (
                <td>
                  <button
                    className="btn-icon-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(holding.holding_id);
                    }}
                    title="종목 삭제"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}