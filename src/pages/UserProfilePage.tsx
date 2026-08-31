import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchSavedEvents, unsaveEvent } from '../services/eventService';
import { deletePost, getMyPosts, type Post } from '../services/communityService';
import type { EventRecord } from '../types/core';
import { Heart, Bell, Mail, User as UserIcon, Key } from 'lucide-react';

export function UserProfilePage() {
  const { user, userProfile, updatePassword, updateNickname, resetNickname, isAdmin, linkNaverIdentity } = useAuth();
  const [searchParams] = useSearchParams();
  const nicknameRequiredForWriting = searchParams.get('reason') === 'write';
  
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isSettingNickname, setIsSettingNickname] = useState(() => searchParams.get('setup') === 'nickname');
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [linkingNaver, setLinkingNaver] = useState(false);
  
  // 저장된 행사 목록
  const [savedEvents, setSavedEvents] = useState<EventRecord[]>([]);
  const [loadingSavedEvents, setLoadingSavedEvents] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 4;
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(true);
  
  // Notification settings
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [directMessages, setDirectMessages] = useState(true);

  // Interest tags
  const [interests] = useState(['Architectural Design', 'MICE Logistics', 'Smart Venues']);
  const naverLinked = user?.identities?.some(identity => identity.provider === 'custom:naver') ?? false;

  const handleLinkNaver = async () => {
    setLinkingNaver(true);
    try {
      await linkNaverIdentity();
    } catch (error) {
      setLinkingNaver(false);
      const detail = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`네이버 계정 연결을 시작하지 못했습니다.\n${detail}`);
    }
  };

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

  useEffect(() => {
    if (!user) return;
    setLoadingMyPosts(true);
    getMyPosts(user.id).then(setMyPosts).catch(() => setMyPosts([])).finally(() => setLoadingMyPosts(false));
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

  const handleUnsaveEvent = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation(); // 이벤트 버블링 방지
    
    if (!user) return;
    
    const success = await unsaveEvent(user.id, eventId);
    
    if (success) {
      // 로컬 상태에서 해당 행사 제거
      const newSavedEvents = savedEvents.filter(event => event.id !== eventId);
      setSavedEvents(newSavedEvents);
      
      // 현재 페이지에 행사가 없어지면 이전 페이지로 이동
      const newTotalPages = Math.ceil(newSavedEvents.length / eventsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } else {
      alert('❌ 찜 해제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDeleteMyPost = async (post: Post) => {
    if (!confirm(`글번호 ${post.post_number}번 글을 삭제할까요?`)) return;
    try {
      await deletePost(post.id);
      setMyPosts(items => items.filter(item => item.id !== post.id));
    } catch {
      alert('게시글을 삭제하지 못했습니다.');
    }
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

    // 특수문자 체크 (한글, 영문, 숫자, 공백만 허용)
    const specialCharRegex = /[^가-힣a-zA-Z0-9\s]/;
    if (specialCharRegex.test(nicknameInput)) {
      setNicknameError('닉네임에는 특수문자를 사용할 수 없습니다 (한글, 영문, 숫자, 공백만 가능)');
      return;
    }

    // 금지된 닉네임 목록 체크 (판다 붙인 후 체크, 관리자 제외)
    const nicknameWithPanda = nicknameInput + '판다';
    const forbiddenNicknames = [
      '판다', '카페인판다', 
      '슬픈 판다', '슬픈판다', 
      '무명의 판다', '무명의판다', 
      '이름없는 판다', '이름없는판다', 
      '이름 없는 판다', '이름 없는판다', 
      '관리자 판다', '관리자판다', 
      '매니저 판다', '매니저판다', 
      '부매니저 판다', '부매니저판다', 
      '부 매니저 판다', '부 매니저판다',
      // 1급~9급
      '1급 판다', '1급판다',
      '2급 판다', '2급판다',
      '3급 판다', '3급판다',
      '4급 판다', '4급판다',
      '5급 판다', '5급판다',
      '6급 판다', '6급판다',
      '7급 판다', '7급판다',
      '8급 판다', '8급판다',
      '9급 판다', '9급판다',
      // 정부 직책
      '대통령 판다', '대통령판다',
      '부통령 판다', '부통령판다',
      '국무총리 판다', '국무총리판다',
      '부총리 판다', '부총리판다',
      '장관 판다', '장관판다',
      '처장 판다', '처장판다',
      '청장 판다', '청장판다',
      '차관 판다', '차관판다',
      // 공무원 직급 (직급명만)
      '관리관 판다', '관리관판다',
      '이사관 판다', '이사관판다',
      '부이사관 판다', '부이사관판다',
      '서기관 판다', '서기관판다',
      '사무관 판다', '사무관판다',
      '주사 판다', '주사판다',
      '주사보 판다', '주사보판다',
      '서기 판다', '서기판다',
      '서기보 판다', '서기보판다',
      // 공무원 직급 (급수 + 직급명)
      '1급 관리관 판다', '1급 관리관판다', '1급관리관 판다', '1급관리관판다',
      '2급 이사관 판다', '2급 이사관판다', '2급이사관 판다', '2급이사관판다',
      '3급 부이사관 판다', '3급 부이사관판다', '3급부이사관 판다', '3급부이사관판다',
      '4급 서기관 판다', '4급 서기관판다', '4급서기관 판다', '4급서기관판다',
      '5급 사무관 판다', '5급 사무관판다', '5급사무관 판다', '5급사무관판다',
      '6급 주사 판다', '6급 주사판다', '6급주사 판다', '6급주사판다',
      '7급 주사보 판다', '7급 주사보판다', '7급주사보 판다', '7급주사보판다',
      '8급 서기 판다', '8급 서기판다', '8급서기 판다', '8급서기판다',
      '9급 서기보 판다', '9급 서기보판다', '9급서기보 판다', '9급서기보판다'
    ];
    
    // hokex 포함 여부 체크 (대소문자 구분 없이)
    const containsHokex = nicknameWithPanda.toLowerCase().includes('hokex') || 
                          nicknameWithPanda.includes('호켁스');
    
    if (!isAdmin && (forbiddenNicknames.includes(nicknameWithPanda) || containsHokex)) {
      setNicknameError('해당 닉네임은 추후 커뮤니티 용도로 활용될 가능성이 있는 닉네임으로 양해해주시기를 바랍니다.');
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

  const handleResetNickname = async () => {
    if (!confirm('⚠️ 닉네임을 초기화하시겠습니까?\n\n초기화하면 닉네임이 이메일 앞자리로 표시됩니다.')) {
      return;
    }

    try {
      await resetNickname();
      alert('✅ 닉네임이 초기화되었습니다!');
    } catch (error: any) {
      console.error('Error resetting nickname:', error);
      alert('❌ 닉네임 초기화에 실패했습니다. 다시 시도해주세요.');
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
          <p className="profile-title">HOKEX 회원 • {user?.email}</p>
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

          {/* 닉네임 미설정 안내 - 최상단에 배치 */}
          {!userProfile?.nickname && !isSettingNickname && (
            <div className="nickname-setup-notice" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: '3px solid #5a67d8',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                🐼 판다 닉네임을 설정해보세요!
              </h3>
              <p style={{ 
                margin: '0 0 16px 0', 
                color: 'rgba(255, 255, 255, 0.95)', 
                lineHeight: '1.6',
                fontSize: '15px'
              }}>
                닉네임은 커뮤니티와 향후 이벤트 기능에서 사용됩니다. 
                중복 닉네임은 설정이 불가하니 사람이 없는 초기에 멋있는 닉네임을 미리 선점하세요! :)
              </p>
              <button 
                onClick={() => setIsSettingNickname(true)}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                닉네임 설정하기 →
              </button>
            </div>
          )}

          {/* My activity */}
          <section className="profile-section my-activity-section">
            <div className="section-header">
              <h2>✍️ 나의 활동</h2>
              <p className="section-subtitle">내가 작성한 게시글 ({myPosts.length}개)</p>
            </div>
            {loadingMyPosts ? <p>작성한 글을 불러오는 중...</p> : myPosts.length === 0 ? <p>아직 작성한 글이 없습니다.</p> : <div className="my-post-list">
              {myPosts.map(post => <div key={post.id} className="my-post-item">
                <Link to={`/community/${post.id}`}><span className="my-post-number">#{post.post_number}</span><span className="my-post-title">{post.title}</span>{!post.is_public && <span className="my-post-private">비공개</span>}</Link>
                <div className="my-post-meta"><span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span><span>조회 {post.view_count}</span><Link to={`/community/${post.id}/edit`}>수정</Link><button type="button" onClick={() => handleDeleteMyPost(post)}>삭제</button></div>
              </div>)}
            </div>}
          </section>

          {/* Saved Events */}
          <section className="profile-section">
            <div className="section-header">
              <h2><Heart size={24} fill="currentColor" /> Saved/Favorite Events</h2>
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
                    <button 
                      className="saved-event-heart"
                      onClick={(e) => handleUnsaveEvent(event.id, e)}
                      title="찜 해제"
                    >
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

          {/* 닉네임 설정 폼 */}
          {isSettingNickname && (
            <section className="profile-section" style={{ marginBottom: '24px' }}>
              <h2>🐼 판다 닉네임 설정</h2>
              {nicknameRequiredForWriting && <p style={{ margin: '0 0 16px', padding: '12px 14px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412', fontWeight: 700 }}>게시물 작성은 닉네임을 설정해야 가능합니다.</p>}
              
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

              {/* 주의사항 박스 */}
              <div style={{
                background: '#fff9e6',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#f57c00', fontSize: '16px' }}>
                  ⚠️ 주의사항
                </h3>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#e65100', fontSize: '14px', lineHeight: '1.6' }}>
                  <li>특정 조직의 이름을 넣은 닉네임(전시장, 기관, 업체 등)과 타인에게 불쾌감을 유발하는 닉네임은 삼가해주시길 바랍니다.</li>
                  <li>닉네임은 일반적인 상식선에서 작성해주시길 바랍니다.</li>
                  <li style={{ marginTop: '8px' }}>
                    현재 닉네임은 사용처가 딱히 없으나 미래에는 사용될 수 있으니 (이벤트 추첨, 커뮤니티 기능 등) 미리 마련해두는 게 좋을 거 같아 만들었습니다. 
                    해당 기능은 닉네임을 작명했을 때만 사용할 수 있게 할 예정입니다. 
                    중복 닉네임은 설정이 불가하오니 사람이 없는 초기에, 멋있는 닉네임을 미리 선점하시길 권유드립니다 :)
                  </li>
                </ul>
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-change"
                      onClick={() => setIsSettingNickname(true)}
                    >
                      {userProfile?.nickname ? 'CHANGE' : 'SET'}
                    </button>
                    {userProfile?.nickname && (
                      <button 
                        className="btn-change"
                        onClick={handleResetNickname}
                        style={{ background: '#dc3545' }}
                      >
                        RESET
                      </button>
                    )}
                  </div>
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
              <div className="setting-row">
                <label>네이버 로그인</label>
                <div className="setting-value">
                  {naverLinked ? <><span className="verified-badge">✓</span> 연결됨</> : '연결되지 않음'}
                  {!naverLinked && <button className="btn-change" disabled={linkingNaver} onClick={handleLinkNaver}>{linkingNaver ? '연결 중…' : '네이버 계정 연결'}</button>}
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

          <div className="sidebar-card">
            <h3><Mail size={20} /> 카페인판다 뉴스레터</h3>
            <p>호켁스 계정과 뉴스레터는 별도입니다. 구독 여부와 관계없이 계정과 저장한 행사는 유지됩니다.</p>
            <a className="btn-deactivate" href="https://page.stibee.com/subscriptions/289942" target="_blank" rel="noreferrer">뉴스레터 구독하기</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
