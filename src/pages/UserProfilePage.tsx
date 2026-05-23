import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchSavedEvents } from '../services/eventService';
import type { EventRecord } from '../types/core';
import { Heart, Bell, Shield, Mail, User as UserIcon, Key } from 'lucide-react';

export function UserProfilePage() {
  const { user, userProfile, updatePassword, updateNickname, isAdmin } = useAuth();
  
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isSettingNickname, setIsSettingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // 저장된 행사 목록
  const [savedEvents, setSavedEvents] = useState<EventRecord[]>([]);
  const [loadingSavedEvents, setLoadingSavedEvents] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 4;
  
  // Notification settings
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [directMessages, setDirectMessages] = useState(true);

  // Interest tags
  const [interests] = useState(['Architectural Design', 'MICE Logistics', 'Smart Venues']);

  // 저장된 행사 가져오기
  useEffect(() => {
    async function loadSavedEvents() {
      if (!user) return;
      
      setLoadingSavedEvents(true);
      const events = await fetchSavedEvents(user.id);
      setSavedEvents(events); // 전체 저장
      setLoadingSavedEvents(false);
    }
    
    loadSavedEvents();
  }, [user]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(savedEvents.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = savedEvents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 스크롤을 섹션 상단으로 이동
    document.querySelector('.profile-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveAccount = () => {
    alert('계정 정보가 저장되었습니다');
  };

  const handleSetPassword = async () => {
    setPasswordError('');

    // 유효성 검사
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다');
      return;
    }

    try {
      await updatePassword(newPassword);
      alert('✅ 비밀번호가 설정되었습니다!\n\n다음부터는 이메일과 비밀번호로 바로 로그인할 수 있습니다.');
      setIsSettingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error setting password:', error);
      setPasswordError('비밀번호 설정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSetNickname = async () => {
    setNicknameError('');

    // 유효성 검사
    if (!nicknameInput) {
      setNicknameError('닉네임을 입력해주세요');
      return;
    }

    // 공백만 입력한 경우 체크
    if (nicknameInput.trim() === '') {
      setNicknameError('공백으로 구성된 닉네임은 사용하실 수 없습니다');
      return;
    }

    // 금지된 닉네임 목록 체크 (판다 붙인 후 체크, 관리자 제외)
    const nicknameWithPanda = nicknameInput + '판다';
    const forbiddenNicknames = ['판다', '카페인판다', '슬픈 판다', '슬픈판다'];
    
    // hokex 포함 여부 체크 (대소문자 구분 없이)
    const containsHokex = nicknameWithPanda.toLowerCase().includes('hokex') || 
                          nicknameWithPanda.includes('호켁스');
    
    if (!isAdmin && (forbiddenNicknames.includes(nicknameWithPanda) || containsHokex)) {
      setNicknameError('해당 닉네임은 사용하실 수 없습니다');
      return;
    }

    if (nicknameInput.length > 20) {
      setNicknameError('닉네임은 20자 이하로 입력해주세요');
      return;
    }

    try {
      await updateNickname(nicknameInput);
      const finalNickname = nicknameInput + '판다';
      alert(`✅ 닉네임이 "${finalNickname}"로 설정되었습니다!`);
      setIsSettingNickname(false);
      setNicknameInput('');
    } catch (error: any) {
      console.error('Error setting nickname:', error);
      if (error.message === 'NICKNAME_TAKEN') {
        setNicknameError(`"${nicknameInput}판다"는 이미 사용 중인 닉네임입니다.`);
      } else if (error.message === 'INVALID_NICKNAME_WHITESPACE') {
        setNicknameError('공백으로 구성된 닉네임은 사용하실 수 없습니다');
      } else if (error.message === 'INVALID_NICKNAME') {
        setNicknameError('해당 닉네임은 사용하실 수 없습니다');
      } else {
        setNicknameError('닉네임 설정에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleDeactivate = () => {
    if (confirm('정말로 계정을 비활성화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      alert('계정이 비활성화되었습니다');
    }
  };

  // 비밀번호 설정 여부 확인 (Supabase는 매직 링크로 로그인한 경우 비밀번호가 없을 수 있음)
  const hasPassword = user?.app_metadata?.provider === 'email' && user?.user_metadata?.email_verified;

  return (
    <div className="user-profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            <UserIcon size={48} />
          </div>
          <div className="avatar-badge">✓</div>
        </div>
        <div className="profile-info">
          <h1>{userProfile?.nickname || user?.email?.split('@')[0] || 'User'}</h1>
          <p className="profile-title">HOKEX 구독자 • {user?.email}</p>
          <div className="profile-interests">
            {interests.map(interest => (
              <span key={interest} className="interest-tag">{interest}</span>
            ))}
            <button className="btn-add-interest">+ Add Interest</button>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-view-bio">View Public Bio</button>
        </div>
      </div>

      <div className="profile-content">
        {/* Main Content */}
        <div className="profile-main">

          {/* 닉네임 설정 폼 */}
          {isSettingNickname && (
            <section className="profile-section" style={{ marginBottom: '24px' }}>
              <h2>🐼 판다 닉네임 설정</h2>
              
              {/* 파란색 안내 박스 */}
              <div style={{
                background: '#e7f3ff',
                border: '1px solid #2196F3',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1976D2', fontSize: '16px' }}>
                  💡 닉네임 설정 방법
                </h3>
                <p style={{ margin: '0 0 8px 0', color: '#1565C0', fontSize: '14px' }}>
                  모든 닉네임은 자동으로 "판다"로 끝납니다. 띄어쓰기는 자유롭게 선택할 수 있어요!
                </p>
                <div style={{ fontSize: '14px', color: '#1565C0' }}>
                  <strong>예시:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                    <li>"레서" 입력 → <strong>레서판다</strong> (붙여쓰기)</li>
                    <li>"레서 " 입력 → <strong>레서 판다</strong> (띄어쓰기)</li>
                    <li>"대나무 먹는 " 입력 → <strong>대나무 먹는 판다</strong></li>
                  </ul>
                </div>
              </div>

              <div className="account-settings">
                <div className="setting-row">
                  <label>닉네임</label>
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="예: 레서, 레서 , 대나무 먹는 "
                    className="setting-input"
                    maxLength={20}
                  />
                </div>
                {nicknameInput && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '12px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}>
                    <strong>미리보기:</strong> {nicknameInput}판다
                  </div>
                )}
                {nicknameError && (
                  <div style={{ color: '#dc3545', marginTop: '8px' }}>
                    {nicknameError}
                  </div>
                )}
                <div className="setting-actions">
                  <button 
                    className="btn-cancel"
                    onClick={() => {
                      setIsSettingNickname(false);
                      setNicknameInput('');
                      setNicknameError('');
                    }}
                  >
                    취소
                  </button>
                  <button className="btn-save" onClick={handleSetNickname}>
                    닉네임 설정
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 비밀번호 미설정 안내 */}
          {!hasPassword && !isSettingPassword && (
            <div className="password-setup-notice" style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} />
                💡 비밀번호를 설정하세요
              </h3>
              <p style={{ margin: '0 0 12px 0', color: '#856404' }}>
                비밀번호를 설정하면 다음부터 이메일 링크 없이 바로 로그인할 수 있습니다.
              </p>
              <button 
                onClick={() => setIsSettingPassword(true)}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                비밀번호 설정하기
              </button>
            </div>
          )}

          {/* 비밀번호 설정 폼 */}
          {isSettingPassword && (
            <section className="profile-section" style={{ marginBottom: '24px' }}>
              <h2>비밀번호 설정</h2>
              <div className="account-settings">
                <div className="setting-row">
                  <label>새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="최소 6자 이상"
                    className="setting-input"
                  />
                </div>
                <div className="setting-row">
                  <label>비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
                    className="setting-input"
                  />
                </div>
                {passwordError && (
                  <div style={{ color: '#dc3545', marginTop: '8px' }}>
                    {passwordError}
                  </div>
                )}
                <div className="setting-actions">
                  <button 
                    className="btn-cancel"
                    onClick={() => {
                      setIsSettingPassword(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                  >
                    취소
                  </button>
                  <button className="btn-save" onClick={handleSetPassword}>
                    비밀번호 설정
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Saved Events */}
          <section className="profile-section">
            <div className="section-header">
              <h2><Heart size={24} /> Saved/Favorite Events</h2>
              <p className="section-subtitle">
                저장한 행사 목록 ({savedEvents.length}개)
              </p>
            </div>
            <div className="saved-events-grid">
              {loadingSavedEvents ? (
                <p>저장된 행사를 불러오는 중...</p>
              ) : savedEvents.length === 0 ? (
                <p>저장된 행사가 없습니다</p>
              ) : (
                currentEvents.map(event => (
                  <Link key={event.id} to={`/event/${event.id}`} className="saved-event-card">
                    {event.poster && (
                      <img src={event.poster} alt={event.title} referrerPolicy="no-referrer" />
                    )}
                    <button className="saved-event-heart">
                      <Heart size={20} fill="currentColor" />
                    </button>
                    <div className="saved-event-info">
                      <span className="saved-event-category">
                        {Array.isArray(event.category) ? event.category[0] : event.category}
                      </span>
                      <span className="saved-event-date">
                        {event.startDate.toISOString().slice(5, 10).replace('-', '.')}
                      </span>
                      <h3>{event.title}</h3>
                      <p><span style={{ marginRight: '4px' }}>📍</span>{event.venue}, {event.region}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            
            {/* 페이지네이션 */}
            {!loadingSavedEvents && savedEvents.length > eventsPerPage && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ 이전
                </button>
                
                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음 ›
                </button>
              </div>
            )}
          </section>

          {/* Account Settings */}
          <section className="profile-section">
            <h2>Account Settings</h2>
            <div className="account-settings">
              <div className="setting-row">
                <label>
                  <UserIcon size={20} />
                  닉네임
                </label>
                <div className="setting-value">
                  {userProfile?.nickname || '닉네임 미설정'}
                  <button 
                    className="btn-change"
                    onClick={() => setIsSettingNickname(true)}
                  >
                    {userProfile?.nickname ? 'CHANGE' : 'SET'}
                  </button>
                </div>
              </div>
              <div className="setting-row">
                <label>
                  <Mail size={20} />
                  Email Address
                </label>
                <div className="setting-value">
                  {user?.email}
                  <span className="verified-badge">✓</span>
                </div>
              </div>
              {hasPassword && (
                <div className="setting-row">
                  <label>Current Password</label>
                  <div className="setting-value">
                    ••••••••••••
                    <button 
                      className="btn-change"
                      onClick={() => setIsSettingPassword(true)}
                    >
                      CHANGE
                    </button>
                  </div>
                </div>
              )}
              <div className="setting-actions">
                <button className="btn-cancel">Cancel Changes</button>
                <button className="btn-save" onClick={handleSaveAccount}>
                  Save Account Details
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="profile-sidebar">
          {/* Notifications */}
          <div className="sidebar-card">
            <h3><Bell size={20} /> Notifications (미기능)</h3>
            <div className="notification-settings">
              <div className="notification-item">
                <div>
                  <h4>Event Reminders</h4>
                  <p>Before saved events start</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={eventReminders}
                    onChange={(e) => setEventReminders(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <div>
                  <h4>Marketing Emails</h4>
                  <p>Weekly curation of new shows</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <div>
                  <h4>Direct Messages</h4>
                  <p>From exhibitors or organizers</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={directMessages}
                    onChange={(e) => setDirectMessages(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Security & Danger Zone */}
          <div className="sidebar-card danger-zone">
            <h3><Shield size={20} /> SECURITY & DANGER ZONE</h3>
            <p className="danger-warning">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="btn-deactivate" onClick={handleDeactivate}>
              Deactivate Account
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
