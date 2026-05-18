import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/LoginPage.css';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setIsSuccess(true);
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      setError(`비밀번호 재설정에 실패했습니다: ${error.message || '다시 시도해주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <h1>HOKEX</h1>
            <p>전국 전시·컨벤션 정보 플랫폼</p>
          </div>

          <div className="login-content">
            <h2>비밀번호 재설정 완료</h2>
            <p className="login-description" style={{ color: '#10b981', marginTop: '1rem' }}>
              ✅ 비밀번호가 성공적으로 변경되었습니다!
            </p>
            <p className="login-description">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
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
          <h2>새 비밀번호 설정</h2>
          <p className="login-description">
            새로운 호켁스 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="password">새 호켁스 비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 6자 이상"
                required
                disabled={isSubmitting}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                required
                disabled={isSubmitting}
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="login-btn primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '설정 중...' : '비밀번호 설정'}
            </button>
          </form>

          <div className="login-footer" style={{ marginTop: '2rem' }}>
            <p>
              <a href="/login">로그인 페이지로 돌아가기</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
