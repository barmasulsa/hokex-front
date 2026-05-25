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
import { initGA4, recordVisit } from './utils/analytics';
import { recordDetailedVisit } from './utils/detailedAnalytics';
import './App.css';

// 스크롤 복원 컴포넌트
function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    console.log('[ScrollRestoration] Location changed to:', location.pathname);
    
    // 홈페이지로 돌아올 때만 저장된 스크롤 위치 복원
    if (location.pathname === '/') {
      const savedPosition = sessionStorage.getItem('homeScrollPosition');
      console.log('[ScrollRestoration] Saved position:', savedPosition);
      
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        console.log('[ScrollRestoration] Will restore scroll to:', position);
        
        // 데이터 로딩 완료를 기다리기 위해 여러 시도
        const attemptRestore = (attempt = 0) => {
          if (attempt > 50) { // 최대 5초 대기 (50 * 100ms)
            console.log('[ScrollRestoration] Max attempts reached, giving up');
            sessionStorage.removeItem('homeScrollPosition');
            return;
          }
          
          // 페이지 높이가 충분한지 확인
          const pageHeight = document.documentElement.scrollHeight;
          const viewportHeight = window.innerHeight;
          
          console.log(`[ScrollRestoration] Attempt ${attempt}: pageHeight=${pageHeight}, viewport=${viewportHeight}, target=${position}`);
          
          // 페이지 높이가 목표 스크롤 위치보다 충분히 크면 복원
          if (pageHeight > position + viewportHeight) {
            // 페이지가 충분히 로드됨
            setTimeout(() => {
              window.scrollTo(0, position);
              console.log('[ScrollRestoration] Scroll restored to:', window.scrollY);
              sessionStorage.removeItem('homeScrollPosition');
            }, 50); // 약간의 지연을 두고 스크롤
          } else {
            // 아직 로딩 중, 다시 시도
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
    recordDetailedVisit(); // 세부 통계 기록
    
    // 기존 localStorage 데이터를 DB로 마이그레이션 (한 번만 실행)
    const migrated = localStorage.getItem('visitor_data_migrated');
    if (!migrated) {
      import('./utils/detailedAnalytics').then(({ migrateOldDataToDB }) => {
        migrateOldDataToDB().then(result => {
          if (result.success) {
            console.log(`방문자 통계 마이그레이션 완료: ${result.migrated}개 날짜`);
          }
        });
      });
    }
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
