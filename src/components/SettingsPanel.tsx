import { useState } from 'react';
import type { Region } from '../types';
import { usePortfolio } from '../store/PortfolioContext';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { accounts, addAccount, updateAccount, removeAccount } = usePortfolio();
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState<Region>('KRX');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addAccount(newName.trim(), newRegion);
    setNewName('');
  };

  const handleSaveEdit = async (accountId: string) => {
    const acc = accounts.find((a) => a.account_id === accountId);
    if (!acc || !editName.trim()) return;
    await updateAccount({ ...acc, account_name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (accountId: string, name: string) => {
    if (confirm(`"${name}" 계좌를 삭제하시겠습니까? 보유 종목도 함께 삭제됩니다.`)) {
      await removeAccount(accountId);
    }
  };

  const domestic = accounts.filter((a) => a.region === 'KRX');
  const overseas = accounts.filter((a) => a.region === 'US');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>계좌 설정</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>계좌 추가</h3>
            <div className="add-account-row">
              <input
                type="text"
                placeholder="계좌 별칭 (예: 키움-국내1)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select value={newRegion} onChange={(e) => setNewRegion(e.target.value as Region)}>
                <option value="KRX">국내 (KRX)</option>
                <option value="US">해외 (US)</option>
              </select>
              <button className="btn-primary" onClick={handleAdd}>추가</button>
            </div>
          </section>

          <section className="settings-section">
            <h3>국내 계좌 ({domestic.length}개)</h3>
            <AccountList
              accounts={domestic}
              editingId={editingId}
              editName={editName}
              onStartEdit={(id, name) => { setEditingId(id); setEditName(name); }}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onEditNameChange={setEditName}
              onDelete={handleDelete}
            />
          </section>

          <section className="settings-section">
            <h3>해외 계좌 ({overseas.length}개)</h3>
            <AccountList
              accounts={overseas}
              editingId={editingId}
              editName={editName}
              onStartEdit={(id, name) => { setEditingId(id); setEditName(name); }}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onEditNameChange={setEditName}
              onDelete={handleDelete}
            />
          </section>

          <p className="settings-note">
            총 {accounts.length}개 계좌 · 데이터는 브라우저 IndexedDB에 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountList({
  accounts,
  editingId,
  editName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onDelete,
}: {
  accounts: { account_id: string; account_name: string }[];
  editingId: string | null;
  editName: string;
  onStartEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (accounts.length === 0) return <p className="empty-list">계좌 없음</p>;

  return (
    <ul className="account-list">
      {accounts.map((a) => (
        <li key={a.account_id} className="account-list-item">
          {editingId === a.account_id ? (
            <>
              <input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                autoFocus
              />
              <button onClick={() => onSaveEdit(a.account_id)}>저장</button>
              <button onClick={onCancelEdit}>취소</button>
            </>
          ) : (
            <>
              <span>{a.account_name}</span>
              <div className="list-actions">
                <button onClick={() => onStartEdit(a.account_id, a.account_name)}>이름변경</button>
                <button className="btn-danger" onClick={() => onDelete(a.account_id, a.account_name)}>
                  삭제
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}