import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

export function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithKakao, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleMagicLink = async () => {
    const email = prompt('이메일 주소를 입력하세요:');
    if (email) {
      try {
        await signInWithMagicLink(email);
        alert('이메일로 로그인 링크를 전송했습니다. 이메일을 확인해주세요.');
      } catch (error) {
        alert('로그인 링크 전송에 실패했습니다.');
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
            HOKEX 서비스를 이용하려면 로그인이 필요합니다.
          </p>

          <div className="login-buttons">
            <button 
              className="login-btn google-btn"
              onClick={signInWithGoogle}
            >
              <span className="btn-icon">🔍</span>
              Google로 로그인
            </button>

            <button 
              className="login-btn kakao-btn"
              onClick={signInWithKakao}
            >
              <span className="btn-icon">💬</span>
              Kakao로 로그인
            </button>

            <button 
              className="login-btn email-btn"
              onClick={handleMagicLink}
            >
              <span className="btn-icon">✉️</span>
              이메일로 로그인
            </button>
          </div>

          <div className="login-footer">
            <p>로그인하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
