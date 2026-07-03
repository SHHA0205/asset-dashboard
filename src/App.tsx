import { useState } from 'react';
import { SummaryBar } from './components/SummaryBar';
import { AccountGrid } from './components/AccountGrid';
import { AccountDetail } from './components/AccountDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './store/AuthContext';
import { PortfolioProvider, usePortfolio } from './store/PortfolioContext';

function AppContent() {
  const [showSettings, setShowSettings] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { syncStatus } = usePortfolio();

  const syncLabel =
    syncStatus === 'syncing' ? '동기화 중...' :
    syncStatus === 'synced' ? '동기화됨' :
    syncStatus === 'error' ? '동기화 실패' : '';

  return (
    <div className="app">
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand-icon">📊</span>
          <h1>자산 통합 대시보드</h1>
          {isAuthenticated && user && (
            <span className="nav-user">{user.username}</span>
          )}
        </div>
        <div className="nav-actions">
          {syncLabel && (
            <span className={`sync-badge sync-${syncStatus}`}>{syncLabel}</span>
          )}
          <button className="btn-settings" onClick={() => setShowSettings(true)}>
            계좌 설정
          </button>
          {isAuthenticated && (
            <button className="btn-logout" onClick={logout}>
              로그아웃
            </button>
          )}
        </div>
      </nav>

      <SummaryBar />
      <AccountGrid />
      <AccountDetail />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function AppGate() {
  const { isAuthenticated, isLocalOnly, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <p className="login-loading">로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isLocalOnly) {
    return <LoginPage />;
  }

  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}