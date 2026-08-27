import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { RichTextContent } from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createComment, deleteComment, deletePost, getBoardCategories, getComments, getPost, getPostLikeStatus, incrementPostView, reportPost, togglePostLike, type BoardCategory, type CommunityComment, type Post } from '../services/communityService';
import './CommunityPage.css';

const REPORT_REASONS = [
  { title: '게시판의 성격과 맞는 게시글이 아닙니다.', lines: ['선택한 게시판의 주제 또는 운영 목적과 관련성이 낮은 내용'] },
  { title: '혐오/차별적/생명경시/욕설 표현입니다.', lines: ['직·간접적인 욕설을 사용하여 타인에게 모욕감을 주는 내용', '생명을 경시하거나 비하하는 내용', '계층/지역/종교/성별 등을 혐오하거나 비하하는 표현', '신체/외모/취향 등을 경멸하는 표현'] },
  { title: '스팸홍보/도배입니다.', lines: ['사행성 오락이나 도박을 홍보하거나 권장하는 내용 등의 부적절한 스팸 홍보 행위', '동일하거나 유사한 내용 반복 게시'] },
  { title: '불법정보를 포함하고 있습니다.', lines: ['불법 행위, 불법 링크에 대한 정보 제공', '불법 상품을 판매하거나 유도하는 내용'] },
  { title: '음란물입니다.', lines: ['성적 수치심을 일으키는 내용', '아동이나 청소년을 성 대상화한 표현', '과도하거나 의도적인 신체 노출', '음란한 행위와 관련된 부적절한 내용'] },
  { title: '불쾌한 표현이 있습니다.', lines: ['불쾌한 표현 포함'] },
] as const;

