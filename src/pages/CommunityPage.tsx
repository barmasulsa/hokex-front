import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { useAuth } from '../contexts/AuthContext';
import { deleteCommunityBoardCategory, deletePost, getBestPosts, getBoardCategories, getPinnedPosts, getPostLikeStatus, getPosts, reorderCommunityBoardCategories, saveCommunityBoardCategory, togglePostLike, type BoardCategory, type BoardCategoryDraft, type Post } from '../services/communityService';
import './CommunityPage.css';

const relativeTime = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days < 1 ? new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : days < 7 ? `${days}일 전` : new Date(value).toLocaleDateString('ko-KR');
};
const formatDate = (value: string) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');

// DB에 저장된 기존 명칭도 화면에서는 새 공식 명칭으로 일관되게 표시한다.
const boardLabel = (name?: string) => name === '마이스인' ? 'MICE人(마이스인)' : name || '전체 글';
const firstContentImage = (content: string) => {
  const matched = content.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  return matched?.[1] || null;
};

const BOARD_DESCRIPTIONS: Record<string, string> = {
  '전체 글': '호켁스의 커뮤니티는 MICE 관련 중심의 게시글이 중심이 되어야 합니다.',
  '베스트 게시판': '다른 게시판에서 반응이 높은 글을 자동으로 모아 보여드립니다.',
  '자유게시판': '판다 여러분들의 일상에서의 자유로운 글들을 남겨주세요.\n※ 정치/광고/홍보/분란 등의 글 엄히 금지',
  '질문게시판': 'MICE 산업과 연관 및 연계될 수 있는 산업, 직종, 전망, 정보 등등의 질문 게시판입니다.',
  '뉴스게시판': 'MICE 산업과 연관 및 연계될 수 있는 언론사의 뉴스 게시판입니다.\n제목 양식은, 기사 제목 <언론사명>으로(예시: 호켁스 탄생하다! <호켁스>) 저작권 문제로 게시글 클릭 시 URL 연동으로 되어있습니다.',
  '정보(소식)게시판': 'MICE 산업과 연관 및 연계될 수 있는 유용한 정보(소식) 게시판이며 근거 및 출처가 있어야 합니다.',
  '공모전 게시판': 'MICE 산업과 연관 및 연계될 수 있는 공모전 게시판입니다.',
  '논문/설문 게시판': 'MICE와 연관 및 연계될 수 있는 논문/설문 게시판입니다.',
  'MICE협회': 'MICE 협회의 소식 및 정보를 전해주는 게시판입니다.',
  '마이스인': '마이스인의 소식 및 정보를 전해주는 게시판입니다.',
  'MICE人(마이스인)': '마이스인의 소식 및 정보를 전해주는 게시판입니다.',
  'AKEI 한국전시산업진흥회': 'AKEI 한국전시산업진흥회의 소식 및 정보를 전해주는 게시판입니다.',
  '전통공연예술진흥재단': '전통공연예술진흥재단의 소식 및 정보를 전해주는 게시판입니다.',
  '채용/인턴': 'MICE 산업과 연관 및 연계될 수 있는 직종의 장기 인력 모집 게시판입니다.',
  '스태프/단기 알바': 'MICE 산업과 연관 및 연계될 수 있는 단발성 전시, 행사, 활동 등의 인력을 모집하는 게시판입니다.',
  '자원봉사': 'MICE 산업과 연관 및 연계될 수 있는 전시, 행사, 활동 등이면서\n법정 최저임금 미만의 급여를 지급하거나 비대가성의 인력을 모집하는 게시판입니다.',
  '전시': '호켁스에서 “전시”란 주최자가 존재하고 행사가 여러 개의 부스(구조물, 시설 등)로 구성되며 그 부스가 전시의 메인이 되고,\n독립된 부스와 그 부스마다 부스를 운영하는 독립된 업체 등이 있으며,\n참가 티켓이나 참가 신청서 등으로 출입을 통제하는 전시를 의미합니다.',
  '포럼': '포럼 홍보 게시판입니다.',
  '강의&교육': 'MICE 산업과 연관 및 연계가 될 수 있거나 업무, 일상 등에 유용한 강의&교육 홍보 게시판입니다.',
  '공연': '공연(오페라, 연주회, 뮤지컬 등등) 홍보 게시판입니다.',
  '행사/이벤트/팝업': '전시와 포럼에 해당되지 않는 행사/이벤트/팝업 홍보 게시판입니다.',
  '베뉴': '전시, 포럼, 행사, 이벤트, 팝업, 강의, 결혼식 등을 실행할 수 있는 장소를 홍보하는 게시판입니다.',
  '디자인&인쇄&제본': '디자인&인쇄&제본 업체 홍보 게시판입니다.',
  '부스업체': '부스 설비 제작, 부스 운송 등 부스와 관련된 업체 홍보 게시판입니다.',
  '기타': 'MICE 산업과 연관된 업체 홍보 게시판입니다.',
};
const LEGACY_BOARD_DESCRIPTIONS = new Set([
  '인기 게시글 모음', '자유로운 소통 공간', '궁금한 점을 물어보세요', '업계 뉴스 및 소식', '유익한 정보 공유', '공모전 정보', '창작 활동 공유', '학술 논문 및 설문조사',
  'MICE 협회 공지사항', 'MICE 업계 인사이트', '한국전시산업진흥회 관련 정보', '전통 공연 예술 관련', '채용 및 구직 정보', '정규직 및 인턴 채용', '행사 스태프 및 단기 알바', '자원봉사자 모집',
  '행사 및 제품 홍보', '전시회 홍보', '포럼 및 컨퍼런스', '교육 프로그램', '공연 및 공연예술', '각종 행사 및 이벤트', '베뉴 및 장소 홍보', '업체 및 서비스 홍보', '디자인 및 인쇄 서비스', '부스 제작 및 시공', '기타 업체 홍보',
]);

