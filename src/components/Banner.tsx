import { useState, useEffect } from 'react';
import { fetchActiveBanners } from '../services/bannerService';
import type { Banner as BannerType } from '../types/banner';
import './Banner.css';

export function Banner() {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [loading, setLoading] = useState(true);

  // 타입별로 배너 분류
  const [imageBanners, setImageBanners] = useState<BannerType[]>([]);
  const [youtubeBanners, setYoutubeBanners] = useState<BannerType[]>([]);
  const [textBanners, setTextBanners] = useState<BannerType[]>([]);

  // 각 타입별 현재 인덱스
  const [imageIndex, setImageIndex] = useState(0);
  const [youtubeIndex, setYoutubeIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    async function loadBanners() {
      const data = await fetchActiveBanners();
      setBanners(data);
      
      // 타입별로 분류
      setImageBanners(data.filter(b => b.type === 'image'));
      setYoutubeBanners(data.filter(b => b.type === 'youtube'));
      setTextBanners(data.filter(b => b.type === 'text'));
      
      setLoading(false);
    }
    loadBanners();
  }, []);

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

  // 텍스트 배너 자동 슬라이드
  useEffect(() => {
    if (textBanners.length <= 1) return;
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % textBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [textBanners.length]);

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
                src={`https://www.youtube.com/embed/${youtubeBanners[youtubeIndex].content}`}
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
          <>
            <div className="notice-content">
              <p className="notice-icon">🎉</p>
              <p className="notice-text">{textBanners[textIndex].content}</p>
            </div>
            {textBanners.length > 1 && (
              <>
                <button
                  className="nav-btn prev"
                  onClick={() => setTextIndex((prev) => (prev - 1 + textBanners.length) % textBanners.length)}
                >
                  ‹
                </button>
                <button
                  className="nav-btn next"
                  onClick={() => setTextIndex((prev) => (prev + 1) % textBanners.length)}
                >
                  ›
                </button>
                <div className="indicators">
                  {textBanners.map((_, i) => (
                    <button
                      key={i}
                      className={`indicator ${i === textIndex ? 'active' : ''}`}
                      onClick={() => setTextIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
