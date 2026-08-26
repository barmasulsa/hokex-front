import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onFileUpload?: (file: File) => Promise<{ url: string; name: string }>;
}

const allowedTags = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG', 'H2', 'H3']);
export function sanitizeCommunityHtml(value: string) {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.body.querySelectorAll('*').forEach(element => {
    if (!allowedTags.has(element.tagName)) { element.replaceWith(...Array.from(element.childNodes)); return; }
    Array.from(element.attributes).forEach(attribute => {
      const allowed = (element.tagName === 'A' && ['href', 'target', 'rel'].includes(attribute.name)) || (element.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) || (['SPAN', 'DIV', 'P', 'H2', 'H3'].includes(element.tagName) && attribute.name === 'style');
      if (!allowed || /^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name);
    });
    if (element.hasAttribute('style')) {
      const style = element.getAttribute('style') || '';
      const safeStyle = style.split(';').map(rule => rule.trim()).filter(rule => /^(font-family|font-size|text-align|color)\s*:/i.test(rule) && !/expression|url\s*\(/i.test(rule)).join('; ');
      if (safeStyle) element.setAttribute('style', safeStyle); else element.removeAttribute('style');
    }
    if (element.tagName === 'A') { element.setAttribute('target', '_blank'); element.setAttribute('rel', 'noopener noreferrer'); }
  });
  return doc.body.innerHTML;
}

export function RichTextContent({ value }: { value: string }) {
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: sanitizeCommunityHtml(value) }} />;
}

export function RichTextEditor({ value, onChange, placeholder = '내용을 작성해주세요.', onImageUpload, onFileUpload }: Props) {
  const editor = useRef<HTMLDivElement>(null); const imageInput = useRef<HTMLInputElement>(null); const fileInput = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value; }, [value]);
  const emit = () => onChange(editor.current?.innerHTML || '');
  const command = (name: string, argument?: string) => { editor.current?.focus(); document.execCommand(name, false, argument); emit(); };
  const selectedLink = () => { const url = window.prompt('연결할 URL을 입력하세요.', 'https://'); if (url && /^https?:\/\//i.test(url)) command('createLink', url); };
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('이미지 파일만 첨부할 수 있습니다.'); return; } setUploading('사진 업로드 중…'); setError(''); try { const url = onImageUpload ? await onImageUpload(file) : await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.')); reader.readAsDataURL(file); }); command('insertImage', url); } catch (caught) { setError(caught instanceof Error ? caught.message : '사진을 첨부하지 못했습니다.'); } finally { setUploading(''); event.target.value = ''; } };
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !onFileUpload) return; setUploading('파일 업로드 중…'); setError(''); try { const uploaded = await onFileUpload(file); editor.current?.focus(); document.execCommand('insertHTML', false, `<p><a href="${uploaded.url}" target="_blank" rel="noopener noreferrer">📎 ${uploaded.name}</a></p>`); emit(); } catch (caught) { setError(caught instanceof Error ? caught.message : '파일을 첨부하지 못했습니다.'); } finally { setUploading(''); event.target.value = ''; } };
  return <div className="rich-editor">
    <div className="rich-toolbar">
      <select aria-label="글꼴" defaultValue="Pretendard" onChange={event => command('fontName', event.target.value)}><option value="Pretendard">기본서체</option><option value="Malgun Gothic">맑은 고딕</option><option value="Nanum Gothic">나눔고딕</option><option value="serif">명조체</option></select>
      <select aria-label="글자 크기" defaultValue="3" onChange={event => command('fontSize', event.target.value)}><option value="2">13</option><option value="3">15</option><option value="4">18</option><option value="5">24</option><option value="6">32</option></select>
      <span className="toolbar-divider" />
      <button type="button" title="굵게" onClick={() => command('bold')}><b>B</b></button><button type="button" title="기울임" onClick={() => command('italic')}><i>I</i></button><button type="button" title="밑줄" onClick={() => command('underline')}><u>U</u></button>
      <span className="toolbar-divider" /><button type="button" title="왼쪽 정렬" onClick={() => command('justifyLeft')}>≡</button><button type="button" title="가운데 정렬" onClick={() => command('justifyCenter')}>≡</button><button type="button" title="오른쪽 정렬" onClick={() => command('justifyRight')}>≡</button>
      <span className="toolbar-divider" /><button type="button" title="글머리 기호" onClick={() => command('insertUnorderedList')}>• 목록</button><button type="button" title="번호 목록" onClick={() => command('insertOrderedList')}>1. 목록</button><button type="button" title="인용" onClick={() => command('formatBlock', 'blockquote')}>❝</button>
      <span className="toolbar-divider" /><button type="button" title="링크" onClick={selectedLink}>🔗 링크</button><button type="button" title="사진 첨부" onClick={() => imageInput.current?.click()} disabled={Boolean(uploading)}>▧ 사진</button><button type="button" title="파일 첨부" onClick={() => fileInput.current?.click()} disabled={!onFileUpload || Boolean(uploading)}>📎 파일</button>
      <input ref={imageInput} className="image-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} /><input ref={fileInput} className="image-file-input" type="file" onChange={uploadFile} />
    </div>
    {uploading && <p className="upload-status">{uploading}</p>}{error && <p className="upload-error">{error}</p>}
    <div ref={editor} className="rich-editor-canvas" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={emit} />
  </div>;
}
