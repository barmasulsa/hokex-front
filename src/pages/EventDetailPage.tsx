import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchEventById } from '../services/eventService';
import type { EventRecord } from '../types/core';
import { calculateStatusBadge, calculateDaysUntilStart } from '../utils/badgeCalculator';
import { Calendar, MapPin, Clock, DollarSign, Phone, ExternalLink, Share2, Copy } from 'lucide-react';

// 기본 포스터 이미지
const SONGDO_DEFAULT_POSTER = '/images/songdo-default-poster.jpg';
const KDJ_DEFAULT_POSTER = '/images/thumb.jpg';
const HICO_DEFAULT_POSTER = '/images/hico-default.png';

// 구미코 카테고리별 기본 포스터
const GUMICO_EXHIBITION_POSTER = '/images/gumico_exhibition.png';
const GUMICO_CONVENTION_POSTER = '/images/gumico_convention.png';
const GUMICO_EVENT_POSTER = '/images/gumico_event.png';

// 대전컨벤션센터 카테고리별 기본 포스터
const DCC_EXHIBITION_POSTER = '/images/dcc-exhibition.png';
const DCC_CONFERENCE_POSTER = '/images/dcc-conference.png';
const DCC_EVENT_POSTER = '/images/dcc-event.png';

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

  // 포스터 URL 결정: 포스터 없으면 venue별 기본 이미지
  const getPosterUrl = () => {
    if (!event.poster || event.poster.trim() === '') {
      // 송도컨벤시아
      if (event.venue === '송도컨벤시아') return SONGDO_DEFAULT_POSTER;
      
      // 김대중컨벤션센터
      if (event.venue === '김대중컨벤션센터') return KDJ_DEFAULT_POSTER;
      
      // 경주화백컨벤션센터
      if (event.venue === '경주화백컨벤션센터') return HICO_DEFAULT_POSTER;
      
      // 구미코: 카테고리별 기본 포스터
      if (event.venue === '구미코') {
        if (event.category === '전시') return GUMICO_EXHIBITION_POSTER;
        if (event.category === '회의') return GUMICO_CONVENTION_POSTER;
        if (event.category === '행사/공연') return GUMICO_EVENT_POSTER;
        return GUMICO_CONVENTION_POSTER;
      }
      
      // 대전컨벤션센터: 카테고리별 기본 포스터
      if (event.venue === '대전컨벤션센터') {
        if (event.category === '전시') return DCC_EXHIBITION_POSTER;
        if (event.category === '회의') return DCC_CONFERENCE_POSTER;
        if (event.category === '행사/공연') return DCC_EVENT_POSTER;
        return DCC_CONFERENCE_POSTER;
      }
      
      // 다른 venue는 송도 기본 포스터 사용
      return SONGDO_DEFAULT_POSTER;
    }
    return event.poster;
  };

  const posterUrl = getPosterUrl();

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

  // 벡스코 전용: 운영시간 포맷팅 (날짜 + 시간)
  const formatBexcoOperatingHours = () => {
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
    
    // operatingHours가 없으면 날짜만 반환
    if (!event.operatingHours || !event.operatingHours.trim()) {
      return dateRange;
    }
    
    // operatingHours에서 시간 정보 추출
    // 예: "2026.10.01 ~ 2026.10.04 10시 ~ 18시" -> "10시 ~ 18시"
    const timeMatch = event.operatingHours.match(/(\d{1,2})\s*시\s*~\s*(\d{1,2})\s*시/);
    if (timeMatch) {
      const startHour = timeMatch[1].padStart(2, '0');
      const endHour = timeMatch[2].padStart(2, '0');
      return `${dateRange}\n${startHour}:00 ~ ${endHour}:00`;
    }
    
    // 시간 패턴이 없으면 원본 operatingHours 사용
    return `${dateRange}\n${event.operatingHours}`;
  };

  // Contact 필드 포맷팅 (전화번호 / 이메일 형식을 Tel: / Email: 형식으로 변환)
  const formatContact = (contact: string) => {
    // 이미 Tel: 또는 Email: 형식이 있으면 그대로 반환
    if (contact.includes('Tel:') || contact.includes('Email:')) {
      // 줄바꿈이 없으면 추가
      if (!contact.includes('\n')) {
        let formatted = contact
          .replace(/\s+(Email:)/gi, '\n$1')
          .replace(/\s+(Tel:)/gi, '\n$1')
          .replace(/\s+(Fax:)/gi, '\n$1');
        return formatted.trim();
      }
      return contact;
    }
    
    // "전화번호 / 이메일" 형식을 "Tel: 전화번호\nEmail: 이메일" 형식으로 변환
    if (contact.includes(' / ')) {
      const parts = contact.split(' / ');
      const phone = parts[0].trim();
      const email = parts[1]?.trim();
      
      if (email) {
        return `Tel: ${phone}\nEmail: ${email}`;
      } else {
        return `Tel: ${phone}`;
      }
    }
    
    // 이메일만 있는 경우 (@ 포함)
    if (contact.includes('@')) {
      return `Email: ${contact}`;
    }
    
    // 전화번호만 있는 경우 (숫자와 하이픈으로 시작)
    if (/^[\d\-\+\(\)]+/.test(contact)) {
      return `Tel: ${contact}`;
    }
    
    // 그 외의 경우 그대로 반환
    return contact;
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
      <div className="event-hero" style={{ backgroundImage: `url(${posterUrl})` }}>
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
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {event.operatingHours || formatDateRange()}
                    </p>
                  </div>
                </div>
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
                <h3>행사 장소</h3>
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
                  <p>정보 없음</p>
                </div>
              )}

              <div className="event-details-grid" style={{ marginTop: '30px' }}>
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {event.operatingHours ? formatKintexOperatingHours() : formatDateRange()}
                    </p>
                  </div>
                </div>
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

              <div style={{ marginTop: '30px' }}>
                <h3>행사 장소</h3>
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>

              {event.organizer && (
                <div style={{ marginTop: '20px' }}>
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
            </section>
          ) : event.venue === '벡스코' ? (
            /* BEXCO Layout: Details first (always show all fields), then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              <div className="event-details-grid">
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {formatBexcoOperatingHours()}
                    </p>
                  </div>
                </div>
                <div className="detail-item">
                  <DollarSign size={24} />
                  <div>
                    <h4>입장료</h4>
                    <p>{event.admissionFee || '미상'}</p>
                  </div>
                </div>
                <div className="detail-item">
                  <Phone size={24} />
                  <div>
                    <h4>문의</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>{event.contact ? formatContact(event.contact) : '미상'}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3>행사 장소</h3>
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>

              {event.organizer && (
                <div style={{ marginTop: '20px' }}>
                  <h3>주최/주관</h3>
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

              {event.description && (
                <div style={{ marginTop: '40px' }}>
                  <h3>행사 소개</h3>
                  <div className="event-theme">
                    <p>{event.description}</p>
                  </div>
                </div>
              )}
            </section>
          ) : event.venue === '창원컨벤션센터' ? (
            /* CECO Layout: Details first with manager/contact split, then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              <div className="event-details-grid">
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {event.operatingHours || formatDateRange()}
                    </p>
                  </div>
                </div>
                <div className="detail-item">
                  <DollarSign size={24} />
                  <div>
                    <h4>입장료</h4>
                    <p>{event.admissionFee || '미상'}</p>
                  </div>
                </div>
                {(event.manager || event.contact) && (
                  <div className="detail-item">
                    <Phone size={24} />
                    <div>
                      <h4>문의</h4>
                      {event.manager ? (
                        <>
                          <p>담당자: {event.manager}</p>
                          {event.contact && <p>Tel: {event.contact}</p>}
                        </>
                      ) : event.contact ? (
                        // manager가 없고 contact만 있는 경우: "담당자 / 전화번호" 형식 파싱
                        (() => {
                          const parts = event.contact.split(' / ');
                          if (parts.length === 2) {
                            return (
                              <>
                                <p>담당자: {parts[0].trim()}</p>
                                <p>Tel: {parts[1].trim()}</p>
                              </>
                            );
                          } else {
                            // "/"가 없으면 전화번호만 있는 것으로 간주
                            return <p>Tel: {event.contact}</p>;
                          }
                        })()
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3>행사 장소</h3>
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>

              {event.organizer && (
                <div style={{ marginTop: '20px' }}>
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

              {event.description && (
                <div style={{ marginTop: '40px' }}>
                  <h3>행사 소개</h3>
                  <div className="event-theme">
                    <p>{event.description}</p>
                  </div>
                </div>
              )}
            </section>
          ) : event.venue === '엑스코' ? (
            /* EXCO Layout: Description first, then details */
            <section className="event-section">
              {event.description && (
                <>
                  <h2>행사 소개</h2>
                  <div className="event-theme">
                    <p>{event.description}</p>
                  </div>
                </>
              )}

              <h2 style={{ marginTop: event.description ? '40px' : '0' }}>행사 정보</h2>
              <div className="event-details-grid">
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {event.operatingHours || formatDateRange()}
                    </p>
                  </div>
                </div>
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

              {event.exhibitProducts && (
                <div style={{ marginTop: '20px' }}>
                  <h3>전시제품</h3>
                  <p>{event.exhibitProducts}</p>
                </div>
              )}
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
                  <p>정보 없음</p>
                </div>
              )}

              <div className="event-details-grid">
                <div className="detail-item">
                  <Clock size={24} />
                  <div>
                    <h4>운영 시간</h4>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {event.operatingHours || formatDateRange()}
                    </p>
                  </div>
                </div>
                {event.admissionFee && (
                  <div className="detail-item">
                    <DollarSign size={24} />
                    <div>
                      <h4>입장료</h4>
                      <p>{event.admissionFee}</p>
                    </div>
                  </div>
                )}
                {(event.manager || event.contact) && (
                  <div className="detail-item">
                    <Phone size={24} />
                    <div>
                      <h4>문의</h4>
                      {event.manager && <p>담당자: {event.manager}</p>}
                      {event.contact && <p>Tel: {event.contact}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3>행사 장소</h3>
                <p>{event.venue}{event.venueHall ? ` - ${event.venueHall}` : ''}</p>
              </div>

              {event.organizer && (
                <div style={{ marginTop: '20px' }}>
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
            </section>
          )}

          {/* External Links */}
          <section className="event-section">
            <h2>관련 링크</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* 경주화백컨벤션센터는 HICO 홈페이지 링크 표시 */}
              {event.venue === '경주화백컨벤션센터' ? (
                <a href="https://www.hico.or.kr/" target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                  <ExternalLink size={20} /> 전시장 홈페이지
                </a>
              ) : (
                event.venueEventPageUrl ? (
                  <a href={event.venueEventPageUrl} target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                    <ExternalLink size={20} /> 전시장 행사 페이지
                  </a>
                ) : (
                  <div style={{ color: '#999', padding: '10px' }}>
                    전시장 행사 페이지 정보가 없습니다
                  </div>
                )
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