function PostRow({ post, notice = false, sourceBoard, displayNumber, returnCategory, isNewsPost, canManageNews, liked, onLike, onEditNews, onDeleteNews }: { post: Post; notice?: boolean; sourceBoard?: string; displayNumber?: number; returnCategory: string; isNewsPost: boolean; canManageNews: boolean; liked: boolean; onLike: (post: Post) => void; onEditNews: (post: Post) => void; onDeleteNews: (post: Post) => void }) {
  const className = notice ? 'community-table-row notice-row' : 'community-table-row';
  const titleHref = post.link_url || `/community/${post.id}?board=${encodeURIComponent(returnCategory)}`;
  return <div className={className}>
    <span className="post-number">{sourceBoard ? boardLabel(sourceBoard) : notice ? '공지' : (displayNumber ?? post.board_post_number ?? post.post_number)}</span>
    <span className="post-title-cell"><a href={titleHref} className="post-title-link">{notice && <b className="notice-pill">공지</b>}{post.title}{post.link_url && <i className="post-external-link">↗</i>}{post.comment_count > 0 && <em>[{post.comment_count}]</em>}</a>{isNewsPost && canManageNews && <span className="news-row-actions"><button type="button" onClick={() => onEditNews(post)}>수정</button><button type="button" onClick={() => onDeleteNews(post)}>삭제</button></span>}</span>
    <span>{post.author_nickname || '익명 판다'}</span>
    <span>{notice ? formatDate(post.created_at) : relativeTime(post.created_at)}</span>
    <span>{post.view_count.toLocaleString()}</span><span><button type="button" className={liked ? 'post-like-button active' : 'post-like-button'} onClick={() => onLike(post)} aria-label={`${post.title} 좋아요`}>{liked ? '♥' : '♡'} {post.like_count}</button></span>
  </div>;
}

