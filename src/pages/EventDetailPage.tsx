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
      console.log('Event data loaded:', eventData); // 디버그: 전체 이벤트 데이터
      console.log('venueEventPageUrl:', eventData?.venueEventPageUrl); // 디버그: URL 확인
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
    console.log('Badge:', badge, 'Days until start:', daysUntilStart); // 디버그 로그
    // COMING SOON이나 D-Day일 때 일수 표시
    if (badge === 'D-Day' || badge === 'COMING SOON') {
      return `D-${daysUntilStart}`;
    }
    return badge;
  };

  const formatDateRange = () => {
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    
    const startStr = `${event.startDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.startDate)}`;
    const endStr = `${event.endDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.endDate)}`;
    return `${startStr} ~ ${endStr}`;
  };

  // 킨텍스 전용: 운영시간 포맷팅 (날짜 + 시간)
  const formatKintexOperatingHours = () => {
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    
    const formatDate = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}${generateDayString(date)}`;
    };
    
    const dateRange = `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
    const timeInfo = event.operatingHours || '';
    
    // 시간 정보가 없으면 날짜만 반환
    if (!timeInfo.trim()) {
      return dateRange;
    }
    
    return `${dateRange}\n${timeInfo}`;
  };

  // Contact 필드 포맷팅 (줄바꿈이 없는 경우 추가)
  const formatContact = (contact: string) => {
    // 이미 줄바꿈이 있으면 그대로 반환
    if (contact.includes('\n')) {
      return contact;
    }
    
    // "담당자:" 레이블 찾기
    let formatted = contact;
    
    // "담당자:" 다음에 오는 이름과 나머지를 분리
    const contactMatch = contact.match(/^(.+?)\s+(Email:|Tel:|Fax:)/i);
    if (contactMatch) {
      const name = contactMatch[1].trim();
      const rest = contact.substring(contactMatch[1].length).trim();
      
      // 이름을 첫 줄에, 나머지를 각각 새 줄에
      formatted = name + '\n' + rest
        .replace(/\s+(Email:)/gi, '\n$1')
        .replace(/\s+(Tel:)/gi, '\n$1')
        .replace(/\s+(Fax:)/gi, '\n$1');
    } else {
      // "담당자:" 패턴이 없으면 기존 방식 사용
      formatted = contact
        .replace(/\s+(Email:)/gi, '\n$1')
        .replace(/\s+(Tel:)/gi, '\n$1')
        .replace(/\s+(Fax:)/gi, '\n$1');
    }
    
    return formatted.trim();
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
          {/* Event Info Section - Layout varies by venue */}
          {event.venue === '세텍' ? (
            /* SETEC Layout: Details first, then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
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
                <div className="detail-item">
                  <DollarSign size={24} />
                  <div>
                    <h4>입장료</h4>
                    <p>{event.admissionFee || '미상'}</p>
                  </div>
                </div>
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

              <div style={{ marginTop: '30px' }}>
                <h3>관람 장소</h3>
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>

              {event.exhibitItems && (
                <div style={{ marginTop: '20px' }}>
                  <h3>전시품목</h3>
                  <p>{event.exhibitItems}</p>
                </div>
              )}

              {event.description && (
                <div style={{ marginTop: '40px' }}>
                  <h3>행사 소개</h3>
                  <div className="event-theme">
                    <p>{event.description}</p>
                  </div>
                </div>
              )}
            </section>
          ) : event.venue === '킨텍스' ? (
            /* KINTEX Layout: Description, then details */
            <section className="event-section">
              <h2>행사 소개</h2>
              {event.description ? (
                <div className="event-theme">
                  <p>{event.description}</p>
                </div>
              ) : (
                <div className="event-theme">
                  <p>행사 소개 정보가 제공되지 않았습니다.</p>
                </div>
              )}

              <div className="event-details-grid" style={{ marginTop: '30px' }}>
                {event.operatingHours && (
                  <div className="detail-item">
                    <Clock size={24} />
                    <div>
                      <h4>운영 시간</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>{formatKintexOperatingHours()}</p>
                    </div>
                  </div>
                )}
                <div className="detail-item">
                  <DollarSign size={24} />
                  <div>
                    <h4>입장료</h4>
                    <p>{event.admissionFee || ''}</p>
                  </div>
                </div>
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
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>
            </section>
          ) : (
            /* COEX and other venues: Description first, then details */
            <section className="event-section">
              <h2>행사 소개</h2>
              {event.description ? (
                <div className="event-theme">
                  <p>{event.description}</p>
                </div>
              ) : (
                <div className="event-theme">
                  <p>행사 소개 정보가 제공되지 않았습니다.</p>
                </div>
              )}

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
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>
            </section>
          )}

          {/* External Links */}
          <section className="event-section">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {event.venueEventPageUrl && (
                <a href={event.venueEventPageUrl} target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                  <ExternalLink size={20} /> 전시장 행사 페이지
                </a>
              )}
              {event.targetLink && (
                <a href={event.targetLink} target="_blank" rel="noopener noreferrer" className="btn-official-website">
                  <ExternalLink size={20} /> 공식 웹사이트 방문
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
