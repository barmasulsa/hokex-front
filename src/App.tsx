import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { LoginPage } from './pages/LoginPage';
import './App.css';

function AppContent() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

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
                <span className="admin-badge">관리자</span>
              )}
              <span className="user-email">{user.email}</span>
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
