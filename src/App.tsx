import { useState } from 'react';
import { SummaryBar } from './components/SummaryBar';
import { AccountGrid } from './components/AccountGrid';
import { AccountDetail } from './components/AccountDetail';
import { SettingsPanel } from './components/SettingsPanel';
import { PortfolioProvider } from './store/PortfolioContext';

function AppContent() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app">
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand-icon">📊</span>
          <h1>자산 통합 대시보드</h1>
        </div>
        <button className="btn-settings" onClick={() => setShowSettings(true)}>
          ⚙ 계좌 설정
        </button>
      </nav>

      <SummaryBar />
      <AccountGrid />
      <AccountDetail />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}