export function CommunityPage() {
  const { user, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const incomingCategory = (location.state as { communityCategory?: string } | null)?.communityCategory;
  const queryCategory = new URLSearchParams(location.search).get('board');
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notices, setNotices] = useState<Post[]>([]);
  const [category, setCategory] = useState(() => queryCategory || incomingCategory || 'all');
  const [sort, setSort] = useState<'latest' | 'popular' | 'views'>('latest');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentBoardIds, setRecentBoardIds] = useState<Set<string>>(new Set());
  const [managedParentId, setManagedParentId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📌', description: '' });
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childNameDraft, setChildNameDraft] = useState('');
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getBoardCategories().then(setCategories).catch(() => setError('게시판 분류를 불러오지 못했습니다.'));
    getPinnedPosts().then(setNotices).catch(() => undefined);
    getPosts({ page_size: 100, exclude_pinned: true }).then(({ posts: recentPosts }) => {
      const since = Date.now() - 72 * 60 * 60 * 1000;
      setRecentBoardIds(new Set(recentPosts.filter(post => new Date(post.created_at).getTime() >= since).map(post => post.board_category_id)));
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    setCategory(queryCategory || incomingCategory || 'all');
    setPage(1);
  }, [queryCategory, incomingCategory]);
  useEffect(() => {
    setLoading(true); setError('');
    const bestBoard = categories.find(item => item.id === category && item.name === '베스트 게시판');
    const request = bestBoard
      ? getBestPosts({ best_category_id: bestBoard.id, sort_by: sort, page, page_size: 15, search_query: submittedSearch })
      : getPosts({ board_category_id: category, sort_by: sort, page, page_size: 15, search_query: submittedSearch, exclude_pinned: true });
    request
      .then(({ posts: nextPosts, total_count }) => { setPosts(nextPosts); setTotal(total_count); })
      .catch(() => setError('게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setLoading(false));
  }, [categories, category, sort, page, submittedSearch, reloadKey]);
  useEffect(() => {
    if (!user) { setLikedPostIds(new Set()); return; }
    const postIds = [...posts, ...notices].map(post => post.id);
    if (!postIds.length) return;
    Promise.all(postIds.map(async id => ({ id, ...(await getPostLikeStatus(id)) })))
      .then(results => setLikedPostIds(new Set(results.filter(item => item.liked).map(item => item.id))))
      .catch(() => undefined);
  }, [user?.id, posts, notices]);

  const totalPages = Math.max(1, Math.ceil(total / 15));
  const selectedBoard = category === 'all' ? null : categories.find(item => item.id === category) ?? null;
  const isBestBoard = selectedBoard?.name === '베스트 게시판';
  const isExhibitionBoard = selectedBoard?.name === '전시';
  const selectedBoardName = boardLabel(selectedBoard?.name);
  const boardDescription = selectedBoard
    ? (selectedBoard.description !== null && !LEGACY_BOARD_DESCRIPTIONS.has(selectedBoard.description) ? selectedBoard.description : BOARD_DESCRIPTIONS[selectedBoard.name] ?? '')
    : BOARD_DESCRIPTIONS['전체 글'];
  const managedParent = categories.find(item => item.id === managedParentId) ?? null;
  const inferredChildren = (parent: BoardCategory) => {
    const index = categories.findIndex(item => item.id === parent.id);
    const following = categories.slice(index + 1);
    const nextSectionIndex = following.findIndex(item => !item.is_active);
    return following.slice(0, nextSectionIndex === -1 ? undefined : nextSectionIndex).filter(item => item.is_active);
  };
  const managedChildren = managedParent ? (() => {
    const direct = categories.filter(item => item.parent_category_id === managedParent.id);
    return direct.length ? direct : inferredChildren(managedParent);
  })() : [];
  const selectCategory = (id: string) => { setCategory(id); setPage(1); };
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search); };
  const openBoardManager = (parentId: string) => { setManagedParentId(parentId); setCategoryMessage(''); setEditingChildId(null); };
  const saveCategory = async (draft: BoardCategoryDraft) => {
    setCategorySaving(true); setCategoryMessage('');
    try { await saveCommunityBoardCategory(draft); setCategories(await getBoardCategories()); setCategoryMessage('저장했습니다.'); }
    catch { setCategoryMessage('저장하지 못했습니다. 관리자 모드와 DB 설정을 확인해 주세요.'); }
    finally { setCategorySaving(false); }
  };
  const addChildCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!managedParent || !newCategory.name.trim()) return;
    await saveCategory({ ...newCategory, parent_category_id: managedParent.id, is_active: true });
    setNewCategory({ name: '', icon: '📌', description: '' });
  };
  const removeChildCategory = async (child: BoardCategory) => {
    if (!window.confirm(`“${boardLabel(child.name)}” 게시판을 삭제할까요? 게시글이 있는 게시판은 삭제할 수 없습니다.`)) return;
    setCategorySaving(true); setCategoryMessage('');
    try { await deleteCommunityBoardCategory(child.id); setCategories(await getBoardCategories()); setCategoryMessage('하위 게시판을 삭제했습니다.'); }
    catch { setCategoryMessage('삭제하지 못했습니다. 게시글이 있는 게시판인지 확인해 주세요.'); }
    finally { setCategorySaving(false); }
  };
  const startChildNameEdit = (child: BoardCategory) => {
    setEditingChildId(child.id);
    setChildNameDraft(boardLabel(child.name));
    setCategoryMessage('');
  };
  const saveChildName = async (child: BoardCategory) => {
    const name = childNameDraft.trim();
    if (!name) { setCategoryMessage('게시판 이름을 입력해 주세요.'); return; }
    await saveCategory({ ...child, name, description: child.description ?? '', parent_category_id: child.parent_category_id, is_active: child.is_active });
    setEditingChildId(null);
  };
  const moveChildCategory = async (child: BoardCategory, direction: -1 | 1) => {
    const currentIndex = managedChildren.findIndex(item => item.id === child.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= managedChildren.length) return;
    const reordered = [...managedChildren];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    setCategorySaving(true); setCategoryMessage('');
    try {
      await reorderCommunityBoardCategories(reordered.map(item => item.id));
      setCategories(await getBoardCategories());
      setCategoryMessage('하위 게시판 순서를 변경했습니다.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      setCategoryMessage(detail ? `순서를 저장하지 못했습니다. ${detail}` : '순서를 저장하지 못했습니다. DB 설정을 확인해 주세요.');
    } finally { setCategorySaving(false); }
  };
  const startDescriptionEdit = () => {
    if (!selectedBoard) return;
    setDescriptionDraft(selectedBoard.description ?? BOARD_DESCRIPTIONS[selectedBoard.name] ?? '');
    setEditingDescription(true);
  };
  const saveDescription = async () => {
    if (!selectedBoard) return;
    await saveCategory({ ...selectedBoard, name: boardLabel(selectedBoard.name), description: descriptionDraft, parent_category_id: selectedBoard.parent_category_id, is_active: selectedBoard.is_active });
    setEditingDescription(false);
  };
  const toggleLikeFromList = async (post: Post) => {
    if (!user) { navigate('/login'); return; }
    try {
      const result = await togglePostLike(post.id);
      const updatePostLike = (item: Post) => item.id === post.id ? { ...item, like_count: result.like_count } : item;
      setPosts(items => items.map(updatePostLike));
      setNotices(items => items.map(updatePostLike));
      setLikedPostIds(items => { const next = new Set(items); if (result.liked) next.add(post.id); else next.delete(post.id); return next; });
    } catch { setError('좋아요를 저장하지 못했습니다.'); }
  };
  const editNewsPost = (post: Post) => navigate(`/community/${post.id}/edit`, { state: { communityCategory: post.board_category_id } });
  const deleteNewsPost = async (post: Post) => {
    if (!window.confirm('이 뉴스 게시글을 삭제할까요?')) return;
    try { await deletePost(post.id); setReloadKey(value => value + 1); }
    catch { setError('작성자만 게시글을 삭제할 수 있습니다.'); }
  };
  const postRowProps = (post: Post, displayNumber: number | undefined, sourceBoard?: string, notice = false) => ({ post, notice, returnCategory: category, displayNumber, sourceBoard, isNewsPost: categories.find(item => item.id === post.board_category_id)?.name === '뉴스게시판', canManageNews: post.author_id === user?.id, liked: likedPostIds.has(post.id), onLike: toggleLikeFromList, onEditNews: editNewsPost, onDeleteNews: deleteNewsPost });

  return <main className="community-page">
    <div className="community-layout">
      <aside className="community-sidebar"><strong>게시판</strong><button className={category === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>전체 글</button>
        {categories.map(item => item.is_active ? <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => selectCategory(item.id)}>{item.icon} {boardLabel(item.name)}{recentBoardIds.has(item.id) && <b className="new-post-badge">N</b>}</button> : <button key={item.id} type="button" className={`community-category-heading ${isAdmin ? 'admin-manageable-heading' : ''}`} onClick={() => isAdmin && openBoardManager(item.id)}>{item.icon} {item.name}{isAdmin && <small>관리</small>}</button>)}
      </aside>
      <section className="community-content">
        {isAdmin && managedParent && <section className="community-board-manager">
          <div><p>관리자 모드</p><h3>{managedParent.icon} {managedParent.name} 관리</h3><button type="button" onClick={() => setManagedParentId(null)}>닫기</button></div>
          <p className="community-manager-help">하위 게시판을 추가하거나 각 게시판의 이름·아이콘·설명을 관리합니다.</p>
          {categoryMessage && <p className="community-manager-message">{categoryMessage}</p>}
          <form className="community-category-editor" onSubmit={addChildCategory}><strong>하위 게시판 추가</strong><div><input value={newCategory.icon} onChange={event => setNewCategory(value => ({ ...value, icon: event.target.value }))} maxLength={4} aria-label="아이콘" /><input value={newCategory.name} onChange={event => setNewCategory(value => ({ ...value, name: event.target.value }))} placeholder="게시판 이름" maxLength={40} required /></div><textarea value={newCategory.description} onChange={event => setNewCategory(value => ({ ...value, description: event.target.value }))} placeholder="게시판 설명 (선택 사항)" maxLength={1000} /><button type="submit" disabled={categorySaving}>하위 게시판 추가</button></form>
          <div className="community-category-manage-list"><strong>현재 하위 게시판</strong>{managedChildren.length === 0 ? <p>등록된 하위 게시판이 없습니다.</p> : managedChildren.map((item, index) => <div key={item.id}>{editingChildId === item.id ? <input className="community-child-name-input" value={childNameDraft} onChange={event => setChildNameDraft(event.target.value)} maxLength={40} aria-label={`${boardLabel(item.name)} 게시판 이름`} autoFocus /> : <span>{item.icon} {boardLabel(item.name)}</span>}<div className="community-category-actions"><button type="button" className="order" disabled={categorySaving || index === 0} onClick={() => void moveChildCategory(item, -1)} aria-label={`${boardLabel(item.name)} 위로 이동`}>↑</button><button type="button" className="order" disabled={categorySaving || index === managedChildren.length - 1} onClick={() => void moveChildCategory(item, 1)} aria-label={`${boardLabel(item.name)} 아래로 이동`}>↓</button>{editingChildId === item.id ? <><button type="button" className="save" disabled={categorySaving} onClick={() => void saveChildName(item)}>저장</button><button type="button" className="cancel" disabled={categorySaving} onClick={() => setEditingChildId(null)}>취소</button></> : <button type="button" className="edit" disabled={categorySaving} onClick={() => startChildNameEdit(item)}>수정</button>}<button type="button" disabled={categorySaving} onClick={() => void removeChildCategory(item)}>삭제</button></div></div>)}</div>
        </section>}
        <div className="community-banner-area"><Banner announcementCategory="community" /></div>
        <div className="community-board-title"><p>HOKEX COMMUNITY</p><h2>{selectedBoardName}</h2>{boardDescription && <span>{boardDescription}</span>}{isAdmin && selectedBoard && !editingDescription && <button type="button" className="community-description-edit" onClick={startDescriptionEdit}>설명 수정</button>}{isAdmin && selectedBoard && editingDescription && <div className="community-description-editor"><textarea value={descriptionDraft} onChange={event => setDescriptionDraft(event.target.value)} maxLength={1000} aria-label="게시판 설명" /><button type="button" disabled={categorySaving} onClick={() => void saveDescription()}>저장</button><button type="button" onClick={() => setEditingDescription(false)}>취소</button></div>}</div>
        <div className="community-toolbar"><form onSubmit={submitSearch}><input value={search} onChange={event => setSearch(event.target.value)} placeholder="제목 또는 내용 검색" /><button type="submit">검색</button></form>
          <div>{(['latest', 'popular', 'views'] as const).map(item => <button key={item} className={sort === item ? 'sort-active' : ''} onClick={() => { setSort(item); setPage(1); }}>{item === 'latest' ? '최신순' : item === 'popular' ? '인기순' : '조회순'}</button>)}{!isBestBoard && <button className="write-button" onClick={() => !user ? navigate('/login') : !userProfile?.nickname ? navigate('/profile?setup=nickname&reason=write') : navigate(`/community/write${selectedBoard ? `?board=${selectedBoard.id}` : ''}`)}>✏️ 글쓰기</button>}</div>
        </div>
        {isExhibitionBoard ? <div className="exhibition-gallery">{loading ? <div className="community-empty">게시글을 불러오는 중입니다.</div> : error ? <div className="community-empty">{error}</div> : posts.length === 0 ? <div className="community-empty">아직 전시 게시글이 없습니다. 첫 전시를 등록해 보세요.</div> : posts.map(post => { const poster = post.thumbnail_url || firstContentImage(post.content); const crop = post.thumbnail_crop || { x: 50, y: 50, scale: 1 }; return <a key={post.id} className="exhibition-card" href={post.link_url || `/community/${post.id}?board=${encodeURIComponent(category)}`}><div className="exhibition-card-image">{poster ? <img src={poster} style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.scale})` }} alt="" /> : <span aria-hidden="true">🛖</span>}</div><strong>{post.title}</strong><p className="exhibition-card-meta">{post.author_nickname || '익명 판다'} · {formatDate(post.created_at)} · 조회 {post.view_count.toLocaleString()} · 좋아요 {post.like_count.toLocaleString()}</p></a>; })}</div> : <div className="community-table"><div className="community-table-header"><span>{category === 'all' || isBestBoard ? '게시판' : '번호'}</span><span>제목</span><span>작성자</span><span>작성일</span><span>조회</span><span>좋아요</span></div>
          {notices.map(post => <PostRow key={post.id} {...postRowProps(post, category === 'all' ? post.post_number : post.board_post_number, (category === 'all' || isBestBoard) ? categories.find(item => item.id === post.board_category_id)?.name : undefined, true)} />)}
          {loading ? <div className="community-empty">게시글을 불러오는 중입니다.</div> : error ? <div className="community-empty">{error}</div> : posts.length === 0 ? <div className="community-empty">아직 게시글이 없습니다. 첫 글을 작성해 보세요.</div> : posts.map(post => <PostRow key={post.id} {...postRowProps(post, category === 'all' ? post.post_number : post.board_post_number, (category === 'all' || isBestBoard) ? categories.find(item => item.id === post.board_category_id)?.name : undefined)} />)}
        </div>}
        {totalPages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(value => value + 1)}>다음</button></div>}
        <p className="community-page-note">일반 게시글은 공지글을 제외하고 한 페이지에 15개씩 표시됩니다. 최신 글이 1페이지 맨 위에 표시됩니다.</p>
      </section>
    </div>
  </main>;
}
