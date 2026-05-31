import { useEffect } from 'react';
import './BannerPopupModal.css';

interface BannerPopupModalProps {
  bannerId: string;
  title: string;
  content: string; // HTML 콘텐츠
  linkUrl?: string | null;
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
  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="banner-popup-overlay">
      <div className="banner-popup-modal">
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
