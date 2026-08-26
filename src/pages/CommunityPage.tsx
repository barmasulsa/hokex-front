import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { useAuth } from '../contexts/AuthContext';
import { getBoardCategories, getPinnedPosts, getPosts, type BoardCategory, type Post } from '../services/communityService';
import './CommunityPage.css';

const relativeTime = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days < 1 ? new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : days < 7 ? `${days}일 전` : new Date(value).toLocaleDateString('ko-KR');
};
const formatDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');

function PostRow({ post, notice = false }: { post: Post; notice?: boolean }) {
  return <Link to={`/community/${post.id}`} className={notice ? 'community-table-row notice-row' : 'community-table-row'}>
    <span className="post-number">{notice ? '공지' : ''}</span>
    <span className="post-title-cell">{notice && <b className="notice-pill">공지</b>}{post.title}{post.comment_count > 0 && <em>[{post.comment_count}]</em>}</span>
    <span>{post.author_nickname || '익명 판다'}</span>
    <span>{notice ? formatDate(post.created_at) : relativeTime(post.created_at)}</span>
    <span>{post.view_count.toLocaleString()}</span><span>{post.like_count}</span>
  </Link>;
}

export function CommunityPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Post[]>([]);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'latest' | 'popular' | 'views'>('latest');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBoardCategories().then(setCategories).catch(() => setError('게시판 분류를 불러오지 못했습니다.'));
    getPinnedPosts().then(setNotices).catch(() => undefined);
  }, []);
  useEffect(() => {
    setLoading(true); setError('');
    getPosts({ board_category_id: category, sort_by: sort, page, page_size: 15, search_query: submittedSearch, exclude_pinned: true })
      .then(({ posts: nextPosts, total_count }) => { setPosts(nextPosts); setTotal(total_count); })
      .catch(() => setError('게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, [category, sort, page, submittedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / 15));
  const selectCategory = (id: string) => { setCategory(id); setPage(1); };
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search); };

  return <main className="community-page">
    <div className="community-layout">
      <aside className="community-sidebar"><strong>게시판</strong><button className={category === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>전체 글</button>
        {categories.map(item => item.is_active ? <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => selectCategory(item.id)}>{item.icon} {item.name}</button> : <div key={item.id} className="community-category-heading">{item.icon} {item.name}</div>)}
      </aside>
      <section className="community-content">
        <div className="community-banner-area"><Banner announcementCategory="community" /></div>
        <div className="community-toolbar"><form onSubmit={submitSearch}><input value={search} onChange={event => setSearch(event.target.value)} placeholder="제목 또는 내용 검색" /><button type="submit">검색</button></form>
          <div>{(['latest', 'popular', 'views'] as const).map(item => <button key={item} className={sort === item ? 'sort-active' : ''} onClick={() => { setSort(item); setPage(1); }}>{item === 'latest' ? '최신순' : item === 'popular' ? '인기순' : '조회순'}</button>)}<button className="write-button" onClick={() => !user ? navigate('/login') : !userProfile?.nickname ? navigate('/profile?setup=nickname&reason=write') : navigate('/community/write')}>✏️ 글쓰기</button></div>
        </div>
        <div className="community-table"><div className="community-table-header"><span>번호</span><span>제목</span><span>작성자</span><span>작성일</span><span>조회</span><span>좋아요</span></div>
          {notices.map(post => <PostRow key={post.id} post={post} notice />)}
          {loading ? <div className="community-empty">게시글을 불러오는 중입니다.</div> : error ? <div className="community-empty">{error}</div> : posts.length === 0 ? <div className="community-empty">아직 게시글이 없습니다. 첫 글을 작성해 보세요.</div> : posts.map(post => <PostRow key={post.id} post={post} />)}
        </div>
        {totalPages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(value => value + 1)}>다음</button></div>}
        <p className="community-page-note">일반 게시글은 공지글을 제외하고 한 페이지에 15개씩 표시됩니다. 최신 글이 1페이지 맨 위에 표시됩니다.</p>
      </section>
    </div>
  </main>;
}
