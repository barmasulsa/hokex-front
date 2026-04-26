import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { UserProfilePage } from './pages/UserProfilePage';
import './App.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <BrowserRouter>
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
            <Link to="/profile" className="nav-link">My Profile</Link>
            <button 
              className={`admin-toggle ${isAdmin ? 'active' : ''}`}
              onClick={() => setIsAdmin(!isAdmin)}
            >
              {isAdmin ? '관리자 모드 ON' : '관리자 모드 OFF'}
            </button>
          </div>
        </header>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<HomePage isAdmin={isAdmin} />} />
          <Route path="/event/:id" element={<EventDetailPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
