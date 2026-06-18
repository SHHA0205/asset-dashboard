import { useState } from 'react';
import type { Region, SearchResult } from '../types';
import { usePortfolio } from '../store/PortfolioContext';
import { TickerSearch } from './TickerSearch';

interface AddHoldingModalProps {
  accountId: string;
  region: Region;
  onClose: () => void;
}

export function AddHoldingModal({ accountId, region, onClose }: AddHoldingModalProps) {
  const { addHolding } = usePortfolio();
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !quantity || !avgBuyPrice) return;

    setSaving(true);
    try {
      await addHolding(
        accountId,
        selected,
        parseFloat(quantity),
        parseFloat(avgBuyPrice.replace(/,/g, '')),
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>종목 추가</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>종목 검색</label>
            <TickerSearch
              region={region}
              onSelect={setSelected}
              placeholder={region === 'KRX' ? '종목명 또는 6자리 코드' : '티커 심볼 검색'}
            />
          </div>

          {selected && (
            <div className="selected-stock">
              <strong>{selected.name}</strong>
              <span>{selected.ticker}</span>
              <span className={`badge badge-${selected.region === 'KRX' ? 'krx' : 'us'}`}>
                {selected.market}
              </span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>매입수량</label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>평균매입가 ({selected?.currency || (region === 'KRX' ? 'KRW' : 'USD')})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={avgBuyPrice}
                onChange={(e) => setAvgBuyPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" disabled={!selected || saving}>
              {saving ? '저장 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}