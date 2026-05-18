import { useState, useEffect } from 'react';
import { fetchActiveBanners } from '../services/bannerService';
import type { Banner as BannerType } from '../types/banner';
import './Banner.css';

export function Banner() {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBanners() {
      const data = await fetchActiveBanners();
      setBanners(data);
      setLoading(false);
    }
    loadBanners();
  }, []);

  // 배너가 여러 개일 경우 자동 슬라이드
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5초마다 전환

    return () => clearInterval(interval);
  }, [banners.length]);

  // 이전 배너로 이동
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // 다음 배너로 이동
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return <div className="banner-container loading">배너를 불러오는 중...</div>;
  }

  if (banners.length === 0) {
    // 배너가 없을 때 빈 공간 표시
    return (
      <div className="banner-container empty">
        <div className="banner-empty-state">
          <p className="empty-icon">🎨</p>
          <p className="empty-title">배너 영역</p>
          <p className="empty-description">
            이미지 배너, YouTube 영상, 텍스트 공지를 추가할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  const renderBannerContent = () => {
    switch (currentBanner.type) {
      case 'image':
        return (
          <div className="banner-image-wrapper">
            {currentBanner.link_url ? (
              <a 
                href={currentBanner.link_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="banner-link"
              >
                <img 
                  src={currentBanner.content} 
                  alt={currentBanner.title}
                  className="banner-image"
                />
              </a>
            ) : (
              <img 
                src={currentBanner.content} 
                alt={currentBanner.title}
                className="banner-image"
              />
            )}
          </div>
        );

      case 'youtube':
        return (
          <div className="banner-youtube-wrapper">
            <iframe
              src={`https://www.youtube.com/embed/${currentBanner.content}`}
              title={currentBanner.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="banner-youtube"
            />
          </div>
        );

      case 'text':
        return (
          <div className="banner-text-wrapper">
            <p className="banner-text">{currentBanner.content}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="banner-container">
      {renderBannerContent()}
      
      {/* 배너가 여러 개일 경우 이전/다음 버튼 표시 */}
      {banners.length > 1 && (
        <>
          <button
            className="banner-nav-btn banner-prev"
            onClick={handlePrev}
            aria-label="이전 배너"
          >
            ‹
          </button>
          <button
            className="banner-nav-btn banner-next"
            onClick={handleNext}
            aria-label="다음 배너"
          >
            ›
          </button>
        </>
      )}
      
      {/* 배너가 여러 개일 경우 인디케이터 표시 */}
      {banners.length > 1 && (
        <div className="banner-indicators">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`banner-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`배너 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
