import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onFileUpload?: (file: File) => Promise<{ url: string; name: string }>;
  representativeImageUrl?: string;
  onRepresentativeImageChange?: (url: string | null) => void;
  prepareContentRef?: React.MutableRefObject<(() => string) | null>;
}

const allowedTags = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'DIV', 'SPAN', 'FONT', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG', 'H2', 'H3']);
const urlPattern = /(https?:\/\/[^\s<]+)/g;
const trailingUrlPunctuation = /[),.!?;:]+$/;

function youtubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

function addAutomaticLinks(doc: Document) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) if (!node.parentElement?.closest('a, iframe')) textNodes.push(node as Text);
  textNodes.forEach(textNode => {
    const text = textNode.data;
    if (!urlPattern.test(text)) return;
    urlPattern.lastIndex = 0;
    const fragment = doc.createDocumentFragment();
    let cursor = 0;
    text.replace(urlPattern, (matched, offset: number) => {
      const cleanUrl = matched.replace(trailingUrlPunctuation, '');
      fragment.append(text.slice(cursor, offset));
      const link = doc.createElement('a');
      link.href = cleanUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = cleanUrl;
      fragment.append(link);
      fragment.append(matched.slice(cleanUrl.length));
      cursor = offset + matched.length;
      return matched;
    });
    fragment.append(text.slice(cursor));
    textNode.replaceWith(fragment);
  });
}

function removeRepeatedLinkText(doc: Document) {
  Array.from(doc.body.querySelectorAll('a[href]')).forEach(link => {
    const linkText = link.textContent || '';
    const next = link.nextSibling;
    if (!linkText || next?.nodeType !== Node.TEXT_NODE) return;
    const text = next.textContent || '';
    if (text === linkText) next.remove();
  });
}

function normalizeEditorLinks(value: string) {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  removeRepeatedLinkText(doc);
  return collapseRepeatedLinkMarkup(doc.body.innerHTML);
}

function collapseRepeatedLinkMarkup(html: string) {
  return html.replace(/(<a\b[^>]*>)([^<]+)(<\/a>)\2/g, '$1$2$3');
}

