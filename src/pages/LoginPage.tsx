import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

export function LoginPage() {
  const { user, loading, signInWithPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(() => {
    // localStorage에서 약관 동의 여부 확인
    return localStorage.getItem('termsAgreed') === 'true';
  });

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
      // 로그인 성공 시 자동으로 리다이렉트됨
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'SUBSCRIBER_ONLY') {
        setError('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n방금 구독하셨다면: 데이터 동기화가 진행 중으로 10초~1분 사이에 동기화가 진행되어 대기 후 이용 가능합니다.');
      } else if (error.message === 'Invalid login credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 매직 링크 로그인 기능은 제거됨 (비밀번호 찾기 기능은 유지)

  const handleForgotPassword = async () => {
    const emailInput = prompt('비밀번호를 재설정할 이메일 주소를 입력하세요:');
    if (emailInput) {
      try {
        await resetPassword(emailInput);
        alert('✅ 비밀번호 재설정 링크를 이메일로 전송했습니다.\n\n이메일을 확인하여 비밀번호를 재설정해주세요.\n\n스팸함도 확인해주세요.');
      } catch (error: any) {
        if (error.message === 'SUBSCRIBER_ONLY') {
          alert('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n스티비 뉴스레터를 구독한 이메일 주소를 입력해주세요.\n\n방금 구독하셨다면: 데이터 동기화가 진행 중으로 10초~1분 사이에 동기화가 진행되어 대기 후 이용 가능합니다.');
        } else if (error.message?.includes('rate limit')) {
          alert('⚠️ 이메일 전송 제한에 도달했습니다.\n\n잠시 후 다시 시도해주세요.');
        } else {
          alert('비밀번호 재설정 이메일 전송에 실패했습니다. 다시 시도해주세요.');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-box">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>HOKEX</h1>
          <p>전국 전시·컨벤션 정보 플랫폼</p>
        </div>

        <div className="login-content">
          <h2>로그인</h2>
          <p className="login-description">
            HOKEX는 카페인판다 뉴스레터 구독자 전용 서비스입니다.
          </p>

          <div className="subscriber-notice-top">
            <p>아직 구독하지 않으셨나요? <a href="https://page.stibee.com/subscriptions/289942" target="_blank" rel="noopener noreferrer">뉴스레터 구독하기</a></p>
          </div>

          <div className="initial-password-notice">
            <h3>🔑 초기 비밀번호 안내 (스팸메일 우회용도)</h3>
            <p>
              뉴스레터 구독 후 초기 비밀번호로 바로 로그인할 수 있습니다.
            </p>
            <p>
              <strong style={{color: '#667eea', fontSize: '1.2em'}}>초기 비밀번호: 123456</strong>
            </p>
            <p className="password-change-notice">
              ⚠️ 보안을 위해 로그인 후 프로필 페이지에서 비밀번호를 변경해주세요.
            </p>
          </div>

          <p className="login-steps">
            1. 카페인판다 뉴스레터 구독<br />
            2. 구독한 이메일과 초기 비밀번호(123456)로 로그인<br />
            3. 프로필에서 비밀번호 변경 (필수)
          </p>

          {!agreedToTerms && (
            <div className="terms-agreement">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (e.target.checked) {
                      localStorage.setItem('termsAgreed', 'true');
                    }
                  }}
                  disabled={isSubmitting}
                />
                <span>
                  <a href="/terms.html" target="_blank" rel="noopener noreferrer">이용약관</a> 및{' '}
                  <a href="/privacy.html" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의합니다.
                </span>
              </label>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">구독 이메일</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="구독한 이메일 주소"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">호켁스 비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="호켁스 비밀번호"
                required
                disabled={isSubmitting}
              />
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={handleForgotPassword}
                disabled={isSubmitting}
              >
                비밀번호 찾기
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="login-btn primary-btn"
              disabled={isSubmitting || !agreedToTerms}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="subscriber-notice">
            <p>💡 뉴스레터를 구독한 이메일 주소로 로그인해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
