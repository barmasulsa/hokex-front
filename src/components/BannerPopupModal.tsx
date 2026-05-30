import { useEffect } from 'react';

interface BannerPopupModalProps {
  bannerId: string;
  title: string;
  content: string; // HTML 콘텐츠
  linkUrl?: string;
  onClose: () => void;
  onDismissForWeek: () => void;
}

export function BannerPopupModal({
  title,
  content,
  linkUrl,
  onClose,
  onDismissForWeek
}: BannerPopupModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="banner-popup-overlay" onClick={onClose}>
      <div className="banner-popup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="banner-popup-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div className="banner-popup-header">
          <h2>{title}</h2>
        </div>

        <div 
          className="banner-popup-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        <div className="banner-popup-footer">
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="banner-popup-link-btn"
            >
              자세히 보기 →
            </a>
          )}
          
          <div className="banner-popup-actions">
            <button
              className="banner-popup-dismiss-btn"
              onClick={() => {
                onDismissForWeek();
                onClose();
              }}
            >
              다시 보지 않기
            </button>
            <button className="banner-popup-confirm-btn" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
