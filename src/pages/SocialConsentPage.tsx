import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasCurrentUserConsent, HOKEX_PRIVACY_VERSION, HOKEX_TERMS_VERSION, recordCurrentUserConsent, type HOKEXConsent } from '../services/consentService';
import '../styles/LoginPage.css';

const pendingConsentKey = 'hokex-pending-social-consent';

export function SocialConsentPage() {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [ageOver14, setAgeOver14] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const continueToService = () => navigate(userProfile?.nickname ? '/' : '/profile?setup=nickname', { replace: true });
  const saveConsent = async (consent: HOKEXConsent) => {
    setSaving(true); setError('');
    try { await recordCurrentUserConsent(consent); sessionStorage.removeItem(pendingConsentKey); sessionStorage.removeItem('hokex-open-nickname-setup'); continueToService(); }
    catch { setError('동의 내용을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (!userProfile) return;
    const pendingRaw = sessionStorage.getItem(pendingConsentKey);
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as HOKEXConsent;
        if (pending.termsVersion && pending.privacyVersion && pending.ageOver14) { void saveConsent(pending); return; }
      } catch { sessionStorage.removeItem(pendingConsentKey); }
    }
    hasCurrentUserConsent().then(hasConsent => { if (hasConsent) continueToService(); else setChecking(false); }).catch(() => setChecking(false));
  }, [loading, user, userProfile]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!termsAgreed || !ageOver14) { setError(!termsAgreed ? '이용약관 및 개인정보처리방침에 동의해주세요.' : '만 14세 이상 확인이 필요합니다.'); return; }
    void saveConsent({ termsVersion: HOKEX_TERMS_VERSION, privacyVersion: HOKEX_PRIVACY_VERSION, marketingAgreed, ageOver14 });
  };

  return <div className="login-container"><div className="login-box"><div className="login-header"><h1>HOKEX</h1><p>전국 전시·컨벤션 정보 플랫폼</p></div><div className="login-content"><h2>회원가입 동의</h2><p className="login-description">HOKEX 서비스 이용을 위해 아래 내용을 확인해 주세요.</p>{checking || saving ? <p>동의 정보를 확인하는 중입니다…</p> : <form className="login-form" onSubmit={submit}><section className="social-consent"><label className="checkbox-label"><input type="checkbox" checked={termsAgreed} onChange={event => setTermsAgreed(event.target.checked)} /><span><a href="/terms.html" target="_blank" rel="noreferrer">이용약관</a> 및 <a href="/privacy.html" target="_blank" rel="noreferrer">개인정보처리방침</a>에 동의합니다. <b>(필수)</b></span></label><label className="checkbox-label"><input type="checkbox" checked={ageOver14} onChange={event => setAgeOver14(event.target.checked)} /><span>만 14세 이상입니다. <b>(필수)</b></span></label><label className="checkbox-label"><input type="checkbox" checked={marketingAgreed} onChange={event => setMarketingAgreed(event.target.checked)} /><span>HOKEX 소식·이벤트·마케팅 정보 수신에 동의합니다. <b>(선택)</b></span></label></section>{error && <div className="error-message">{error}</div>}<button className="login-btn primary-btn" type="submit">동의하고 시작하기</button></form>}</div></div></div>;
}