export function CommunityPostPage() {
  const { postId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0].title);
  const [reportDetails, setReportDetails] = useState('');
  const scrollY = (location.state as { communityScrollY?: number } | null)?.communityScrollY ?? 0;
  const backToList = () => navigate('/community', { state: { communityScrollY: scrollY } });
  const loadComments = () => postId && getComments(postId).then(setComments).catch(() => undefined);

  useEffect(() => { getBoardCategories().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => {
    if (!postId) return;
    getPost(postId).then(value => { setPost(value); if (value) void incrementPostView(postId); }).catch(() => setError('게시글을 불러오지 못했습니다.'));
    void getPostLikeStatus(postId).then(value => setLiked(value.liked)).catch(() => undefined);
    loadComments();
  }, [postId]);

  const remove = async () => { if (!postId || !window.confirm('이 게시글을 삭제할까요?')) return; try { await deletePost(postId); backToList(); } catch { setError('작성자 또는 관리자만 게시글을 삭제할 수 있습니다.'); } };
  const toggleLike = async () => { if (!postId) return; if (!user) { navigate('/login'); return; } try { const value = await togglePostLike(postId); setLiked(value.liked); setPost(current => current ? { ...current, like_count: value.like_count } : current); } catch { setError('좋아요를 저장하지 못했습니다.'); } };
  const share = async () => { const shareData = { title: post?.title || 'HOKEX 커뮤니티', text: post?.title || '', url: window.location.href }; try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(window.location.href); alert('게시글 링크를 복사했습니다.'); } } catch { /* 공유 취소 */ } };
  const submitComment = async (event: React.FormEvent) => { event.preventDefault(); if (!postId || !comment.trim()) return; if (!user) { navigate('/login'); return; } if (!userProfile?.nickname) { navigate('/profile?setup=nickname&reason=write'); return; } try { await createComment(postId, comment); setComment(''); loadComments(); setPost(current => current ? { ...current, comment_count: current.comment_count + 1 } : current); } catch { setError('댓글을 저장하지 못했습니다. 로그인 상태와 닉네임을 확인해 주세요.'); } };
  const removeComment = async (id: string) => { if (!window.confirm('댓글을 삭제할까요?')) return; try { await deleteComment(id); loadComments(); setPost(current => current ? { ...current, comment_count: Math.max(0, current.comment_count - 1) } : current); } catch { setError('작성자 또는 관리자만 댓글을 삭제할 수 있습니다.'); } };
  const submitReport = async (event: React.FormEvent) => { event.preventDefault(); if (!postId) return; if (!user) { navigate('/login'); return; } try { await reportPost(postId, reportReason, reportDetails); setReportOpen(false); setReportDetails(''); alert('신고가 접수되었습니다. 관리자가 검토하겠습니다.'); } catch { setError('신고를 접수하지 못했습니다. 이미 접수된 신고인지 확인해 주세요.'); } };

  const boardName = categories.find(item => item.id === post?.board_category_id)?.name || '커뮤니티';
  const canEdit = post?.author_id === user?.id;
  const canDelete = Boolean(canEdit || userProfile?.is_admin);
  const selectedReason = REPORT_REASONS.find(item => item.title === reportReason) ?? REPORT_REASONS[0];
  return <main className="community-page"><div className="community-layout"><aside className="community-sidebar"><strong>게시판</strong><button onClick={backToList}>전체 글</button>{categories.map(item => item.is_active ? <button key={item.id} className={post?.board_category_id === item.id ? 'active' : ''} onClick={backToList}>{item.icon} {item.name}</button> : <div key={item.id} className="community-category-heading">{item.icon} {item.name}</div>)}</aside><section className="community-content"><div className="community-banner-area"><Banner announcementCategory="community" /></div>{error && <div className="community-error">{error}</div>}{!post ? <div className="community-empty">게시글을 불러오는 중입니다.</div> : <article className="post-detail community-post-inline"><button className="back-link button-link" onClick={backToList}>← 커뮤니티 목록</button><div className="community-board-title"><p>HOKEX COMMUNITY</p><h2>{boardName}</h2></div><div className="post-detail-title"><span className="post-tag">COMMUNITY · 글번호 {post.post_number}{!post.is_public && ' · 비공개'}</span><h2>{post.title}</h2><p>{post.author_nickname || '익명 판다'} · {new Date(post.created_at).toLocaleString('ko-KR')} · 조회 {post.view_count}</p></div>{post.link_url && <a className="post-link-card" href={post.link_url}>🔗 연결된 링크 열기 <span>{post.link_url}</span></a>}<div className="post-detail-content"><RichTextContent value={post.content} /></div><div className="post-reactions"><button className={liked ? 'active' : ''} onClick={toggleLike}>♥ 좋아요 <b>{post.like_count}</b></button><button onClick={share}>↗ 공유</button><button onClick={() => setReportOpen(value => !value)}>⚑ 신고</button></div>{reportOpen && <form className="report-form" onSubmit={submitReport}><h3>게시글 신고</h3><label>신고 사유<select value={reportReason} onChange={event => setReportReason(event.target.value)}>{REPORT_REASONS.map(item => <option key={item.title}>{item.title}</option>)}</select></label><ul>{selectedReason.lines.map(line => <li key={line}>{line}</li>)}</ul><label>세부 내용<textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} maxLength={2000} placeholder="신고 사유를 구체적으로 작성해 주세요. (선택)" /></label><div><button type="button" onClick={() => setReportOpen(false)}>취소</button><button type="submit">신고 접수</button></div></form>}{(canEdit || canDelete) && <div className="post-owner-actions">{canEdit && <button onClick={() => navigate(`/community/${post.id}/edit`)}>수정</button>}{canDelete && <button className="danger" onClick={remove}>삭제</button>}</div>}<section className="comments-section"><h3>댓글 <b>{comments.length}</b></h3>{comments.map(item => <div className="comment-item" key={item.id}><strong>{item.author_nickname}</strong><time>{new Date(item.created_at).toLocaleString('ko-KR')}</time><p>{item.content}</p>{(item.author_id === user?.id || userProfile?.is_admin) && <button onClick={() => removeComment(item.id)}>삭제</button>}</div>)}<form className="comment-form" onSubmit={submitComment}><textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} placeholder="댓글을 작성해 주세요." /><button type="submit">등록</button></form></section></article>}</section></div></main>;
}
