import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithKakao, signInWithNaver, signInWithMagicLink } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google login error:', err);
      setError('구글 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithKakao();
    } catch (err) {
      console.error('Kakao login error:', err);
      setError('카카오 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithNaver();
    } catch (err) {
      console.error('Naver login error:', err);
      setError('네이버 로그인에 실패했습니다.');
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      console.error('Magic link error:', err);
      setError('로그인 링크 전송에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>HOKEX</h1>
          <p className="login-subtitle">Hub of Korea Exhibition</p>
          <p className="login-description">로그인하여 행사 정보를 관리하세요</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {magicLinkSent && (
          <div className="login-success">
            <p>✉️ 로그인 링크를 이메일로 전송했습니다!</p>
            <p className="login-success-detail">
              {email}로 전송된 링크를 클릭하여 로그인하세요.
            </p>
          </div>
        )}

        <div className="login-section">
          <h2 className="login-section-title">이메일로 로그인</h2>
          <p className="login-section-description">뉴스레터 구독자용</p>
          
          <form onSubmit={handleMagicLinkLogin} className="magic-link-form">
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || magicLinkSent}
              className="email-input"
              required
            />
            <button
              type="submit"
              className="login-btn magic-link-btn"
              disabled={loading || magicLinkSent}
            >
              {magicLinkSent ? '✓ 전송 완료' : '로그인 링크 받기'}
            </button>
          </form>
        </div>

        <div className="login-divider">
          <span>또는</span>
        </div>

        <div className="login-section">
          <h2 className="login-section-title">소셜 로그인</h2>
          <p className="login-section-description">관리자용</p>
          
          <div className="login-buttons">
          <button
            className="login-btn google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
              <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
            </svg>
            <span>구글로 로그인</span>
          </button>

          <button
            className="login-btn kakao-btn"
            onClick={handleKakaoLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 0C4.029 0 0 3.36 0 7.5c0 2.661 1.77 4.992 4.44 6.33l-1.14 4.17c-.09.33.24.6.54.42l5.01-3.33c.39.03.78.06 1.17.06 4.971 0 9-3.36 9-7.5S13.971 0 9 0z" fill="#000000"/>
            </svg>
            <span>카카오로 로그인</span>
          </button>

          <button
            className="login-btn naver-btn"
            onClick={handleNaverLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.214 9.857L5.786 0H0v18h5.786V8.143L12.214 18H18V0h-5.786v9.857z" fill="#FFFFFF"/>
            </svg>
            <span>네이버로 로그인</span>
          </button>
          </div>
        </div>

        <div className="login-footer">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
