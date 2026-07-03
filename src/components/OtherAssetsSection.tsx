import { useState } from 'react';
import type { Currency, OtherAsset } from '../types';
import { usePortfolio } from '../store/PortfolioContext';
import { toKRW } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';

export function OtherAssetsSection() {
  const { otherAssets, usdKrwRate, addOtherAsset, updateOtherAsset, removeOtherAsset } =
    usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('KRW');
  const [note, setNote] = useState('');

  const resetForm = () => {
    setName('');
    setAmount('');
    setCurrency('KRW');
    setNote('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (asset: OtherAsset) => {
    setEditingId(asset.other_asset_id);
    setName(asset.name);
    setAmount(String(asset.amount));
    setCurrency(asset.currency);
    setNote(asset.note);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(/,/g, ''));
    if (!name.trim() || isNaN(val) || val <= 0) return;

    if (editingId) {
      await updateOtherAsset(editingId, {
        name: name.trim(),
        amount: val,
        currency,
        note: note.trim(),
      });
    } else {
      await addOtherAsset(name.trim(), val, currency, note.trim());
    }
    resetForm();
  };

  const totalKRW = otherAssets.reduce(
    (s, a) => s + toKRW(a.amount, a.currency, usdKrwRate),
    0,
  );

  return (
    <section className="other-assets-section">
      <div className="other-assets-header">
        <div>
          <h2>기타 자산</h2>
          <p className="section-desc">부동산, 예금, 코인 등 증권 외 자산을 수동 입력합니다.</p>
        </div>
        <div className="other-assets-total">
          <span className="summary-label">기타 자산 합계</span>
          <span className="other-total-value">{formatCurrency(totalKRW, 'KRW')}</span>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + 항목 추가
        </button>
      </div>

      {showForm && (
        <form className="other-asset-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>항목</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 부동산, 예금, BTC"
                required
              />
            </div>
            <div className="form-group">
              <label>금액</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>통화</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="KRW">원화 (KRW)</option>
                <option value="USD">달러 (USD)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>기타 정보</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 강남 아파트, 국민은행 MMF, 메모"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={resetForm}>취소</button>
            <button type="submit" className="btn-primary">
              {editingId ? '수정' : '추가'}
            </button>
          </div>
        </form>
      )}

      {otherAssets.length === 0 ? (
        <p className="empty-other">등록된 기타 자산이 없습니다.</p>
      ) : (
        <table className="other-assets-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>금액</th>
              <th>기타 정보</th>
              <th>원화 환산</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {otherAssets.map((a) => (
              <tr key={a.other_asset_id}>
                <td className="col-name">{a.name}</td>
                <td>{formatCurrency(a.amount, a.currency)}</td>
                <td className="col-note">{a.note || '-'}</td>
                <td>
                  {usdKrwRate > 0 || a.currency === 'KRW'
                    ? formatCurrency(toKRW(a.amount, a.currency, usdKrwRate), 'KRW')
                    : '-'}
                </td>
                <td className="col-actions">
                  <button className="btn-sm" onClick={() => startEdit(a)}>수정</button>
                  <button
                    className="btn-sm btn-danger"
                    onClick={() => {
                      if (confirm(`"${a.name}" 항목을 삭제하시겠습니까?`)) {
                        removeOtherAsset(a.other_asset_id);
                      }
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}