import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

export function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithKakao, signInWithNaver, signInWithPassword, signInWithMagicLink, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false); const [emailOpen, setEmailOpen] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (!loading && user) navigate('/'); }, [user, loading, navigate]);
  const socialLogin = async (provider: 'google' | 'kakao' | 'naver') => {
    setSubmitting(true); setError(''); sessionStorage.setItem('hokex-open-nickname-setup', 'true');
    try { if (provider === 'google') await signInWithGoogle(); else if (provider === 'kakao') await signInWithKakao(); else await signInWithNaver(); }
    catch { sessionStorage.removeItem('hokex-open-nickname-setup'); setError(provider === 'naver' ? '네이버 로그인 설정을 준비 중입니다. 잠시 후 다시 시도해주세요.' : '소셜 로그인을 시작하지 못했습니다.'); setSubmitting(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (mode === 'signup' && (!agreed || password.length < 8 || password !== passwordConfirm)) { setError(!agreed ? '이용약관 및 개인정보처리방침에 동의해주세요.' : password.length < 8 ? '비밀번호는 8자 이상 입력해주세요.' : '비밀번호 확인이 일치하지 않습니다.'); return; }
    setSubmitting(true);
    try { if (mode === 'signup') { await signUp(email, password); setNotice('가입 확인 메일을 보냈습니다. 인증 후 로그인해주세요.'); setMode('login'); } else { sessionStorage.setItem('hokex-open-nickname-setup', 'true'); await signInWithPassword(email, password); } }
    catch { sessionStorage.removeItem('hokex-open-nickname-setup'); setError('이메일 또는 비밀번호를 확인해주세요.'); } finally { setSubmitting(false); }
  };
  const magicLink = async () => { if (!email) { setError('이메일 주소를 입력해주세요.'); return; } setSubmitting(true); try { await signInWithMagicLink(email); setNotice('이메일로 로그인 링크를 보냈습니다.'); } catch { setError('로그인 링크를 보내지 못했습니다.'); } finally { setSubmitting(false); } };
  if (loading) return <div className="login-container"><div className="login-box"><p>로딩 중...</p></div></div>;
  return <div className="login-container"><div className="login-box"><div className="login-header"><h1>HOKEX</h1><p>전국 전시·컨벤션 정보 플랫폼</p></div><div className="login-content">
    <h2>호켁스 시작하기</h2><p className="login-description">소셜 계정으로 빠르게 로그인하고, 첫 방문 시 닉네임만 설정하면 됩니다.</p>
    <div className="social-login-buttons">
      <button className="social-login naver" disabled={submitting} onClick={() => socialLogin('naver')}><span className="social-provider-mark naver-mark" aria-hidden="true">N</span><span>네이버 계정으로 로그인</span></button>
      <button className="social-login kakao" disabled={submitting} onClick={() => socialLogin('kakao')}><span className="social-provider-mark kakao-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 3C6.48 3 2 6.45 2 10.7c0 2.74 1.8 5.15 4.5 6.5l-.9 3.3a.45.45 0 0 0 .68.5l3.98-2.62c.57.08 1.15.12 1.74.12 5.52 0 10-3.45 10-7.7S17.52 3 12 3Z" /></svg></span><span>카카오 계정으로 로그인</span></button>
      <button className="social-login google" disabled={submitting} onClick={() => socialLogin('google')}><span className="social-provider-mark google-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.25-.2-1.8H12v3.39h5.37c-.11.84-.73 2.1-2.11 2.95l-.02.11 3.07 2.38.21.02c1.94-1.79 3.06-4.43 3.06-7.05Z" /><path fill="#34A853" d="M12 21.75c2.62 0 4.82-.86 6.43-2.35l-3.06-2.4c-.82.57-1.92.97-3.37.97-2.56 0-4.74-1.69-5.52-4.03l-.1.01-3.2 2.48-.04.1A9.72 9.72 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.48 13.94A5.83 5.83 0 0 1 6.17 12c0-.67.12-1.32.3-1.94v-.12L3.23 7.42l-.1.05A9.75 9.75 0 0 0 2.25 12c0 1.64.4 3.18.88 4.53l3.35-2.59Z" /><path fill="#EA4335" d="M12 6.03c1.83 0 3.06.79 3.76 1.45l2.75-2.68C16.81 3.2 14.62 2.25 12 2.25a9.72 9.72 0 0 0-8.87 5.22l3.34 2.59C7.26 7.72 9.44 6.03 12 6.03Z" /></svg></span><span>구글 계정으로 로그인</span></button>
    </div>
    <p className="social-notice">소셜 로그인은 회원가입과 로그인이 한 번에 진행됩니다.</p>
    {error && <div className="error-message">{error}</div>}{notice && <div className="success-message">{notice}</div>}
    <div className="divider"><span>또는</span></div>
    <button type="button" className="email-login-toggle" onClick={() => setEmailOpen(value => !value)}>이메일로 로그인 또는 회원가입 {emailOpen ? '⌃' : '⌄'}</button>
    {emailOpen && <><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>이메일 로그인</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>이메일 가입</button></div><form onSubmit={submit} className="login-form"><div className="form-group"><label htmlFor="email">이메일</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div><div className="form-group"><label htmlFor="password">비밀번호</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>{mode === 'signup' && <><div className="form-group"><label htmlFor="password-confirm">비밀번호 확인</label><input id="password-confirm" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required /></div><label className="checkbox-label"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span><a href="/terms.html" target="_blank" rel="noreferrer">이용약관</a> 및 <a href="/privacy.html" target="_blank" rel="noreferrer">개인정보처리방침</a>에 동의합니다.</span></label></>}<button className="login-btn primary-btn" disabled={submitting}>{mode === 'signup' ? '이메일로 가입하기' : '이메일로 로그인'}</button></form>{mode === 'login' && <><button type="button" className="forgot-password-link" onClick={() => resetPassword(email)} disabled={submitting}>비밀번호 찾기</button><button type="button" className="login-btn secondary-btn" onClick={magicLink} disabled={submitting}>✉️ 이메일 링크로 로그인</button></>}</>}
    <div className="newsletter-callout"><strong>카페인판다 뉴스레터</strong><p>호켁스 가입과 별개로, 업계 소식과 업데이트를 받아보세요.</p><a href="https://page.stibee.com/subscriptions/289942" target="_blank" rel="noreferrer">뉴스레터 구독하기</a></div>
  </div></div></div>;
}