function addYoutubeEmbeds(doc: Document) {
  Array.from(doc.body.querySelectorAll('p, div')).forEach(block => {
    if (block.querySelector('img, iframe') || block.children.length > 1) return;
    const sourceUrl = block.textContent?.trim() || '';
    const videoId = youtubeVideoId(sourceUrl);
    if (!videoId) return;
    const embed = doc.createElement('div');
    embed.className = 'community-youtube-embed';
    const iframe = doc.createElement('iframe');
    const origin = window.location.origin;
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}`;
    iframe.title = 'YouTube 동영상';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    embed.append(iframe);
    const fallback = doc.createElement('a');
    fallback.className = 'community-youtube-open-link';
    fallback.href = sourceUrl;
    fallback.target = '_blank';
    fallback.rel = 'noopener noreferrer';
    fallback.textContent = 'YouTube에서 동영상 열기 ↗';
    embed.append(fallback);
    block.replaceWith(embed);
  });
}

export function sanitizeCommunityHtml(value: string) {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.body.querySelectorAll('*').forEach(element => {
    if (!allowedTags.has(element.tagName)) { element.replaceWith(...Array.from(element.childNodes)); return; }
    Array.from(element.attributes).forEach(attribute => {
      const allowed = (element.tagName === 'A' && ['href', 'target', 'rel'].includes(attribute.name)) || (element.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) || (element.tagName === 'FONT' && ['size', 'face', 'color'].includes(attribute.name)) || (element.tagName === 'BR' && attribute.name === 'data-community-soft-break') || (['SPAN', 'DIV', 'P', 'H2', 'H3', 'IMG'].includes(element.tagName) && attribute.name === 'style');
      if (!allowed || /^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name);
    });
    if (element.hasAttribute('style')) {
      const style = element.getAttribute('style') || '';
      const safeStyle = style.split(';').map(rule => rule.trim()).filter(rule => {
        if (/^(font-family|font-size|text-align|color)\s*:/i.test(rule) && !/expression|url\s*\(/i.test(rule)) return true;
        return element.tagName === 'IMG' && /^(width|height)\s*:\s*\d+(?:\.\d+)?(?:px|%)$/i.test(rule);
      }).join('; ');
      if (safeStyle) element.setAttribute('style', safeStyle); else element.removeAttribute('style');
    }
    if (element.tagName === 'A') { element.setAttribute('target', '_blank'); element.setAttribute('rel', 'noopener noreferrer'); }
  });
  removeRepeatedLinkText(doc);
  addYoutubeEmbeds(doc);
  addAutomaticLinks(doc);
  return collapseRepeatedLinkMarkup(doc.body.innerHTML);
}

export function RichTextContent({ value }: { value: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const html = sanitizeCommunityHtml(value);
  useEffect(() => {
    contentRef.current?.querySelectorAll('a[href]').forEach(link => {
      const linkText = link.textContent || '';
      const next = link.nextSibling;
      if (linkText && next?.nodeType === 3 && next.textContent === linkText) next.remove();
    });
  }, [html]);
  return <div ref={contentRef} className="rich-content rich-editor-canvas" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function RichTextEditor({ value, onChange, placeholder = '내용을 작성해주세요.', onImageUpload, onFileUpload, representativeImageUrl, onRepresentativeImageChange, prepareContentRef }: Props) {
  const editor = useRef<HTMLDivElement>(null); const imageInput = useRef<HTMLInputElement>(null); const fileInput = useRef<HTMLInputElement>(null); const composing = useRef(false); const editing = useRef(false); const undoStack = useRef<string[]>([]); const redoStack = useRef<string[]>([]); const [uploading, setUploading] = useState(''); const [error, setError] = useState(''); const [selectedImage, setSelectedImage] = useState<{ image: HTMLImageElement; top: number; left: number } | null>(null);
  // contentEditable은 입력 중 DOM을 다시 쓰면 한글·일본어 IME 조합이 취소된다.
  // 초기값/외부 변경만 반영하고, 사용자가 편집 중인 DOM은 브라우저에 맡긴다.
  useEffect(() => {
    const normalized = sanitizeCommunityHtml(value);
    if (!editing.current && !composing.current && editor.current && editor.current.innerHTML !== normalized) {
      editor.current.innerHTML = normalized;
      undoStack.current = [];
      redoStack.current = [];
      if (value !== normalized) onChange(normalized);
    }
  }, [value]);
  const saveUndoPoint = () => {
    const html = editor.current?.innerHTML || '';
    if (undoStack.current.at(-1) === html) return;
    undoStack.current.push(html);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
  };
  const emit = () => {
    const html = editor.current?.innerHTML || '';
    onChange(sanitizeCommunityHtml(html));
  };
  // 외부 웹페이지의 HTML을 붙여넣으면 폭·열 같은 레이아웃 스타일이 함께 들어온다.
  // 편집기와 게시물이 같은 안전한 HTML을 사용하도록, 붙여넣기/편집 완료 시에만 DOM도 정리한다.
  const normalizeEditorMarkup = () => {
    const html = editor.current?.innerHTML || '';
    const normalized = sanitizeCommunityHtml(html);
    if (editor.current && editor.current.innerHTML !== normalized) editor.current.innerHTML = normalized;
    onChange(normalized);
  };
  const prepareContentForDisplay = () => {
    const root = editor.current;
    if (!root) return '';
    root.querySelectorAll('br[data-community-soft-break]').forEach(element => element.remove());
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current: Node | null;
    while ((current = walker.nextNode())) if (current.textContent) textNodes.push(current as Text);
    const lineBreaks = new Map<Text, number[]>();
    let previousBlock: Element | null = null;
    let previousTop: number | null = null;
    const range = document.createRange();
    textNodes.forEach(textNode => {
      const block = textNode.parentElement?.closest('p, div, h2, h3, li, blockquote') || null;
      if (block !== previousBlock || textNode.previousSibling?.nodeName === 'BR') { previousBlock = block; previousTop = null; }
      const breaks: number[] = [];
      for (let index = 0; index < textNode.data.length; index += 1) {
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.height) continue;
        const top = Math.round(rect.top * 2) / 2;
        if (previousTop !== null && top > previousTop + 0.5) breaks.push(index);
        previousTop = top;
      }
      if (breaks.length) lineBreaks.set(textNode, breaks);
    });
    lineBreaks.forEach((breaks, textNode) => {
      [...breaks].sort((left, right) => right - left).forEach(index => {
        const suffix = textNode.splitText(index);
        const lineBreak = document.createElement('br');
        lineBreak.setAttribute('data-community-soft-break', 'true');
        suffix.before(lineBreak);
      });
    });
    const normalized = sanitizeCommunityHtml(root.innerHTML);
    if (root.innerHTML !== normalized) root.innerHTML = normalized;
    onChange(normalized);
    return normalized;
  };
  useEffect(() => {
    if (!prepareContentRef) return;
    prepareContentRef.current = prepareContentForDisplay;
    return () => { prepareContentRef.current = null; };
  }, [prepareContentRef, value]);
  const selectImage = (image: HTMLImageElement) => {
    const shell = editor.current?.parentElement;
    if (!shell) return;
    const imageRect = image.getBoundingClientRect(); const shellRect = shell.getBoundingClientRect();
    setSelectedImage({ image, top: imageRect.top - shellRect.top - 10, left: imageRect.right - shellRect.left - 10 });
  };
  const deleteSelectedImage = () => {
    saveUndoPoint();
    if (selectedImage && representativeImageUrl === selectedImage.image.src) onRepresentativeImageChange?.(null);
    selectedImage?.image.remove();
    setSelectedImage(null);
    emit();
  };
  const startImageResize = (event: React.MouseEvent<HTMLDivElement>) => {
    const image = event.target;
    if (event.button !== 0 || !(image instanceof HTMLImageElement)) { setSelectedImage(null); return; }
    event.preventDefault();
    editor.current?.focus();
    selectImage(image);
    saveUndoPoint();
    const startX = event.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const maxWidth = editor.current?.clientWidth || startWidth;
    const resize = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(120, Math.min(maxWidth, startWidth + moveEvent.clientX - startX));
      image.style.width = `${Math.round(nextWidth)}px`;
      image.style.height = 'auto';
    };
    const finish = () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', finish);
      selectImage(image);
      emit();
    };
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', finish);
  };
  const restoreHistory = (from: React.MutableRefObject<string[]>, to: React.MutableRefObject<string[]>) => {
    if (!editor.current) return;
    const html = from.current.pop();
    if (html === undefined) return;
    to.current.push(editor.current.innerHTML);
    editor.current.innerHTML = html;
    setSelectedImage(null);
    onChange(normalizeEditorLinks(html));
  };
  const undo = () => restoreHistory(undoStack, redoStack);
  const redo = () => restoreHistory(redoStack, undoStack);
  const command = (name: string, argument?: string) => { saveUndoPoint(); editor.current?.focus(); document.execCommand(name, false, argument); emit(); };
  const selectedLink = () => { const url = window.prompt('연결할 URL을 입력하세요.', 'https://'); if (url && /^https?:\/\//i.test(url)) command('createLink', url); };
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('이미지 파일만 첨부할 수 있습니다.'); return; } setUploading('사진 업로드 중…'); setError(''); try { const url = onImageUpload ? await onImageUpload(file) : await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.')); reader.readAsDataURL(file); }); command('insertImage', url); } catch (caught) { setError(caught instanceof Error ? caught.message : '사진을 첨부하지 못했습니다.'); } finally { setUploading(''); event.target.value = ''; } };
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !onFileUpload) return; setUploading('파일 업로드 중…'); setError(''); try { const uploaded = await onFileUpload(file); editor.current?.focus(); document.execCommand('insertHTML', false, `<p><a href="${uploaded.url}" target="_blank" rel="noopener noreferrer">📎 ${uploaded.name}</a></p>`); emit(); } catch (caught) { setError(caught instanceof Error ? caught.message : '파일을 첨부하지 못했습니다.'); } finally { setUploading(''); event.target.value = ''; } };
  return <div className="rich-editor">
    <div className="rich-toolbar">
      <select aria-label="글꼴" defaultValue="Pretendard" onChange={event => command('fontName', event.target.value)}><option value="Pretendard">기본서체</option><option value="Malgun Gothic">맑은 고딕</option><option value="Nanum Gothic">나눔고딕</option><option value="serif">명조체</option></select>
      <select aria-label="글자 크기" defaultValue="3" onChange={event => command('fontSize', event.target.value)}><option value="2">13</option><option value="3">15</option><option value="4">18</option><option value="5">24</option><option value="6">32</option></select>
      <button type="button" title="되돌리기 (Ctrl+Z)" onClick={undo}>↶</button><button type="button" title="다시 실행 (Ctrl+Y)" onClick={redo}>↷</button>
      <span className="toolbar-divider" />
      <button type="button" title="굵게" onClick={() => command('bold')}><b>B</b></button><button type="button" title="기울임" onClick={() => command('italic')}><i>I</i></button><button type="button" title="밑줄" onClick={() => command('underline')}><u>U</u></button>
      <span className="toolbar-divider" /><button type="button" title="왼쪽 정렬" onClick={() => command('justifyLeft')}>≡</button><button type="button" title="가운데 정렬" onClick={() => command('justifyCenter')}>≡</button><button type="button" title="오른쪽 정렬" onClick={() => command('justifyRight')}>≡</button>
      <span className="toolbar-divider" /><button type="button" title="글머리 기호" onClick={() => command('insertUnorderedList')}>• 목록</button><button type="button" title="번호 목록" onClick={() => command('insertOrderedList')}>1. 목록</button><button type="button" title="인용" onClick={() => command('formatBlock', 'blockquote')}>❝</button>
      <span className="toolbar-divider" /><button type="button" title="링크" onClick={selectedLink}>🔗 링크</button><button type="button" title="사진 첨부" onClick={() => imageInput.current?.click()} disabled={Boolean(uploading)}>▧ 사진</button><button type="button" title="파일 첨부" onClick={() => fileInput.current?.click()} disabled={!onFileUpload || Boolean(uploading)}>📎 파일</button>
      <input ref={imageInput} className="image-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} /><input ref={fileInput} className="image-file-input" type="file" onChange={uploadFile} />
    </div>
    {uploading && <p className="upload-status">{uploading}</p>}{error && <p className="upload-error">{error}</p>}
    <div ref={editor} className="rich-editor-canvas" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onMouseDown={startImageResize} onBeforeInput={saveUndoPoint} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; } if (selectedImage && (event.key === 'Backspace' || event.key === 'Delete')) { event.preventDefault(); deleteSelectedImage(); } }} onFocus={() => { editing.current = true; }} onBlur={() => { editing.current = false; if (!composing.current) normalizeEditorMarkup(); }} onPaste={() => { window.setTimeout(() => { if (!composing.current) normalizeEditorMarkup(); }, 0); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; emit(); }} onInput={() => { if (!composing.current) emit(); }} />
    {selectedImage && <div className="rich-editor-image-actions" style={{ top: selectedImage.top, left: selectedImage.left }} onMouseDown={event => event.preventDefault()}>{onRepresentativeImageChange && <button type="button" className={representativeImageUrl === selectedImage.image.src ? 'representative active' : 'representative'} onClick={() => onRepresentativeImageChange(selectedImage.image.src)}>{representativeImageUrl === selectedImage.image.src ? '대표 사진' : '대표로 설정'}</button>}<button type="button" className="rich-editor-image-delete" aria-label="사진 삭제" title="사진 삭제" onClick={deleteSelectedImage}>×</button></div>}
  </div>;
}
