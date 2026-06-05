import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { EventRecord } from '../types/core';
import { calculateStatusBadge, calculateDaysUntilStart } from '../utils/badgeCalculator';

interface EventCardProps {
  event: EventRecord;
  onSave?: (eventId: string) => void;
  onEdit?: (eventId: string, field: string, value: string) => void;
  onDelete?: (eventId: string) => void;
  showViewCount?: boolean; // 조회수 표시 여부 (관리자 전용)
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

// 수원메쎄 기본 포스터
const SUWONMESSE_DEFAULT_POSTER = '/images/suwonmesse-default.png';

export function EventCard({ event, onSave, onEdit, onDelete, showViewCount }: EventCardProps) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(event.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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
      
      // 수원메쎄
      if (event.venue === '수원메쎄') return SUWONMESSE_DEFAULT_POSTER;
      
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 우클릭(button=2), 중간클릭(button=1), Ctrl/Cmd/Shift 클릭은 브라우저 기본 동작 허용
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
      console.log('[EventCard] Special click detected - allowing browser default');
      return; // 브라우저가 새 탭에서 열기 처리
    }

    // 일반 좌클릭만 가로채서 처리
    e.preventDefault(); // 기본 링크 동작 방지
    console.log('[EventCard] Normal left click - saving scroll position and navigating');
    
    // 현재 스크롤 위치 저장
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    sessionStorage.setItem('homeScrollPosition', scrollY.toString());
    console.log('[EventCard] Saved scroll position:', scrollY);
    
    // 프로그래밍 방식으로 이동
    navigate(`/event/${event.id}`);
  };

  const handleAuxClick = () => {
    // 중간 클릭(휠 클릭)은 브라우저가 자동으로 새 탭에서 열도록 허용
    console.log('[EventCard] Aux click (middle button) detected');
  };

  const handleContextMenu = () => {
    // 우클릭 컨텍스트 메뉴는 정상 작동하도록 허용
    console.log('[EventCard] Context menu (right click) detected');
  };

  return (
    <a
      href={`/event/${event.id}`}
      className="event-card"
      data-event-id={event.id}
      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      onContextMenu={handleContextMenu}
    >
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
            event.venue === '수원메쎄' ? SUWONMESSE_DEFAULT_POSTER :
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
        
        {showViewCount && (
          <div className="view-count-badge" style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(4px)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {(event.view_count || 0).toLocaleString()}
          </div>
        )}
      </div>

      <div className="card-content" style={{ position: 'relative' }}>
        <button 
          className="save-btn-content"
          onClick={(e) => {
            e.preventDefault();
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
          {/* 카테고리 배지 - 단일 배지만 표시 */}
          {Array.isArray(event.category) ? (
            <span className="card-tag tag-category">{event.category[0]}</span>
          ) : (
            <span className="card-tag tag-category">{event.category}</span>
          )}
          {/* 전시품목 배지 - 첫 번째 항목만 표시 */}
          {event.exhibit_items && Array.isArray(event.exhibit_items) && event.exhibit_items.length > 0 && (
            <span className="card-tag tag-exhibit">{event.exhibit_items[0]}</span>
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
          {isAdmin && onDelete && (
            <button
              className="delete-event-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (showDeleteConfirm) {
                  onDelete(event.id);
                  setShowDeleteConfirm(false);
                } else {
                  setShowDeleteConfirm(true);
                  setTimeout(() => setShowDeleteConfirm(false), 3000);
                }
              }}
              title={showDeleteConfirm ? "클릭하여 삭제 확인" : "행사 삭제"}
            >
              {showDeleteConfirm ? '✓ 삭제 확인' : '🗑️'}
            </button>
          )}
        </div>
      </div>
    </a>
  );
}
