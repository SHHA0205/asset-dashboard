import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

export function LoginPage() {
  const { login, register, useLocalOnly } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setPassword('');
    setPassword2('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="brand-icon">📊</span>
          <h1>자산 통합 대시보드</h1>
          <h2 className="login-mode-title">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <p className="login-sub">
            {mode === 'login'
              ? 'PC와 모바일에서 계좌 데이터를 동기화하려면 로그인하세요.'
              : '아이디와 비밀번호를 설정하면 다른 기기와 동기화됩니다.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3~20자 (영문, 숫자, 한글)"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="비밀번호 다시 입력"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary btn-login" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입 완료'}
          </button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? (
            <button type="button" className="btn-switch" onClick={() => switchMode('register')}>
              계정이 없으신가요? <strong>회원가입</strong>
            </button>
          ) : (
            <button type="button" className="btn-switch" onClick={() => switchMode('login')}>
              이미 계정이 있으신가요? <strong>로그인</strong>
            </button>
          )}
        </div>

        <div className="login-footer">
          <button type="button" className="btn-link" onClick={useLocalOnly}>
            로그인 없이 사용 (이 기기만, 동기화 안 됨)
          </button>
        </div>

        <div className="login-security">
          <small>
            비밀번호는 암호화되어 서버에 저장됩니다.
          </small>
        </div>
      </div>
    </div>
  );
}