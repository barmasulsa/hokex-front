import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventRecord } from '../types/core';
import { calculateStatusBadge, calculateDaysUntilStart } from '../utils/badgeCalculator';

interface EventCardProps {
  event: EventRecord;
  isAdmin: boolean;
  onSave?: (eventId: string) => void;
  onEdit?: (eventId: string, field: string, value: string) => void;
}

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

export function EventCard({ event, isAdmin, onSave, onEdit }: EventCardProps) {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(event.title);
  
  const badge = calculateStatusBadge(event);
  const daysUntilStart = calculateDaysUntilStart(event);
  
  // 포스터 URL 결정: 포스터 없으면 venue별 기본 이미지
  const getPosterUrl = () => {
    console.log('[EventCard] Getting poster for:', event.title, 'venue:', event.venue, 'poster:', event.poster);
    
    // 포스터가 없거나 빈 문자열인 경우
    if (!event.poster || event.poster.trim() === '') {
      console.log('[EventCard] No poster, using default for venue:', event.venue);
      
      // 송도컨벤시아
      if (event.venue === '송도컨벤시아') return SONGDO_DEFAULT_POSTER;
      
      // 김대중컨벤션센터
      if (event.venue === '김대중컨벤션센터') return KDJ_DEFAULT_POSTER;
      
      // 경주화백컨벤션센터
      if (event.venue === '경주화백컨벤션센터') {
        console.log('[EventCard] Using HICO default poster');
        return HICO_DEFAULT_POSTER;
      }
      
      // 구미코: 카테고리별 기본 포스터
      if (event.venue === '구미코') {
        const category = Array.isArray(event.category) ? event.category[0] : event.category;
        if (category === '전시') return GUMICO_EXHIBITION_POSTER;
        if (category === '회의') return GUMICO_CONVENTION_POSTER;
        if (category === '행사/공연') return GUMICO_EVENT_POSTER;
        // 기타 카테고리는 컨벤션 포스터 사용
        return GUMICO_CONVENTION_POSTER;
      }
      
      // 대전컨벤션센터: 카테고리별 기본 포스터
      if (event.venue === '대전컨벤션센터') {
        const category = Array.isArray(event.category) ? event.category[0] : event.category;
        if (category === '전시') return DCC_EXHIBITION_POSTER;
        if (category === '회의') return DCC_CONFERENCE_POSTER;
        if (category === '행사/공연') return DCC_EVENT_POSTER;
        // 기타 카테고리는 회의 포스터 사용
        return DCC_CONFERENCE_POSTER;
      }
      
      // 다른 venue는 빈 문자열 반환 (포스터 없음)
      return '';
    }
    
    // 포스터가 있으면 그대로 사용
    return event.poster;
  };
  
  const posterUrl = getPosterUrl();
  const [imgError, setImgError] = useState(false);
  
  const generateDayString = (date: Date) => {
    const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
    return days[date.getDay()];
  };

  const formatDateRange = () => {
    const startStr = `${event.startDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.startDate)}`;
    const endStr = `${event.endDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.endDate)}`;
    return `${startStr} ~ ${endStr}`;
  };

  const getBadgeText = () => {
    console.log('Badge:', badge, 'Days until start:', daysUntilStart);
    if (badge && badge.toUpperCase() === 'D-DAY' && daysUntilStart >= 0) {
      return `D-DAY ${daysUntilStart}`;
    }
    return badge;
  };

  const handleTitleSave = () => {
    if (onEdit && editedTitle !== event.title) {
      onEdit(event.id, 'title', editedTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(event.title);
    setIsEditingTitle(false);
  };

  const handleCardClick = () => {
    // 스크롤 위치 저장
    sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
    navigate(`/event/${event.id}`);
  };

  return (
    <div className="event-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="card-image-wrap" style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}>
        <img 
          src={imgError ? (
            event.venue === '송도컨벤시아' ? SONGDO_DEFAULT_POSTER :
            event.venue === '김대중컨벤션센터' ? KDJ_DEFAULT_POSTER :
            event.venue === '경주화백컨벤션센터' ? HICO_DEFAULT_POSTER :
            event.venue === '구미코' ? (
              (Array.isArray(event.category) ? event.category[0] : event.category) === '전시' ? GUMICO_EXHIBITION_POSTER :
              (Array.isArray(event.category) ? event.category[0] : event.category) === '회의' ? GUMICO_CONVENTION_POSTER :
              (Array.isArray(event.category) ? event.category[0] : event.category) === '행사/공연' ? GUMICO_EVENT_POSTER :
              GUMICO_CONVENTION_POSTER
            ) :
            event.venue === '대전컨벤션센터' ? (
              (Array.isArray(event.category) ? event.category[0] : event.category) === '전시' ? DCC_EXHIBITION_POSTER :
              (Array.isArray(event.category) ? event.category[0] : event.category) === '회의' ? DCC_CONFERENCE_POSTER :
              (Array.isArray(event.category) ? event.category[0] : event.category) === '행사/공연' ? DCC_EVENT_POSTER :
              DCC_CONFERENCE_POSTER
            ) :
            event.venue === '킨텍스' ? '' :
            ''
          ) : posterUrl} 
          alt="" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none'
        }}></div>
        
        {badge && (
          <div className={`status-badge badge-${badge.toLowerCase().replace(/[\s-]+/g, '')}`}>
            {getBadgeText()}
          </div>
        )}
      </div>

      <div className="card-content" style={{ position: 'relative' }}>
        <button 
          className="save-btn-content"
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(event.id);
          }}
          style={{ color: event.isSaved ? '#EF4444' : '#999' }}
        >
          <svg style={{width:'20px', height:'20px'}} fill={event.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>

        <div className="card-tags">
          <span className="card-tag tag-industry">{event.industry}</span>
          {/* 다중 카테고리 지원 - 각 카테고리를 별도 배지로 렌더링 */}
          {Array.isArray(event.category) ? (
            event.category.map((cat, index) => (
              <span key={`${event.id}-cat-${index}`} className="card-tag tag-category">{cat}</span>
            ))
          ) : (
            <span className="card-tag tag-category">{event.category}</span>
          )}
        </div>

        {isEditingTitle ? (
          <div className="inline-edit" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              autoFocus
            />
            <button onClick={handleTitleSave}>✓</button>
            <button onClick={handleTitleCancel}>✕</button>
          </div>
        ) : (
          <h3 
            className={`card-title ${isAdmin ? 'editable' : ''}`}
            onClick={(e) => {
              if (isAdmin) {
                e.stopPropagation();
                setIsEditingTitle(true);
              }
            }}
          >
            {event.title}
          </h3>
        )}

        <p className="card-date">{formatDateRange()}</p>

        <div className="card-footer">
          <span className="card-venue">{event.venue}</span>
        </div>
      </div>
    </div>
  );
}
