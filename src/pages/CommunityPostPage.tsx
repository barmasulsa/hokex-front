import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { RichTextContent } from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { deletePost, getBoardCategories, getPost, incrementPostView, type BoardCategory, type Post } from '../services/communityService';
import './CommunityPage.css';

export function CommunityPostPage() {
  const { postId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { getBoardCategories().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => {
    if (!postId) return;
    getPost(postId).then(value => { setPost(value); if (value) void incrementPostView(postId); }).catch(() => setError('게시글을 불러오지 못했습니다.'));
  }, [postId]);

  const remove = async () => {
    if (!postId || !window.confirm('이 게시글을 삭제할까요?')) return;
    try { await deletePost(postId); navigate('/community'); }
    catch { setError('작성자 또는 관리자만 게시글을 삭제할 수 있습니다.'); }
  };
  const boardName = categories.find(item => item.id === post?.board_category_id)?.name || '커뮤니티';
  const canEdit = post?.author_id === user?.id;
  const canDelete = Boolean(canEdit || userProfile?.is_admin);

  return <main className="community-page"><div className="community-layout">
    <aside className="community-sidebar"><strong>게시판</strong><button onClick={() => navigate('/community')}>전체 글</button>
      {categories.map(item => item.is_active ? <button key={item.id} className={post?.board_category_id === item.id ? 'active' : ''} onClick={() => navigate('/community')}>{item.icon} {item.name}</button> : <div key={item.id} className="community-category-heading">{item.icon} {item.name}</div>)}
    </aside>
    <section className="community-content">
      <div className="community-banner-area"><Banner announcementCategory="community" /></div>
      {error ? <div className="community-empty">{error}</div> : !post ? <div className="community-empty">게시글을 불러오는 중입니다.</div> : <article className="post-detail community-post-inline">
        <Link to="/community" className="back-link">← 커뮤니티 목록</Link>
        <div className="community-board-title"><p>HOKEX COMMUNITY</p><h2>{boardName}</h2></div>
        <div className="post-detail-title"><span className="post-tag">COMMUNITY · 글번호 {post.post_number}{!post.is_public && ' · 비공개'}</span><h2>{post.title}</h2><p>{post.author_nickname || '익명 판다'} · {new Date(post.created_at).toLocaleString('ko-KR')} · 조회 {post.view_count}</p></div>
        {post.link_url && <a className="post-link-card" href={post.link_url}>🔗 연결된 링크 열기 <span>{post.link_url}</span></a>}
        <div className="post-detail-content"><RichTextContent value={post.content} /></div>
        {(canEdit || canDelete) && <div className="post-owner-actions">{canEdit && <button onClick={() => navigate(`/community/${post.id}/edit`)}>수정</button>}{canDelete && <button className="danger" onClick={remove}>삭제</button>}</div>}
        <section className="comments-placeholder"><h3>댓글</h3><p>댓글·추천 기능은 다음 단계에서 추가됩니다.</p></section>
      </article>}
    </section>
  </div></main>;
}
