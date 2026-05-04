import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchEventById } from '../services/eventService';
import type { EventRecord } from '../types/core';
import { calculateStatusBadge, calculateDaysUntilStart } from '../utils/badgeCalculator';
import { Calendar, MapPin, Clock, DollarSign, Phone, ExternalLink, Share2, Copy } from 'lucide-react';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      
      setLoading(true);
      const eventData = await fetchEventById(id);
      setEvent(eventData);
      setLoading(false);
    }
    
    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="event-detail-page">
        <div style={{ padding: '100px 20px', textAlign: 'center' }}>
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-not-found">
        <h2>행사를 찾을 수 없습니다</h2>
        <Link to="/">홈으로 돌아가기</Link>
      </div>
    );
  }

  const badge = calculateStatusBadge(event);
  const daysUntilStart = calculateDaysUntilStart(event);

  // D-Day 배지 텍스트 생성
  const getBadgeText = () => {
    if (badge === 'D-Day' && daysUntilStart > 0 && daysUntilStart < 60) {
      return `D-${daysUntilStart}`;
    }
    return badge;
  };

  const formatDateRange = () => {
    const startStr = `${event.startDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${event.dayString}`;
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    const endStr = `${event.endDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.endDate)}`;
    return `${startStr} ~ ${endStr}`;
  };

  // Contact 필드 포맷팅 (줄바꿈이 없는 경우 추가)
  const formatContact = (contact: string) => {
    // 이미 줄바꿈이 있으면 그대로 반환
    if (contact.includes('\n')) {
      return contact;
    }
    // Email:, Tel:, Fax: 앞에 줄바꿈 추가 (공백 1개 이상)
    return contact
      .replace(/\s+(Email:)/gi, '\n$1')
      .replace(/\s+(Tel:)/gi, '\n$1')
      .replace(/\s+(Fax:)/gi, '\n$1')
      .trim();
  };

  const handleAddToCalendar = () => {
    alert('캘린더 추가 기능 (Google/Apple/Outlook)');
  };

  const handleShare = () => {
    alert('카카오톡 공유 기능');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('링크가 복사되었습니다');
  };

  return (
    <div className="event-detail-page">
      {/* Hero Section */}
      <div className="event-hero" style={{ backgroundImage: `url(${event.poster})` }}>
        <div className="event-hero-overlay"></div>
        <div className="event-hero-content">
          <div className="event-hero-badge">{event.category}</div>
          <h1 className="event-hero-title">{event.title}</h1>
          <div className="event-hero-meta">
            <span><Calendar size={20} /> {formatDateRange()}</span>
            <span><MapPin size={20} /> {event.venue}, {event.region}</span>
          </div>
          <button className="btn-add-calendar" onClick={handleAddToCalendar}>
            <Calendar size={20} /> Add to Calendar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="event-content">
        <div className="event-main">
          {/* Event Info Section */}
          <section className="event-section">
            <h2>행사 소개</h2>
            <div className="event-theme">
              {event.description ? (
                <p>{event.description}</p>
              ) : (
                <>
                  <p>
                    {event.title}는 {event.industry} 분야의 최신 트렌드와 혁신 기술을 한자리에서 만나볼 수 있는 
                    국내 최대 규모의 전문 전시회입니다. 국내외 주요 기업들이 참가하여 신제품과 서비스를 선보이며, 
                    업계 전문가들과의 네트워킹 기회를 제공합니다.
                  </p>
                  <p>
                    다양한 컨퍼런스, 세미나, 워크숍이 함께 진행되어 산업 전반의 인사이트를 얻을 수 있으며, 
                    비즈니스 미팅 공간에서 실질적인 거래 상담도 가능합니다. 
                    {event.venue}에서 개최되는 이번 행사에 여러분을 초대합니다.
                  </p>
                </>
              )}
            </div>

            <div className="event-details-grid">
              {event.operatingHours && (
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{event.operatingHours}</p>
                  </div>
                </div>
              )}
              {event.admissionFee && (
                <div className="detail-item">
                  <DollarSign size={24} />
                  <div>
                    <h4>입장료</h4>
                    <p>{event.admissionFee}</p>
                  </div>
                </div>
              )}
              {event.contact && (
                <div className="detail-item">
                  <Phone size={24} />
                  <div>
                    <h4>문의</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{formatContact(event.contact)}</p>
                  </div>
                </div>
              )}
            </div>

            {event.organizer && (
              <div style={{ marginTop: '30px' }}>
                <h3>주최</h3>
                <p>{event.organizer}</p>
              </div>
            )}

            {event.supervisor && (
              <div style={{ marginTop: '20px' }}>
                <h3>주관</h3>
                <p>{event.supervisor}</p>
              </div>
            )}

            {event.exhibitItems && (
              <div style={{ marginTop: '20px' }}>
                <h3>전시품목</h3>
                <p>{event.exhibitItems}</p>
              </div>
            )}

            <div style={{ marginTop: '30px' }}>
              <h3>관람 장소</h3>
              <p>{event.venue}{event.venueHall ? ` ${event.venueHall.replace(/([A-Z])(?=[A-Z]|$)/g, ' $1').trim()}` : ''}</p>
            </div>
          </section>

          {/* External Links */}
          <section className="event-section">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {event.targetLink && (
                <a href={event.targetLink} target="_blank" rel="noopener noreferrer" className="btn-official-website">
                  <ExternalLink size={20} /> 공식 웹사이트 방문
                </a>
              )}
              {event.venueEventPageUrl && (
                <a href={event.venueEventPageUrl} target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                  <ExternalLink size={20} /> 전시장 행사 페이지
                </a>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="event-sidebar">
          {/* Share */}
          <div className="sidebar-card">
            <h3>공유하기</h3>
            <div className="share-buttons">
              <button onClick={handleShare} className="btn-share">
                <Share2 size={20} /> 카카오톡
              </button>
              <button onClick={handleCopyLink} className="btn-share">
                <Copy size={20} /> 링크 복사
              </button>
            </div>
          </div>

          {/* Status Badge */}
          {badge && (
            <div className="sidebar-card">
              <div className={`status-badge-large badge-${badge.toLowerCase().replace(/[\s-]+/g, '')}`}>
                {getBadgeText()}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="event-footer">
        <div className="footer-links">
          <a href="#">개인정보 처리방침</a>
          <a href="#">이용약관</a>
          <a href="#">고객 지원</a>
          <a href="#">글로벌 네트워크</a>
        </div>
        <p>© 2024 HOKEX MICE Architectural Curator. All rights reserved.</p>
      </footer>
    </div>
  );
}
