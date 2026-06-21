import { useState, useEffect } from 'react';
import { fetchActiveBanners, incrementBannerViewCount } from '../services/bannerService';
import type { Banner as BannerType } from '../types/banner';
import './Banner.css';

// YouTube URL에서 비디오 ID 추출
const extractYoutubeId = (url: string): string => {
  // 이미 ID만 있는 경우
  if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
    return url;
  }

  // 다양한 YouTube URL 형식 지원
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return url; // 추출 실패 시 원본 반환
};

interface BannerProps {
  announcementCategory?: 'homepage' | 'community';
}

export function Banner({ announcementCategory = 'homepage' }: BannerProps) {
  const [loading, setLoading] = useState(true);

  // 타입별로 배너 분류
  const [imageBanners, setImageBanners] = useState<BannerType[]>([]);
  const [youtubeBanners, setYoutubeBanners] = useState<BannerType[]>([]);
  const [textBanners, setTextBanners] = useState<BannerType[]>([]);

  // 각 타입별 현재 인덱스
  const [imageIndex, setImageIndex] = useState(0);
  const [youtubeIndex, setYoutubeIndex] = useState(0);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  useEffect(() => {
    async function loadBanners() {
      const data = await fetchActiveBanners(announcementCategory);
      
      // 타입별로 분류
      setImageBanners(data.filter(b => b.type === 'image'));
      setYoutubeBanners(data.filter(b => b.type === 'youtube'));
      setTextBanners(data.filter(b => b.type === 'text'));
      
      setLoading(false);
    }
    loadBanners();
  }, [announcementCategory]);

  // 이미지 배너 자동 슬라이드
  useEffect(() => {
    if (imageBanners.length <= 1) return;
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % imageBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [imageBanners.length]);

  // YouTube 배너 자동 슬라이드
  useEffect(() => {
    if (youtubeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setYoutubeIndex((prev) => (prev + 1) % youtubeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [youtubeBanners.length]);

  // HTML 콘텐츠를 안전하게 렌더링하기 위한 간단한 sanitize 함수
  const sanitizeHTML = (html: string): string => {
    // 위험한 태그와 속성 제거
    const dangerousTags = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|<object[^>]*>.*?<\/object>|<embed[^>]*>/gi;
    const dangerousAttrs = /on\w+\s*=\s*["'][^"']*["']|on\w+\s*=\s*[^\s>]*/gi;
    
    let sanitized = html.replace(dangerousTags, '');
    sanitized = sanitized.replace(dangerousAttrs, '');
    
    return sanitized;
  };

  // 공지사항 클릭 핸들러 (link_url이 있으면 바로 이동)
  const handleNoticeClick = async (banner: BannerType) => {
    // 조회수 증가 (하루 1회 중복 방지)
    await incrementBannerViewCount(banner.id);

    if (banner.link_url) {
      // link_url이 있으면 바로 이동
      console.log(`[Banner] Redirecting to: ${banner.link_url}`);
      window.open(banner.link_url, '_blank', 'noopener,noreferrer');
    } else {
      // link_url이 없으면 모달 열기
      setModalContent({ title: banner.title, content: banner.content });
      setIsModalOpen(true);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  if (loading) {
    return (
      <div className="banner-sections">
        <div className="banner-section loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="banner-sections">
      {/* 이미지 배너 섹션 */}
      <div className="banner-section image-section">
        {imageBanners.length === 0 ? (
          <div className="banner-empty">
            <p className="empty-title">배너 이미지</p>
            <p className="empty-desc">이미지 배너를 추가하세요</p>
          </div>
        ) : (
          <>
            {imageBanners[imageIndex].link_url ? (
              <a
                href={imageBanners[imageIndex].link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="banner-link"
              >
                <img
                  src={imageBanners[imageIndex].content}
                  alt={imageBanners[imageIndex].title}
                  className="banner-image"
                />
              </a>
            ) : (
              <img
                src={imageBanners[imageIndex].content}
                alt={imageBanners[imageIndex].title}
                className="banner-image"
              />
            )}
            {imageBanners.length > 1 && (
              <>
                <button
                  className="nav-btn prev"
                  onClick={() => setImageIndex((prev) => (prev - 1 + imageBanners.length) % imageBanners.length)}
                >
                  ‹
                </button>
                <button
                  className="nav-btn next"
                  onClick={() => setImageIndex((prev) => (prev + 1) % imageBanners.length)}
                >
                  ›
                </button>
                <div className="indicators">
                  {imageBanners.map((_, i) => (
                    <button
                      key={i}
                      className={`indicator ${i === imageIndex ? 'active' : ''}`}
                      onClick={() => setImageIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* YouTube 섹션 */}
      <div className="banner-section youtube-section">
        {youtubeBanners.length === 0 ? (
          <div className="banner-empty">
            <p className="empty-title">YouTube</p>
            <p className="empty-desc">YouTube 영상을 추가하세요</p>
          </div>
        ) : (
          <>
            <div className="youtube-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${extractYoutubeId(youtubeBanners[youtubeIndex].content)}`}
                title={youtubeBanners[youtubeIndex].title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="youtube-iframe"
              />
            </div>
            {youtubeBanners.length > 1 && (
              <>
                <button
                  className="nav-btn prev"
                  onClick={() => setYoutubeIndex((prev) => (prev - 1 + youtubeBanners.length) % youtubeBanners.length)}
                >
                  ‹
                </button>
                <button
                  className="nav-btn next"
                  onClick={() => setYoutubeIndex((prev) => (prev + 1) % youtubeBanners.length)}
                >
                  ›
                </button>
                <div className="indicators">
                  {youtubeBanners.map((_, i) => (
                    <button
                      key={i}
                      className={`indicator ${i === youtubeIndex ? 'active' : ''}`}
                      onClick={() => setYoutubeIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* 공지사항 섹션 */}
      <div className="banner-section notice-section">
        {textBanners.length === 0 ? (
          <div className="banner-empty">
            <p className="empty-title">공지사항</p>
            <p className="empty-desc">공지사항을 추가하세요</p>
          </div>
        ) : (
          <div className="notice-list">
            <div className="notice-header">
              <span className="notice-icon">📢</span>
              <h3 className="notice-header-title">공지사항</h3>
            </div>
            <div className="notice-items">
              {textBanners.map((banner, index) => (
                <div 
                  key={banner.id}
                  className="notice-item"
                  onClick={() => handleNoticeClick(banner)}
                >
                  <span className="notice-number">{index + 1}</span>
                  <span className="notice-item-title">{banner.title}</span>
                  <span className="notice-badge">N</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 공지사항 모달 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalContent.title}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div 
                className="modal-text"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(modalContent.content) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
