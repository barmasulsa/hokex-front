import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BannerManagementPage } from './pages/BannerManagementPage';
import { initGA4, recordVisit } from './utils/analytics';
import { recordDetailedVisit } from './utils/detailedAnalytics';
import './App.css';

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
