import { useRef, useEffect } from 'react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = '내용을 입력하세요...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기값 설정
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // 에디터 내용 변경 핸들러
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // 서식 적용 함수
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // 색상 선택 핸들러
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFormat('foreColor', e.target.value);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('이미지 크기는 2MB 이하여야 합니다.');
      return;
    }

    // Base64로 변환하여 삽입
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      // 이미지 태그 삽입
      document.execCommand('insertHTML', false, `<img src="${base64}" alt="uploaded" style="max-width: 100%; height: auto; margin: 10px 0;" />`);
      editorRef.current?.focus();
    };
    reader.readAsDataURL(file);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rich-text-editor">
      {/* 툴바 */}
      <div className="editor-toolbar">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('bold')}
          title="굵게 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('italic')}
          title="기울임 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('underline')}
          title="밑줄 (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('strikeThrough')}
          title="취소선"
        >
          <s>S</s>
        </button>
        
        <div className="toolbar-divider" />
        
        {/* 색상 선택 */}
        <label className="toolbar-btn color-picker-label" title="텍스트 색상">
          <span>A</span>
          <input
            type="color"
            className="color-picker"
            onChange={handleColorChange}
            defaultValue="#000000"
          />
        </label>
        
        <div className="toolbar-divider" />
        
        {/* 정렬 */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('justifyLeft')}
          title="왼쪽 정렬"
        >
          ≡
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('justifyCenter')}
          title="가운데 정렬"
        >
          ≣
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('justifyRight')}
          title="오른쪽 정렬"
        >
          ≡
        </button>
        
        <div className="toolbar-divider" />
        
        {/* 리스트 */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('insertUnorderedList')}
          title="글머리 기호"
        >
          • 목록
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('insertOrderedList')}
          title="번호 매기기"
        >
          1. 목록
        </button>
        
        <div className="toolbar-divider" />
        
        {/* 이미지 삽입 */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="이미지 삽입"
        >
          🖼️ 이미지
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        
        <div className="toolbar-divider" />
        
        {/* 링크 */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            const url = prompt('링크 URL을 입력하세요:');
            if (url) {
              applyFormat('createLink', url);
            }
          }}
          title="링크 삽입"
        >
          🔗 링크
        </button>
        
        {/* 서식 제거 */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => applyFormat('removeFormat')}
          title="서식 제거"
        >
          ✕ 서식제거
        </button>
      </div>

      {/* 에디터 영역 */}
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
