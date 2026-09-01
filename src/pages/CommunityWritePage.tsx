import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPost, getBoardCategories, getPost, updatePost, uploadCommunityFile, uploadCommunityImage, type BoardCategory, type ThumbnailCrop } from '../services/communityService';
import './CommunityPage.css';

type CropFrame = { left: number; top: number; width: number; height: number };
type CropHandle = 'move' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';

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
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailCrop, setThumbnailCrop] = useState<ThumbnailCrop>({ x: 50, y: 50, scale: 1, aspect_ratio: 1 });
  const [thumbnailError, setThumbnailError] = useState('');
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [thumbnailImageAspect, setThumbnailImageAspect] = useState(1);
  const [cropFrame, setCropFrame] = useState<CropFrame>({ left: 9, top: 9, width: 82, height: 82 });
  const cropInteraction = useRef<{ startX: number; startY: number; frame: CropFrame; handle: CropHandle } | null>(null);
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const boardName = categories.find(item => item.id === category)?.name || '게시판';
  const isNewsBoard = boardName === '뉴스게시판';
  const isExhibitionBoard = boardName === '전시';

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
      setTitle(post.title); setContent(post.content); setLinkUrl(post.link_url || ''); setThumbnailUrl(post.thumbnail_url || ''); setThumbnailCrop({ x: 50, y: 50, scale: 1, aspect_ratio: 1, ...(post.thumbnail_crop || {}) }); setCategory(post.board_category_id); setIsPublic(post.is_public);
    }).catch(() => setError('게시글을 불러올 수 없습니다.'));
  }, [postId]);

  useEffect(() => {
    if (!isNewsBoard || newsSource) return;
    const matched = title.match(/^(.*?)(?:\s+(\d{2}\.\d{2}\.\d{2}))?\s*<([^<>]+)>\s*$/);
    if (matched) { setTitle(matched[1].trim()); setNewsDate(matched[2] || ''); setNewsSource(matched[3].trim()); }
  }, [isNewsBoard, newsSource, title]);

  const uploadThumbnail = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setError(''); setThumbnailError('');
    if (file.size > 5 * 1024 * 1024) { setThumbnailError('썸네일 이미지는 5MB 이하만 설정할 수 있습니다.'); event.target.value = ''; return; }
    try { setThumbnailUrl(await uploadCommunityImage(file, user)); setThumbnailCrop({ x: 50, y: 50, scale: 1, aspect_ratio: 1 }); }
    catch (caught) { setThumbnailError(caught instanceof Error ? caught.message : '포스터를 첨부하지 못했습니다.'); }
    finally { event.target.value = ''; }
  };
  const setRepresentativeImage = (value: string | null) => {
    setThumbnailUrl(value || ''); setThumbnailCrop({ x: 50, y: 50, scale: 1, aspect_ratio: 1 }); setThumbnailError('');
  };
  const openCropEditor = () => {
    const width = Math.min(82, 82 / thumbnailImageAspect);
    const height = width * thumbnailImageAspect;
    setCropFrame({ left: Math.max(0, Math.min(100 - width, thumbnailCrop.x - width / 2)), top: Math.max(0, Math.min(100 - height, thumbnailCrop.y - height / 2)), width, height });
    setCropEditorOpen(true);
  };
  const moveCropFrame = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropInteraction.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const { startX, startY, frame, handle } = cropInteraction.current;
    const dx = ((event.clientX - startX) / rect.width) * 100;
    const dy = ((event.clientY - startY) / rect.height) * 100;
    const minimum = 12;
    let { left, top, width, height } = frame;
    if (handle === 'move') { left = Math.max(0, Math.min(100 - width, left + dx)); top = Math.max(0, Math.min(100 - height, top + dy)); }
    if (handle !== 'move') {
      const imageAspect = thumbnailImageAspect;
      if (handle.includes('left') || handle.includes('right')) {
        const right = frame.left + frame.width;
        width = handle.includes('left') ? Math.max(minimum, Math.min(right, frame.width - dx)) : Math.max(minimum, Math.min(100 - frame.left, frame.width + dx));
        height = width * imageAspect;
        left = handle.includes('left') ? right - width : frame.left;
      } else {
        const bottom = frame.top + frame.height;
        height = handle.includes('top') ? Math.max(minimum * imageAspect, Math.min(bottom, frame.height - dy)) : Math.max(minimum * imageAspect, Math.min(100 - frame.top, frame.height + dy));
        width = height / imageAspect;
        top = handle.includes('top') ? bottom - height : frame.top;
      }
      left = Math.max(0, Math.min(100 - width, left));
      top = Math.max(0, Math.min(100 - height, top));
    }
    setCropFrame({ left, top, width, height });
  };
  const saveCropFrame = () => {
    setThumbnailCrop(value => ({ ...value, x: cropFrame.left + cropFrame.width / 2, y: cropFrame.top + cropFrame.height / 2, scale: Math.max(1, 100 / cropFrame.width), aspect_ratio: 1 }));
    setCropEditorOpen(false);
  };
  const resetCropFrame = () => {
    const width = Math.min(82, 82 / thumbnailImageAspect);
    const height = width * thumbnailImageAspect;
    setCropFrame({ left: (100 - width) / 2, top: (100 - height) / 2, width, height });
  };

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
    if (isExhibitionBoard && !thumbnailUrl) {
      setError('전시 게시글은 썸네일(대표 사진)을 반드시 설정해 주세요.');
      return;
    }
    if (savedTitle.length > 120) { setError('제목과 언론사 명칭은 합쳐서 120자 이내로 입력해 주세요.'); return; }
    setSaving(true); setError('');
    try {
      if (postId) {
        await updatePost(postId, { title: savedTitle, content: savedContent, link_url: normalizedLinkUrl, thumbnail_url: thumbnailUrl || null, thumbnail_crop: thumbnailUrl ? thumbnailCrop : null, board_category_id: category, is_public: isPublic });
        navigate(isNewsBoard ? `/community?board=${encodeURIComponent(category)}` : `/community/${postId}`, { state: { communityCategory: category, communityScrollY: (location.state as { communityScrollY?: number } | null)?.communityScrollY ?? 0 } });
      } else {
        const id = await createPost({ title: savedTitle, content: savedContent, link_url: normalizedLinkUrl, thumbnail_url: thumbnailUrl || null, thumbnail_crop: thumbnailUrl ? thumbnailCrop : null, board_category_id: category, is_public: isPublic });
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
      {isExhibitionBoard && <section className="exhibition-thumbnail-field"><div><strong>포스터 (썸네일) <em>필수</em></strong><span className="thumbnail-description">본문 사진을 대표로 설정하거나 직접 포스터를 올려주세요. 전시 갤러리 규격은 800×800(1:1)로 고정됩니다.<br />썸네일은 외부에 보이는 게시글의 이미지이며 본문에 첨부되는 실제 파일이 아닙니다.<br />이미지 파일을 게시글에 올리고 싶을 경우 본문에 실제 이미지 파일을 넣어야 합니다.</span></div><input ref={thumbnailInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadThumbnail} />{thumbnailUrl ? <div className="exhibition-thumbnail-preview"><div className="exhibition-thumbnail-crop-preview"><img src={thumbnailUrl} style={{ objectPosition: `${thumbnailCrop.x}% ${thumbnailCrop.y}%`, transform: `scale(${thumbnailCrop.scale})` }} alt="선택한 전시 포스터" /></div><div><button type="button" className="thumbnail-adjust-button" onClick={openCropEditor}>썸네일 화면 조정하기</button><button type="button" onClick={() => setRepresentativeImage(null)}>대표 사진 해제</button></div></div> : <button type="button" className="exhibition-thumbnail-upload" onClick={() => thumbnailInput.current?.click()}>포스터 직접 선택</button>}{thumbnailError && <p className="thumbnail-error">{thumbnailError}</p>}</section>}
      {!isNewsBoard && <div className="body-field"><RichTextEditor value={content} onChange={setContent} onImageUpload={file => uploadCommunityImage(file, user!)} onFileUpload={file => uploadCommunityFile(file, user!)} representativeImageUrl={isExhibitionBoard ? thumbnailUrl : undefined} onRepresentativeImageChange={isExhibitionBoard ? setRepresentativeImage : undefined} /></div>}
      <label className="link-url-field"><span>{isNewsBoard ? '뉴스 원문 URL' : '링크 URL'} {!isNewsBoard && <em>(선택사항)</em>}</span><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder={isNewsBoard ? '뉴스 원문 URL을 입력해 주세요.' : '제목 클릭 시 이동할 URL을 입력해 주세요.'} required={isNewsBoard} /><small>{isNewsBoard ? '등록 후 제목이나 목록을 누르면 해당 뉴스 원문으로 바로 이동합니다.' : '입력하면 게시글 제목과 목록을 클릭했을 때 해당 링크로 이동합니다.'}</small></label>
    </section><aside className="write-options"><strong>공개 설정</strong><label><input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} /> 전체 공개</label><p>{isPublic ? '누구나 이 글을 볼 수 있습니다.' : '작성자와 관리자만 이 글을 볼 수 있습니다.'}</p><label><input type="checkbox" defaultChecked /> 댓글 허용</label><label><input type="checkbox" defaultChecked /> 검색 노출 허용</label><p>사진은 JPG, PNG, WEBP, GIF 형식으로 최대 5MB, 일반 파일은 최대 10MB까지 첨부할 수 있습니다.</p></aside></div>
    {error && <p className="form-error">{error}</p>}<div className="editor-actions"><button type="button" onClick={() => navigate(-1)}>취소</button><button className="write-button" disabled={saving}>{saving ? '등록 중…' : editing ? '수정 완료' : '등록하기'}</button></div></form>
    {cropEditorOpen && thumbnailUrl && <div className="thumbnail-crop-modal" role="dialog" aria-modal="true" aria-label="썸네일 화면 조정"><section><header><div><strong>썸네일 화면 조정하기</strong><span>전시 갤러리 규격 800×800(1:1)에 맞춰, 선택 영역을 옮기거나 흰색 핸들로 크기를 조정하세요.</span></div><button type="button" onClick={() => setCropEditorOpen(false)}>×</button></header><div className="thumbnail-ratio-options"><button type="button" className="active">전시 썸네일 1:1</button></div><div className="thumbnail-crop-canvas" style={{ aspectRatio: String(thumbnailImageAspect) }} onPointerMove={moveCropFrame} onPointerUp={() => { cropInteraction.current = null; }} onPointerCancel={() => { cropInteraction.current = null; }}><img src={thumbnailUrl} alt="썸네일 자르기 미리보기" onLoad={event => { const aspect = event.currentTarget.naturalWidth / event.currentTarget.naturalHeight; setThumbnailImageAspect(aspect); setCropFrame(frame => { const width = Math.min(82, 82 / aspect); const height = width * aspect; return { left: Math.max(0, Math.min(100 - width, frame.left + frame.width / 2 - width / 2)), top: Math.max(0, Math.min(100 - height, frame.top + frame.height / 2 - height / 2)), width, height }; }); }} /><div className="thumbnail-crop-frame" style={{ left: `${cropFrame.left}%`, top: `${cropFrame.top}%`, width: `${cropFrame.width}%`, height: `${cropFrame.height}%` }} onPointerDown={event => { event.stopPropagation(); cropInteraction.current = { startX: event.clientX, startY: event.clientY, frame: cropFrame, handle: 'move' }; event.currentTarget.setPointerCapture(event.pointerId); }}><span className="thumbnail-crop-shade" aria-hidden="true" />{(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'right', 'bottom', 'left'] as CropHandle[]).map(handle => <button key={handle} type="button" className={`thumbnail-crop-handle ${handle}`} aria-label={`자르기 영역 ${handle} 조절`} onPointerDown={event => { event.stopPropagation(); cropInteraction.current = { startX: event.clientX, startY: event.clientY, frame: cropFrame, handle }; event.currentTarget.setPointerCapture(event.pointerId); }} />)}</div></div><div className="thumbnail-crop-actions"><button type="button" onClick={resetCropFrame}>처음 상태</button><button type="button" className="write-button" onClick={saveCropFrame}>완료</button></div></section></div>}
  </section></main>;
}
