import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Banner } from '../components/Banner';
import {
  fetchBoardCategories,
  fetchPosts,
  fetchNotices,
  type BoardCategory,
  type Post,
  type SortType,
} from '../services/communityService';
import './CommunityPage.css';

export function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Post[]>([]); // 공지사항 목록
  const [loading, setLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortType, setSortType] = useState<SortType>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 게시판 카테고리 로드
  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);
        console.log('[CommunityPage] 카테고리 로딩 시작...');
        const data = await fetchBoardCategories();
        console.log('[CommunityPage] 카테고리 로드 성공:', data);
        setCategories(data);
        
        if (!data || data.length === 0) {
          console.warn('[CommunityPage] ⚠️ 카테고리 데이터가 없습니다. 데이터베이스를 확인하세요.');
          setCategoriesError('카테고리를 불러올 수 없습니다. 관리자에게 문의하세요.');
        }
      } catch (error: any) {
        console.error('[CommunityPage] ❌ 카테고리 로드 실패:', error);
        console.error('[CommunityPage] 에러 상세:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setCategoriesError(error.message || '카테고리 로드 실패');
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  // 공지사항 로드
  useEffect(() => {
    async function loadNotices() {
      if (authLoading) return;
      
      try {
        setNoticesLoading(true);
        const data = await fetchNotices({
          board_category_id: selectedCategory,
          limit: 5,
        });
        setNotices(data);
      } catch (error) {
        console.error('Failed to load notices:', error);
        setNotices([]);
      } finally {
        setNoticesLoading(false);
      }
    }
    loadNotices();
  }, [selectedCategory, authLoading]);

  // 게시글 로드 (공지사항 제외)
  useEffect(() => {
    async function loadPosts() {
      if (authLoading) return;
      
      try {
        setLoading(true);
        const { posts: data, total } = await fetchPosts({
          board_category_id: selectedCategory,
          sort: sortType,
          page,
          limit: ITEMS_PER_PAGE,
          search: searchQuery,
          includeNotices: false, // 공지사항 제외
        });
        setPosts(data);
        setTotalPosts(total);
      } catch (error) {
        console.error('Failed to load posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, [selectedCategory, sortType, page, searchQuery, authLoading]);

  // 상대 시간 표시 (예: "5분 전", "2시간 전")
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  };

  const totalPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);

  // 로그인하지 않은 사용자는 렌더링하지 않음
  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="community-page">
      {/* 메인 컨텐츠 래퍼 (HomePage와 동일한 구조) */}
      <div className="main-content-wrapper">
        {/* 왼쪽 사이드바 - 게시판 카테고리 */}
        <aside className="filter-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">게시판</h3>
            
            {categoriesLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                로딩 중...
              </div>
            ) : categoriesError ? (
              <div style={{ padding: '20px', color: '#ff4444' }}>
                <p>⚠️ {categoriesError}</p>
                <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
                  F12를 눌러 콘솔을 확인하거나<br/>
                  COMMUNITY_TROUBLESHOOTING.md를 참고하세요.
                </p>
              </div>
            ) : categories.length === 0 ? (
              <div style={{ padding: '20px', color: '#ff9800' }}>
                <p>📋 카테고리가 없습니다.</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  데이터베이스 설정이 필요합니다.
                </p>
              </div>
            ) : (
              <div className="board-category-list">
                {categories.map(category => (
                  <div key={category.id}>
                    {!category.is_active ? (
                      // 분류 헤더 (is_active = false, 클릭 불가능)
                      <div style={{
                        padding: '0.5rem 1rem',
                        marginTop: '0.5rem',
                        marginBottom: '0.25rem',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        color: '#4A90E2',
                        borderBottom: '2px solid #E3F2FD',
                        background: '#F5F9FF'
                      }}>
                        {category.icon} {category.name}
                      </div>
                    ) : (
                      // 일반 게시판 버튼 (is_active = true, 클릭 가능)
                      <button
                        className={`filter-btn-sidebar ${selectedCategory === category.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setPage(1);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          justifyContent: 'flex-start',
                          padding: '0.3rem 1rem'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{category.icon}</span>
                        <span>{category.name}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* 메인 콘텐츠 영역 (배너 + 게시글 목록) */}
        <div className="events-container">
          {/* 배너 영역 (HomePage와 동일) */}
          <div className="banner-section">
            <Banner announcementCategory="community" />
          </div>

          {/* 상단 검색 및 글쓰기 */}
          <div className="community-header" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
            <div className="search-write-row" style={{ 
              display: 'flex', 
              gap: '1rem', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div className="search-container" style={{ 
                position: 'relative', 
                flex: 1,
                maxWidth: '400px'
              }}>
                <input
                  type="text"
                  placeholder="제목 + 내용 검색"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="search-input-sidebar"
                  style={{ width: '100%' }}
                />
                {searchQuery && (
                  <button 
                    className="search-clear-sidebar"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {user && (
                <button className="write-button" style={{
                  padding: '0.75rem 1.5rem',
                  background: '#4A90E2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s'
                }}>
                  ✏️ 글쓰기
                </button>
              )}
            </div>
            
            {/* 정렬 옵션 */}
            <div className="sort-options" style={{
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button
                className={`filter-btn-sidebar ${sortType === 'latest' ? 'active' : ''}`}
                onClick={() => {
                  setSortType('latest');
                  setPage(1);
                }}
              >
                최신순
              </button>
              <button
                className={`filter-btn-sidebar ${sortType === 'popular' ? 'active' : ''}`}
                onClick={() => {
                  setSortType('popular');
                  setPage(1);
                }}
              >
                인기순
              </button>
              <button
                className={`filter-btn-sidebar ${sortType === 'views' ? 'active' : ''}`}
                onClick={() => {
                  setSortType('views');
                  setPage(1);
                }}
              >
                조회순
              </button>
            </div>
          </div>

          {/* 공지사항 영역 */}
          {!noticesLoading && notices.length > 0 && (
            <div className="notices-section" style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                fontSize: '1.2rem', 
                fontWeight: '700',
                color: '#333',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📌 커뮤니티 공지사항
              </h2>
              <div className="notices-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {notices.map(notice => (
                  <div key={notice.id} className="notice-card" style={{
                    background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF3D6 100%)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(255, 193, 7, 0.15)',
                    border: '1px solid #FFE082',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      background: '#FF6B35',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      boxShadow: '0 2px 4px rgba(255, 107, 53, 0.3)'
                    }}>
                      공지
                    </div>
                    <div style={{ paddingLeft: '3.5rem' }}>
                      <h3 style={{
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '0.5rem'
                      }}>
                        {notice.title}
                      </h3>
                      <div className="notice-meta" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#666'
                      }}>
                        <span>
                          {notice.author_nickname || notice.author_email?.split('@')[0]}
                        </span>
                        <span>•</span>
                        <span>{getRelativeTime(notice.created_at)}</span>
                        <span>•</span>
                        <span>👁️ {notice.view_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 게시글 목록 */}
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '4rem',
              color: '#666'
            }}>
              로딩 중...
            </div>
          ) : posts.length === 0 && notices.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</p>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>
                아직 게시글이 없습니다.
              </p>
              {user && (
                <p style={{ color: '#999', marginTop: '0.5rem' }}>
                  첫 게시글을 작성해보세요!
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="posts-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {posts.map(post => (
                  <div key={post.id} className="post-card" style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}>
                    <div className="post-header">
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '0.5rem'
                      }}>
                        {post.title}
                      </h3>
                      <div className="post-meta" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#999'
                      }}>
                        <span>
                          {post.author_nickname || post.author_email?.split('@')[0]}
                        </span>
                        <span>•</span>
                        <span>{getRelativeTime(post.created_at)}</span>
                      </div>
                    </div>
                    <p style={{
                      color: '#666',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      marginTop: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {post.content.length > 200
                        ? `${post.content.substring(0, 200)}...`
                        : post.content}
                    </p>
                    <div className="post-stats" style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.9rem',
                      color: '#999'
                    }}>
                      <span>👁️ {post.view_count}</span>
                      <span>❤️ {post.like_count}</span>
                      <span>💬 {post.comment_count}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '2rem',
                  padding: '1rem'
                }}>
                  <button
                    className="pagination-btn"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      background: page === 1 ? '#e0e0e0' : '#4A90E2',
                      color: page === 1 ? '#999' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    이전
                  </button>
                  <span style={{ color: '#666', fontWeight: '500' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '0.5rem 1rem',
                      background: page === totalPages ? '#e0e0e0' : '#4A90E2',
                      color: page === totalPages ? '#999' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
