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

  if (loading) {
    return <div className="banner-container loading">배너를 불러오는 중...</div>;
  }

  if (banners.length === 0) {
    return null; // 배너가 없으면 아무것도 표시하지 않음
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
