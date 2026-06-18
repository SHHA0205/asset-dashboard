import { usePortfolio } from '../store/PortfolioContext';
import { formatCurrency, formatDateTime, formatPercent, returnColor } from '../utils/formatters';

export function SummaryBar() {
  const {
    summary,
    usdKrwRate,
    lastPriceUpdate,
    lastRateUpdate,
    priceError,
    rateError,
    apiStatus,
    isRefreshing,
    refreshPrices,
  } = usePortfolio();

  const warnings = [priceError, rateError].filter(Boolean);

  const statusLabel =
    apiStatus === 'connected' ? 'API 연결됨' :
    apiStatus === 'loading' ? 'API 연결 중...' : 'API 오류';

  return (
    <header className="summary-bar">
      <div className="summary-main">
        <div className="summary-item">
          <span className="summary-label">통합 총자산</span>
          <span className="summary-value total">{formatCurrency(summary.totalAssetsKRW, 'KRW')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">전체 수익률</span>
          <span className={`summary-value ${returnColor(summary.totalReturnRate)}`}>
            {formatPercent(summary.totalReturnRate)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">평가손익</span>
          <span className={`summary-value ${returnColor(summary.totalProfitKRW)}`}>
            {formatCurrency(summary.totalProfitKRW, 'KRW')}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">USD/KRW</span>
          <span className="summary-value">
            {usdKrwRate > 0
              ? usdKrwRate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
              : '조회 중...'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">API 상태</span>
          <span className={`summary-value api-status api-status-${apiStatus}`}>
            <span className="status-dot" /> {statusLabel}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">국내 / 해외</span>
          <span className="summary-value sub">
            {formatCurrency(summary.domesticKRW, 'KRW', true)} / {formatCurrency(summary.overseasKRW, 'KRW', true)}
          </span>
        </div>
      </div>

      <div className="summary-meta">
        <span className="delay-notice">시세 15~20분 지연 · 마지막 갱신 {formatDateTime(lastPriceUpdate)}</span>
        {lastRateUpdate && (
          <span className="delay-notice">환율 갱신 {formatDateTime(lastRateUpdate)}</span>
        )}
        <button
          className="btn-refresh"
          onClick={() => refreshPrices()}
          disabled={isRefreshing}
        >
          {isRefreshing ? '갱신 중...' : '시세 새로고침'}
        </button>
      </div>

      {apiStatus === 'error' && (
        <div className="warning-banner">
          <span>API 서버에 연결되지 않았습니다. start.bat 을 실행하고 http://localhost:3001 로 접속하세요.</span>
          {warnings.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      )}
      {apiStatus === 'connected' && warnings.length > 0 && (
        <div className="warning-banner warning-soft">
          {warnings.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      )}
    </header>
  );
}