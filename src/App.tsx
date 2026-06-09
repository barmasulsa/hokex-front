import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BannerManagementPage } from './pages/BannerManagementPage';
import { DeletedEventsPage } from './pages/DeletedEventsPage';
import { AdminApprovalPage } from './pages/AdminApprovalPage';

import { initGA4, recordVisit } from './utils/analytics';
import { trackVisit as recordVisitorCounter } from './utils/visitorCounter';
import './App.css';

// 스크롤 복원 컴포넌트 (이벤트 ID 기반)
function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    console.log('[ScrollRestoration] Location changed to:', location.pathname);
    
    // 홈페이지로 돌아올 때만 저장된 이벤트로 스크롤 복원
    if (location.pathname === '/') {
      const savedEventId = sessionStorage.getItem('lastViewedEventId');
      console.log('[ScrollRestoration] Saved event ID:', savedEventId);
      
      if (savedEventId) {
        // 데이터 로딩 완료를 기다리기 위해 여러 시도
        const attemptRestore = (attempt = 0) => {
          if (attempt > 50) { // 최대 5초 대기 (50 * 100ms)
            console.log('[ScrollRestoration] Max attempts reached, giving up');
            sessionStorage.removeItem('lastViewedEventId');
            return;
          }
          
          // 해당 이벤트 카드 찾기
          const eventCard = document.querySelector(`[data-event-id="${savedEventId}"]`);
          
          if (eventCard) {
            console.log(`[ScrollRestoration] Found event card at attempt ${attempt}`);
            
            // 즉시 스크롤 (순간이동 효과)
            eventCard.scrollIntoView({ behavior: 'auto', block: 'start' });
            console.log('[ScrollRestoration] Scrolled to event:', savedEventId);
            sessionStorage.removeItem('lastViewedEventId');
          } else {
            // 아직 로딩 중, 다시 시도
            console.log(`[ScrollRestoration] Event card not found, attempt ${attempt}`);
            setTimeout(() => attemptRestore(attempt + 1), 100);
          }
        };
        
        // 첫 시도는 약간 지연 후
        setTimeout(() => attemptRestore(0), 200);
      }
    } else {
      // 다른 페이지는 맨 위로 스크롤
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return null;
}

function AppContent() {
  const { user, isAdmin, loading, signOut, userProfile, toggleAdminMode } = useAuth();
  const navigate = useNavigate();

  // GA4 초기화 및 방문 기록
  useEffect(() => {
    initGA4();
    recordVisit();
    
    // 새로운 방문자 카운터 API 호출
    recordVisitorCounter().then(stats => {
      if (stats) {
        console.log('[방문자 카운터] 통계:', {
          오늘: stats.todayCount,
          전체: stats.totalCount,
          대시보드: stats.dashboardUrl
        });
      }
    });
  }, []);

  // URL 해시 정리 (에러 파라미터 제거)
  useEffect(() => {
    const hash = window.location.hash;
    
    // Supabase 인증 관련 에러 해시가 있으면 조용히 제거
    if (hash.includes('error=') || hash.includes('error_code=') || hash.includes('error_description=')) {
      // URL에서 에러 해시만 깔끔하게 제거
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <ScrollRestoration />
      {/* 헤더 */}
      <header className="app-header">
        <div className="header-logo-container">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1>HOKEX</h1>
            <span className="subtitle">Hub of Korea Exhibition</span>
          </Link>
        </div>
        <div className="header-actions">
          {user ? (
            <>
              <Link to="/profile" className="nav-link">My Profile</Link>
              {isAdmin && (
                <>
                  <span className="admin-badge">관리자</span>
                  <Link to="/admin/approvals" className="nav-link">🔐 승인 관리</Link>
                  <Link to="/admin/banners" className="nav-link">배너 관리</Link>
                  <Link to="/admin/deleted-events" className="nav-link">🗑️ 삭제된 행사</Link>
                </>
              )}
              <span className="user-email">{user.email}</span>
              {userProfile?.is_admin && (
                <button
                  onClick={toggleAdminMode}
                  className="admin-toggle-btn"
                  title={isAdmin ? '관리자 모드 끄기' : '관리자 모드 켜기'}
                >
                  {isAdmin ? '✏️' : '👀'}
                </button>
              )}
              <button 
                className="logout-btn"
                onClick={handleSignOut}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login" className="login-link">
              로그인
            </Link>
          )}
        </div>
      </header>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetailPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/approvals" element={<AdminApprovalPage />} />
        <Route path="/admin/banners" element={<BannerManagementPage />} />
        <Route path="/admin/deleted-events" element={<DeletedEventsPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
