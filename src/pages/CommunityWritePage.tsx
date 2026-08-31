import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPost, getBoardCategories, getPost, updatePost, uploadCommunityFile, uploadCommunityImage, type BoardCategory } from '../services/communityService';
import './CommunityPage.css';

export function CommunityWritePage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const editing = Boolean(postId);
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [title, setTitle] = useState('');
  const [newsDate, setNewsDate] = useState('');
  const [newsSource, setNewsSource] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const boardName = categories.find(item => item.id === category)?.name || '게시판';
  const isNewsBoard = boardName === '뉴스게시판';

  useEffect(() => {
    if (!user) navigate('/login');
    else if (!userProfile?.nickname) navigate('/profile?setup=nickname&reason=write');
  }, [user, userProfile?.nickname, navigate]);

  useEffect(() => {
    getBoardCategories().then(items => {
      const requestedBoard = new URLSearchParams(location.search).get('board');
      const writable = items.filter(item => item.is_active && item.name !== '베스트 게시판');
      setCategories(writable);
      setCategory(current => current || (requestedBoard && writable.some(item => item.id === requestedBoard) ? requestedBoard : writable[0]?.id || ''));
    });
  }, [location.search]);

  useEffect(() => {
    if (!postId) return;
    getPost(postId).then(post => {
      if (!post) throw new Error();
      setTitle(post.title); setContent(post.content); setLinkUrl(post.link_url || ''); setCategory(post.board_category_id); setIsPublic(post.is_public);
    }).catch(() => setError('게시글을 불러올 수 없습니다.'));
  }, [postId]);

  useEffect(() => {
    if (!isNewsBoard || newsSource) return;
    const matched = title.match(/^(.*?)(?:\s+(\d{2}\.\d{2}\.\d{2}))?\s*<([^<>]+)>\s*$/);
    if (matched) { setTitle(matched[1].trim()); setNewsDate(matched[2] || ''); setNewsSource(matched[3].trim()); }
  }, [isNewsBoard, newsSource, title]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedLinkUrl = linkUrl.trim() ? (/^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`) : null;
    if (normalizedLinkUrl && !/^https:\/\//i.test(normalizedLinkUrl)) {
      setError('링크 URL은 http:// 또는 https:// 형식으로 입력해 주세요.');
      return;
    }
    const savedTitle = isNewsBoard ? `${title.trim()} ${newsDate} <${newsSource.trim()}>` : title.trim();
    const savedContent = isNewsBoard ? '' : content;
    if (!user || !title.trim() || !category || (!isNewsBoard && !savedContent.trim())) {
      setError('게시판, 제목, 본문을 모두 입력해 주세요.');
      return;
    }
    if (isNewsBoard && !newsSource.trim()) {
      setError('언론사 명칭을 입력해 주세요.');
      return;
    }
    if (isNewsBoard && !/^\d{2}\.\d{2}\.\d{2}$/.test(newsDate)) {
      setError('기사 작성일을 26.00.00 형식으로 입력해 주세요.');
      return;
    }
    if (isNewsBoard && !normalizedLinkUrl) {
      setError('뉴스 원문 URL을 입력해 주세요.');
      return;
    }
    if (savedTitle.length > 120) { setError('제목과 언론사 명칭은 합쳐서 120자 이내로 입력해 주세요.'); return; }
    setSaving(true); setError('');
    try {
      if (postId) {
        await updatePost(postId, { title: savedTitle, content: savedContent, link_url: normalizedLinkUrl, board_category_id: category, is_public: isPublic });
        navigate(isNewsBoard ? `/community?board=${encodeURIComponent(category)}` : `/community/${postId}`, { state: { communityCategory: category, communityScrollY: (location.state as { communityScrollY?: number } | null)?.communityScrollY ?? 0 } });
      } else {
        const id = await createPost({ title: savedTitle, content: savedContent, link_url: normalizedLinkUrl, board_category_id: category, is_public: isPublic });
        navigate(isNewsBoard ? `/community?board=${encodeURIComponent(category)}` : `/community/${id}`, { state: { communityCategory: category } });
      }
    } catch {
      setError('저장하지 못했습니다. 로그인 상태와 권한을 확인해 주세요.');
    } finally { setSaving(false); }
  };

  if (user && !userProfile?.nickname) return <main className="community-page"><div className="community-empty">게시물 작성은 닉네임을 설정해야 가능합니다.</div></main>;
  return <main className="community-page"><section className="editor-shell cafe-write-shell">
    <div className="editor-heading"><div><p>{boardName}</p><h2>{editing ? '글 수정' : '글쓰기'}</h2></div><div className="editor-top-actions"><button type="button" onClick={() => navigate(-1)}>취소</button><button className="write-button" disabled={saving}>{saving ? '등록 중…' : editing ? '수정' : '등록'}</button></div></div>
    <form onSubmit={submit}><div className="write-main-grid"><section className="write-editor-area">
      <div className="write-select-row"><label>게시판<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select></label></div>
      {isNewsBoard ? <div className="news-title-fields"><label className="title-field"><input value={title} maxLength={90} onChange={event => setTitle(event.target.value)} placeholder="제목을 입력해 주세요." /></label><label className="news-date-field"><input value={newsDate} inputMode="numeric" maxLength={8} onChange={event => { const digits = event.target.value.replace(/\D/g, '').slice(0, 6); setNewsDate([digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean).join('.')); }} placeholder="26.00.00" aria-label="기사 작성일" required /></label><label className="news-source-field"><span>&lt;</span><input value={newsSource} maxLength={40} onChange={event => setNewsSource(event.target.value)} placeholder="언론사 명칭" aria-label="언론사 명칭" /><span>&gt;</span></label></div> : <label className="title-field"><input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} placeholder="제목을 입력해 주세요." /></label>}
      {isNewsBoard && <p className="news-title-preview">{title.trim() && /^\d{2}\.\d{2}\.\d{2}$/.test(newsDate) && newsSource.trim() ? `${title.trim()} ${newsDate} <${newsSource.trim()}>` : '제목 26.00.00 <언론사 명칭> 형식으로 자동 등록됩니다.'}</p>}
      {!isNewsBoard && <div className="body-field"><RichTextEditor value={content} onChange={setContent} onImageUpload={file => uploadCommunityImage(file, user!)} onFileUpload={file => uploadCommunityFile(file, user!)} /></div>}
      <label className="link-url-field"><span>{isNewsBoard ? '뉴스 원문 URL' : '링크 URL'} {!isNewsBoard && <em>(선택사항)</em>}</span><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder={isNewsBoard ? '뉴스 원문 URL을 입력해 주세요.' : '제목 클릭 시 이동할 URL을 입력해 주세요.'} required={isNewsBoard} /><small>{isNewsBoard ? '등록 후 제목이나 목록을 누르면 해당 뉴스 원문으로 바로 이동합니다.' : '입력하면 게시글 제목과 목록을 클릭했을 때 해당 링크로 이동합니다.'}</small></label>
    </section><aside className="write-options"><strong>공개 설정</strong><label><input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} /> 전체 공개</label><p>{isPublic ? '누구나 이 글을 볼 수 있습니다.' : '작성자와 관리자만 이 글을 볼 수 있습니다.'}</p><label><input type="checkbox" defaultChecked /> 댓글 허용</label><label><input type="checkbox" defaultChecked /> 검색 노출 허용</label><p>사진은 JPG, PNG, WEBP, GIF 형식으로 최대 5MB, 일반 파일은 최대 10MB까지 첨부할 수 있습니다.</p></aside></div>
    {error && <p className="form-error">{error}</p>}<div className="editor-actions"><button type="button" onClick={() => navigate(-1)}>취소</button><button className="write-button" disabled={saving}>{saving ? '등록 중…' : editing ? '수정 완료' : '등록하기'}</button></div></form>
  </section></main>;
}
