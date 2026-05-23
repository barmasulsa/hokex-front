import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

export function LoginPage() {
  const { user, loading, signInWithPassword, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // 매직 링크 만료 감지 (로그인 페이지에서만)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
      // 이미 App.tsx에서 URL은 정리되었으므로, 여기서는 안내만 표시
      setError('⚠️ 로그인 링크가 만료되었습니다. 아래에서 새로운 링크를 요청해주세요.');
    }
  }, []);

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
        setError('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.');
      } else if (error.message === 'Invalid login credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    const emailInput = prompt('이메일 주소를 입력하세요:');
    if (emailInput) {
      try {
        await signInWithMagicLink(emailInput);
        alert('이메일로 로그인 링크를 전송했습니다. 이메일을 확인해주세요.');
      } catch (error: any) {
        if (error.message === 'SUBSCRIBER_ONLY') {
          alert('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n스티비 뉴스레터를 구독한 이메일 주소로 로그인해주세요.');
        } else if (error.message?.includes('rate limit')) {
          alert('⚠️ 이메일 전송 제한에 도달했습니다.\n\n비밀번호 로그인을 사용하거나 잠시 후 다시 시도해주세요.');
        } else {
          alert('로그인 링크 전송에 실패했습니다. 다시 시도해주세요.');
        }
      }
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = prompt('비밀번호를 재설정할 이메일 주소를 입력하세요:');
    if (emailInput) {
      try {
        await resetPassword(emailInput);
        alert('✅ 비밀번호 재설정 링크를 이메일로 전송했습니다.\n\n이메일을 확인하여 비밀번호를 재설정해주세요.');
      } catch (error: any) {
        if (error.message === 'SUBSCRIBER_ONLY') {
          alert('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n스티비 뉴스레터를 구독한 이메일 주소를 입력해주세요.');
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

          <div className="magic-link-info-box">
            <h3>💡 이메일 링크 로그인 안내</h3>
            <p>이메일로 받은 로그인 링크를 클릭하면 자동으로 로그인됩니다.</p>
            <p><strong>첫 로그인 후 비밀번호를 설정하면 링크 없이도 로그인으로 이용 가능합니다.</strong></p>
          </div>

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
              disabled={isSubmitting}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="divider">
            <span>또는</span>
          </div>

          <button 
            className="login-btn secondary-btn"
            onClick={handleMagicLink}
            disabled={isSubmitting}
          >
            <span className="btn-icon">✉️</span>
            이메일 링크로 로그인
          </button>

          <div className="subscriber-notice">
            <p>💡 뉴스레터를 구독한 이메일 주소로 로그인해주세요.</p>
            <p>아직 구독하지 않으셨나요? <a href="https://page.stibee.com/subscriptions/289942" target="_blank" rel="noopener noreferrer">뉴스레터 구독하기</a></p>
            <p><strong>💡 Tip:</strong> 이메일 링크로 첫 로그인 후, 프로필 페이지에서 비밀번호를 설정하면 다음부터는 이메일 링크 없이 바로 로그인할 수 있습니다.</p>
          </div>

          <div className="login-footer">
            <p>로그인하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
