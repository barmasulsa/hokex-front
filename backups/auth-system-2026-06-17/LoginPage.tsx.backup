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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  // OTP 기능 비활성화됨

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
      // 로그인 성공 시 자동으로 리다이렉트됨
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'NEEDS_APPROVAL') {
        setError('⚠️ 승인이 필요한 계정입니다.\n\n관리자에게 승인을 요청해주세요.\n\n승인되면 로그인이 가능합니다.\n\n문의: hokexpanda@gmail.com');
      } else if (error.message === 'SUBSCRIBER_ONLY') {
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

  // OTP 기능 비활성화됨 - 문서는 보존

  const handleMagicLink = async () => {
    if (!agreedToTerms) {
      alert('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }

    const emailInput = prompt('이메일 주소를 입력하세요:');
    if (emailInput) {
      try {
        await signInWithMagicLink(emailInput);
        alert('이메일로 로그인 링크를 전송했습니다. 이메일을 확인해주세요.');
      } catch (error: any) {
        if (error.message === 'EMAIL_BLOCKED') {
          alert('⚠️ 이메일 전송이 차단되었습니다.\n\n회사 이메일 서버에서 스팸으로 차단한 것으로 보입니다.\n\n관리자에게 승인 요청이 자동으로 전달되었습니다.\n\n승인 후에는 비밀번호 로그인을 사용해주세요.\n\n문의: hokexpanda@gmail.com');
        } else if (error.message === 'NEEDS_APPROVAL') {
          alert('⚠️ 승인이 필요한 계정입니다.\n\n관리자에게 승인을 요청해주세요.\n\n승인되면 이메일 링크 또는 비밀번호로 로그인할 수 있습니다.\n\n문의: hokexpanda@gmail.com');
        } else if (error.message === 'SUBSCRIBER_ONLY') {
          alert('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n스티비 뉴스레터를 구독한 이메일 주소로 로그인해주세요.\n\n방금 구독하셨다면: 데이터 동기화가 진행 중으로 10초~1분 사이에 동기화가 진행되어 대기 후 이용 가능합니다.');
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

          <p className="login-steps">1. 카페인판다 구독 및 확인 메일 발송 후 구독하기 클릭<br />2. 구독 후 <span style={{color: '#667eea', fontWeight: 'bold'}}>이메일 링크로 로그인</span> 버튼 클릭 후 받은 링크로 호켁스 접속<br />3. 접속 후 프로필에서 비밀번호 설정 후 로그인하면 1년간 자동로그인</p>

          <div className="terms-agreement">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>
                <a href="/terms.html" target="_blank" rel="noopener noreferrer">이용약관</a> 및{' '}
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>에 동의합니다.
              </span>
            </label>
          </div>

          <button 
            className="login-btn secondary-btn"
            onClick={handleMagicLink}
            disabled={isSubmitting || !agreedToTerms}
          >
            <span className="btn-icon">✉️</span>
            이메일 링크로 로그인
          </button>

          <p className="email-link-notice">
            메일함과 스팸 처리 주의 및 스팸 메일함 확인
          </p>

          <div className="divider">
            <span>또는</span>
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

          <div className="magic-link-info-box">
            <h3>💡 이메일 링크 로그인 안내</h3>
            <p>
              이메일로 받은 로그인 링크를 클릭하면 자동으로 로그인됩니다. 첫 로그인 후 프로필 페이지에서 비밀번호를 설정 후 비밀번호로 로그인하면 매번 이메일 링크 로그인 없이 1년간 자동 로그인으로 이용 가능합니다(로그아웃 전까지).
            </p>
            <p>
              <strong>이메일이 안 오면:</strong><br />
              1. 새로고침 및 대기<br />
              2. 스팸 메일함 확인<br />
              3. 위 두 개 시도 후에도 안 될 시 hokexpanda@gmail.com으로 구독 이메일과 함께 내용 제보 요청
            </p>
            <p>
              <strong>이메일 전송 제한:</strong><br />
              무분별한 사용 중으로 하루 시도 500번 발송에 도달한 경우 차단됩니다. 다음날에 다시 시도해주시기를 요청드립니다.
            </p>
          </div>

          <div className="subscriber-notice">
            <p>💡 뉴스레터를 구독한 이메일 주소로 로그인해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
