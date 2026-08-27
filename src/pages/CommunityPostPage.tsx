import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { deletePost, getPost, incrementPostView, type Post } from '../services/communityService';
import { RichTextContent } from '../components/RichTextEditor';
import './CommunityPage.css';

export function CommunityPostPage() {
  const { postId } = useParams(); const { user, userProfile } = useAuth(); const navigate = useNavigate(); const [post, setPost] = useState<Post | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (!postId) return; getPost(postId).then(value => { setPost(value); if (value) void incrementPostView(postId); }).catch(() => setError('게시글을 불러오지 못했습니다.')); }, [postId]);
  const remove = async () => { if (!postId || !window.confirm('이 게시글을 삭제할까요?')) return; try { await deletePost(postId); navigate('/community'); } catch { setError('본인이 작성한 글만 삭제할 수 있습니다.'); } };
  if (error) return <main className="community-page"><div className="community-empty">{error}</div></main>;
  if (!post) return <main className="community-page"><div className="community-empty">게시글을 불러오는 중입니다.</div></main>;
  const canEdit = post.author_id === user?.id;
  const canDelete = canEdit || Boolean(userProfile?.is_admin);
  return <main className="community-page"><article className="post-detail"><Link to="/community" className="back-link">← 커뮤니티 목록</Link><div className="post-detail-title"><span className="post-tag">COMMUNITY · 글번호 {post.post_number}</span><h2>{post.title}</h2><p>{post.author_nickname || '익명 판다'} · {new Date(post.created_at).toLocaleString('ko-KR')} · 조회 {post.view_count}</p></div><div className="post-detail-content"><RichTextContent value={post.content} /></div>{(canEdit || canDelete) && <div className="post-owner-actions">{canEdit && <button onClick={() => navigate(`/community/${post.id}/edit`)}>수정</button>}{canDelete && <button className="danger" onClick={remove}>삭제</button>}</div>}<section className="comments-placeholder"><h3>댓글</h3><p>댓글·추천 기능은 다음 단계에서 추가됩니다.</p></section></article></main>;
}
