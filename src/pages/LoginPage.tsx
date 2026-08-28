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
      <button className="social-login kakao" disabled={submitting} onClick={() => socialLogin('kakao')}><b>카카오</b>로 시작하기</button>
      <button className="social-login naver" disabled={submitting} onClick={() => socialLogin('naver')}><b>N</b> 네이버로 시작하기</button>
      <button className="social-login google" disabled={submitting} onClick={() => socialLogin('google')}><span>G</span> Google로 계속하기</button>
    </div>
    <p className="social-notice">소셜 로그인은 회원가입과 로그인이 한 번에 진행됩니다.</p>
    {error && <div className="error-message">{error}</div>}{notice && <div className="success-message">{notice}</div>}
    <div className="divider"><span>또는</span></div>
    <button type="button" className="email-login-toggle" onClick={() => setEmailOpen(value => !value)}>이메일로 로그인 또는 회원가입 {emailOpen ? '⌃' : '⌄'}</button>
    {emailOpen && <><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>이메일 로그인</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>이메일 가입</button></div><form onSubmit={submit} className="login-form"><div className="form-group"><label htmlFor="email">이메일</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div><div className="form-group"><label htmlFor="password">비밀번호</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>{mode === 'signup' && <><div className="form-group"><label htmlFor="password-confirm">비밀번호 확인</label><input id="password-confirm" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required /></div><label className="checkbox-label"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span><a href="/terms.html" target="_blank" rel="noreferrer">이용약관</a> 및 <a href="/privacy.html" target="_blank" rel="noreferrer">개인정보처리방침</a>에 동의합니다.</span></label></>}<button className="login-btn primary-btn" disabled={submitting}>{mode === 'signup' ? '이메일로 가입하기' : '이메일로 로그인'}</button></form>{mode === 'login' && <><button type="button" className="forgot-password-link" onClick={() => resetPassword(email)} disabled={submitting}>비밀번호 찾기</button><button type="button" className="login-btn secondary-btn" onClick={magicLink} disabled={submitting}>✉️ 이메일 링크로 로그인</button></>}</>}
    <div className="newsletter-callout"><strong>카페인판다 뉴스레터</strong><p>호켁스 가입과 별개로, 업계 소식과 업데이트를 받아보세요.</p><a href="https://page.stibee.com/subscriptions/289942" target="_blank" rel="noreferrer">뉴스레터 구독하기</a></div>
  </div></div></div>;
}
