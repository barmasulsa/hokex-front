import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

export function LoginPage() {
  const { user, loading, signInWithMagicLink } = useAuth();
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
      } catch (error: any) {
        if (error.message === 'SUBSCRIBER_ONLY') {
          alert('⚠️ 뉴스레터 구독자만 이용할 수 있습니다.\n\n스티비 뉴스레터를 구독한 이메일 주소로 로그인해주세요.');
        } else {
          alert('로그인 링크 전송에 실패했습니다. 다시 시도해주세요.');
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
            HOKEX는 뉴스레터 구독자 전용 서비스입니다.
          </p>

          <div className="login-buttons">
            <button 
              className="login-btn email-btn"
              onClick={handleMagicLink}
            >
              <span className="btn-icon">✉️</span>
              이메일로 로그인
            </button>
          </div>

          <div className="subscriber-notice">
            <p>💡 뉴스레터를 구독한 이메일 주소로 로그인해주세요.</p>
            <p>아직 구독하지 않으셨나요? <a href="https://stibee.com/api/v1.0/lists/289942/public/subscribe" target="_blank" rel="noopener noreferrer">뉴스레터 구독하기</a></p>
          </div>

          <div className="login-footer">
            <p>로그인하면 <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
