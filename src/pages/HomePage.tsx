import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '../components/EventCard';
import { Banner } from '../components/Banner';
import { fetchEvents, fetchSavedEventIds, toggleSaveEvent } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';
import { getCachedVisitorStats } from '../utils/detailedAnalytics';
import { PresenceManager } from '../utils/onlinePresence';
import { supabase } from '../lib/supabase';
import type { EventRecord, Venue } from '../types/core';
import { Region, Category, REGION_VENUE_MAP } from '../types/core';
import { FilterEngine } from '../utils/filterEngine';

// KOSIS 18개 품목 카테고리
const INDUSTRIES = [
  '농수축산/식음료',
  '에너지/환경',
  '섬유/의류/쥬얼리',
  '금속/기계/장비',
  '전기/전자/정보통신/방송',
  '보건/의료/광학/정밀',
  '건설/건축/인테리어',
  '운송장비/서비스',
  '가정용품/선물용품',
  '뷰티/화장품',
  '금융/부동산/전문서비스',
  '공공/국방',
  '교육',
  '임신/출산/육아',
  '웨딩',
  '문화/예술',
  '레저/관광/스포츠',
  '기타'
];

export function HomePage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteMode, setShowDeleteMode] = useState(false); // 삭제 모드 토글
  const [visitorStats, setVisitorStats] = useState({
    today: 0,
    last7Days: 0,
    last30Days: 0
  });
  const [onlineCount, setOnlineCount] = useState<number>(0);
  
  // 데이터 로드 여부를 추적하는 ref
  const hasLoadedData = useRef(false);

  // 로그인 체크 - Stibee 구독자만 홈페이지 이용 가능
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);
  
  // sessionStorage에서 필터 상태 복원
  const getInitialFilterState = () => {
    const saved = sessionStorage.getItem('homeFilterState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const initialState = getInitialFilterState();
  
  // 필터 상태
  const [selectedRegion, setSelectedRegion] = useState<Region | '전체'>(initialState?.selectedRegion || '전체');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(initialState?.selectedVenue || null); // 단일 선택으로 변경
  const [selectedMonth, setSelectedMonth] = useState<string | '전체'>(initialState?.selectedMonth || '전체');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(initialState?.selectedCategories || []); // 배열로 변경
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialState?.selectedIndustries || []);
  const [searchQuery, setSearchQuery] = useState<string>(initialState?.searchQuery || '');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(initialState?.dateRange || null);
  const [expandedRegion, setExpandedRegion] = useState<Region | null>(initialState?.expandedRegion || null);
  const [showIndustries, setShowIndustries] = useState(false);
  const [showCurrentOnly, setShowCurrentOnly] = useState<boolean>(initialState?.showCurrentOnly ?? false); // 기본값: 전체 행사 표시

  // 필터링된 이벤트
  const [filteredEvents, setFilteredEvents] = useState<EventRecord[]>(events);

  // Supabase에서 데이터 가져오기 - 한 번만 실행
  useEffect(() => {
    async function loadEvents() {
      // 이미 데이터를 로드했으면 다시 로드하지 않음
      if (hasLoadedData.current) {
        console.log('[HomePage] Data already loaded, skipping fetch');
        return;
      }
      
      console.log('[HomePage] loadEvents started');
      try {
        setLoading(true);
        console.log('[HomePage] Calling fetchEvents...');
        const data = await fetchEvents();
        console.log('[HomePage] fetchEvents completed, got', data.length, 'events');
        
        // 사용자가 로그인되어 있으면 저장된 행사 ID 가져오기
        if (user) {
          console.log('[HomePage] Fetching saved event IDs for user:', user.id);
          const savedIds = await fetchSavedEventIds(user.id);
          const savedIdsSet = new Set(savedIds);
          
          // isSaved 플래그 설정
          const eventsWithSaved = data.map(event => ({
            ...event,
            isSaved: savedIdsSet.has(event.id)
          }));
          
          console.log('[HomePage] Setting events with saved flags');
          setEvents(eventsWithSaved);
        } else {
          console.log('[HomePage] Setting events without saved flags');
          setEvents(data);
        }
        
        // 데이터 로드 완료 표시
        hasLoadedData.current = true;
        console.log('[HomePage] Events set successfully, marked as loaded');
      } catch (error) {
        console.error('[HomePage] 행사 데이터 로딩 실패:', error);
        setEvents([]);
      } finally {
        console.log('[HomePage] Setting loading to false');
        setLoading(false);
      }
    }
    
    if (user && !hasLoadedData.current) {
      loadEvents();
    }
  }, [user]);

  // 방문자 통계 가져오기 (캐시 사용 - 빠름)
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getCachedVisitorStats();
      setVisitorStats(stats);
    };
    
    loadStats();
    
    // 1분마다 통계 업데이트 (캐시에서 읽기만 하므로 빠름)
    const interval = setInterval(() => {
      loadStats();
    }, 60000); // 60초
    
    return () => clearInterval(interval);
  }, []);

  // 현재 접속 인원 추적 (Supabase Realtime)
  useEffect(() => {
    const presenceManager = new PresenceManager();
    
    // Presence 시작
    presenceManager.start((count) => {
      setOnlineCount(count);
    });
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      presenceManager.stop();
    };
  }, []);

  // 스크롤 위치 복원 제거 - App.tsx의 ScrollRestoration에서 처리하므로 중복 제거
  // HomePage에서는 필요 없음

  // 필터 상태 저장
  useEffect(() => {
    const filterState = {
      selectedRegion,
      selectedVenue, // 변경
      selectedMonth,
      selectedCategories, // 변경
      selectedIndustries,
      searchQuery,
      dateRange,
      expandedRegion,
      showCurrentOnly
    };
    sessionStorage.setItem('homeFilterState', JSON.stringify(filterState));
  }, [selectedRegion, selectedVenue, selectedMonth, selectedCategories, selectedIndustries, searchQuery, dateRange, expandedRegion, showCurrentOnly]);

  useEffect(() => {
    console.log('[HomePage] Filtering with:', {
      venue: selectedVenue,
      categories: selectedCategories,
      month: selectedMonth,
      showCurrentOnly,
      dateRange,
      totalEvents: events.length
    });

    // 기본 필터링 (과거 행사 제외)
    let processed = events;
    
    // showCurrentOnly가 true이고 날짜 범위가 설정되지 않았을 때만 과거 행사 필터링
    if (showCurrentOnly && !dateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      processed = processed.filter(event => {
        const eventEnd = new Date(event.endDate);
        eventEnd.setHours(0, 0, 0, 0);
        return eventEnd >= today;
      });
    }
    
    console.log('[HomePage] After showCurrentOnly filter:', processed.length);
    
    // 지역 필터링
    if (selectedRegion !== '전체') {
      processed = processed.filter(event => event.region === selectedRegion);
    }
    
    // 단일 venue 필터링
    if (selectedVenue) {
      processed = processed.filter(event => event.venue === selectedVenue);
    }
    
    console.log('[HomePage] After venue filter:', processed.length);
    
    // 월 필터링
    if (selectedMonth !== '전체') {
      processed = processed.filter(event => {
        const eventStart = new Date(event.startDate).toISOString().substring(0, 7); // YYYY-MM
        const eventEnd = new Date(event.endDate).toISOString().substring(0, 7);
        return eventStart <= selectedMonth && eventEnd >= selectedMonth;
      });
    }
    
    // 다중 category 필터링
    if (selectedCategories.length > 0) {
      processed = processed.filter(event => {
        if (!event.category) return false;
        const eventCategories: string[] = Array.isArray(event.category) ? event.category : [event.category];
        return eventCategories.some((cat: string) => selectedCategories.includes(cat as Category));
      });
    }
    
    console.log('[HomePage] After category filter:', processed.length);
    
    // 전시품목 필터링
    if (selectedIndustries.length > 0) {
      processed = processed.filter(event => {
        if (!event.exhibitItems) return false;
        // exhibitItems는 string 타입이므로 배열로 변환
        const items: string[] = Array.isArray(event.exhibitItems) 
          ? event.exhibitItems 
          : [event.exhibitItems];
        return items.some((item: string) => selectedIndustries.includes(item));
      });
    }
    
    console.log('[HomePage] After industry filter:', processed.length);
    
    // 날짜 범위 필터링
    if (dateRange) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      processed = processed.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        return eventStart <= endDate && eventEnd >= startDate;
      });
      processed = FilterEngine.sortByStartDate(processed);
    } else if (!showCurrentOnly) {
      processed = FilterEngine.sortByStartDate(processed);
    }
    
    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      processed = processed.filter(event => 
        event.title.toLowerCase().includes(query)
      );
    }
    
    console.log('[HomePage] Final filtered:', processed.length);
    
    // ID 기준으로 중복 제거
    const uniqueEvents = Array.from(
      new Map(processed.map(event => [event.id, event])).values()
    );
    
    console.log('[HomePage] After deduplication:', uniqueEvents.length);
    
    setFilteredEvents(uniqueEvents);
  }, [events, selectedRegion, selectedVenue, selectedMonth, selectedCategories, selectedIndustries, searchQuery, dateRange, showCurrentOnly]);

  const handleSave = async (eventId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 낙관적 업데이트 (UI 즉시 반영)
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isSaved: !event.isSaved }
        : event
    ));

    // DB에 저장/취소
    try {
      const isSaved = await toggleSaveEvent(user.id, eventId);
      console.log(`Event ${eventId} ${isSaved ? 'saved' : 'unsaved'}`);
    } catch (error) {
      console.error('Error toggling save:', error);
      // 실패 시 원래 상태로 되돌리기
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, isSaved: !event.isSaved }
          : event
      ));
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!isAdmin) {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }

    // 2단계 확인
    const firstConfirm = confirm('정말 이 행사를 삭제하시겠습니까?\n\n삭제된 행사는 관리자 페이지에서 복구할 수 있습니다.');
    if (!firstConfirm) return;

    const secondConfirm = confirm('⚠️ 최종 확인\n\n정말로 삭제하시겠습니까?');
    if (!secondConfirm) return;

    try {
      // 소프트 삭제: deleted_at에 현재 시간 기록
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;

      // 로컬 상태에서도 제거
      setEvents(prev => prev.filter(event => event.id !== eventId));
      alert('✓ 행사가 삭제되었습니다.\n\n관리자 페이지에서 복구할 수 있습니다.');
    } catch (error: any) {
      console.error('삭제 실패:', error);
      alert('❌ 행사 삭제에 실패했습니다:\n' + error.message);
    }
  };

  const handleEdit = (eventId: string, field: string, value: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, [field]: value }
        : event
    ));
    console.log(`Edited event ${eventId}: ${field} = ${value}`);
  };

  const handleVenueClick = (venue: Venue) => {
    // 이미 선택된 venue를 다시 클릭하면 해제, 아니면 선택
    setSelectedVenue(selectedVenue === venue ? null : venue);
  };

  const handleCategoryToggle = (category: Category) => {
    if (selectedCategories.includes(category)) {
      // 이미 선택된 경우 제거
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      // 선택되지 않은 경우 추가
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleIndustryToggle = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
    } else {
      setSelectedIndustries([...selectedIndustries, industry]);
    }
  };

  // Stibee 구독자만 홈페이지 접근 가능
  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      {/* 메인 컨텐츠 영역 (사이드바 + 행사 그리드 + 통계 사이드바) */}
      <div className="main-content-wrapper">
        {/* 왼쪽 사이드바 - 기간 + 검색 필터 */}
        <aside className="filter-sidebar">
          {/* 기간 섹션 */}
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h3 className="sidebar-title">기간</h3>
              {(dateRange || selectedMonth !== '전체' || !showCurrentOnly) && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => {
                    setDateRange(null);
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                  title="초기화"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="date-range-filter-sidebar">
              {/* 전체/현재 버튼 (첫 번째 줄, 2개) */}
              <div className="period-buttons-row-sidebar" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <button
                  className={`filter-btn-sidebar ${!dateRange && selectedMonth === '전체' && !showCurrentOnly ? 'active' : ''}`}
                  onClick={() => {
                    setDateRange(null);
                    setSelectedMonth('전체');
                    setShowCurrentOnly(false);
                  }}
                >
                  전체
                </button>
                <button
                  className={`filter-btn-sidebar ${!dateRange && selectedMonth === '전체' && showCurrentOnly ? 'active' : ''}`}
                  onClick={() => {
                    setDateRange(null);
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                >
                  현재
                </button>
              </div>
              
              {/* 기간 선택 버튼 (두 번째 줄, 4개) */}
              <div className="period-buttons-row-sidebar">
                <button
                  className="filter-btn-sidebar"
                  onClick={() => {
                    const today = new Date();
                    const endDate = new Date(today);
                    endDate.setMonth(today.getMonth() + 1);
                    setDateRange({
                      start: today.toISOString().split('T')[0],
                      end: endDate.toISOString().split('T')[0]
                    });
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                >
                  1개월
                </button>
                <button
                  className="filter-btn-sidebar"
                  onClick={() => {
                    const today = new Date();
                    const endDate = new Date(today);
                    endDate.setMonth(today.getMonth() + 3);
                    setDateRange({
                      start: today.toISOString().split('T')[0],
                      end: endDate.toISOString().split('T')[0]
                    });
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                >
                  3개월
                </button>
                <button
                  className="filter-btn-sidebar"
                  onClick={() => {
                    const today = new Date();
                    const endDate = new Date(today);
                    endDate.setMonth(today.getMonth() + 6);
                    setDateRange({
                      start: today.toISOString().split('T')[0],
                      end: endDate.toISOString().split('T')[0]
                    });
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                >
                  6개월
                </button>
                <button
                  className="filter-btn-sidebar"
                  onClick={() => {
                    const today = new Date();
                    const endDate = new Date(today);
                    endDate.setFullYear(today.getFullYear() + 1);
                    setDateRange({
                      start: today.toISOString().split('T')[0],
                      end: endDate.toISOString().split('T')[0]
                    });
                    setSelectedMonth('전체');
                    setShowCurrentOnly(true);
                  }}
                >
                  1년
                </button>
              </div>
              
              {/* 월 선택 드롭다운 */}
              <select
                className="month-select-sidebar"
                value={selectedMonth}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value);
                  if (value !== '전체') {
                    setDateRange(null);
                    setShowCurrentOnly(true);
                  }
                }}
              >
                <option value="전체">월 선택</option>
                <option value="2026-01">2026년 1월</option>
                <option value="2026-02">2026년 2월</option>
                <option value="2026-03">2026년 3월</option>
                <option value="2026-04">2026년 4월</option>
                <option value="2026-05">2026년 5월</option>
                <option value="2026-06">2026년 6월</option>
                <option value="2026-07">2026년 7월</option>
                <option value="2026-08">2026년 8월</option>
                <option value="2026-09">2026년 9월</option>
                <option value="2026-10">2026년 10월</option>
                <option value="2026-11">2026년 11월</option>
                <option value="2026-12">2026년 12월</option>
              </select>
              
              {/* 날짜 직접 입력 */}
              <div className="date-inputs-sidebar">
                <input
                  type="date"
                  className="date-input-sidebar"
                  value={dateRange?.start || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      if (dateRange) {
                        setDateRange({ ...dateRange, start: value });
                      } else {
                        const today = new Date();
                        const endDate = new Date(today);
                        endDate.setMonth(today.getMonth() + 1);
                        setDateRange({ start: value, end: endDate.toISOString().split('T')[0] });
                      }
                      setSelectedMonth('전체');
                      setShowCurrentOnly(true);
                    }
                  }}
                />
                <span className="date-separator-sidebar">-</span>
                <input
                  type="date"
                  className="date-input-sidebar"
                  value={dateRange?.end || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      if (dateRange) {
                        setDateRange({ ...dateRange, end: value });
                      } else {
                        const today = new Date();
                        setDateRange({ start: today.toISOString().split('T')[0], end: value });
                      }
                      setSelectedMonth('전체');
                      setShowCurrentOnly(true);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 검색 섹션 */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">검색</h3>
            <div className="search-container-sidebar">
              <input
                type="text"
                placeholder="행사명 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-sidebar"
              />
              {searchQuery && (
                <button 
                  className="search-clear-sidebar"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 지역 섹션 (아코디언) */}
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h3 className="sidebar-title">
                지역
                {selectedVenue && (
                  <span className="selected-count-inline"> (1)</span>
                )}
              </h3>
              {selectedVenue && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => {
                    setSelectedVenue(null);
                    setSelectedRegion('전체');
                    setExpandedRegion(null);
                  }}
                  title="초기화"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="region-accordion">
              {/* 전체 버튼 */}
              <div className="accordion-item">
                <button
                  className={`accordion-header ${selectedRegion === '전체' && !selectedVenue ? 'expanded' : ''}`}
                  onClick={() => {
                    setSelectedRegion('전체');
                    setSelectedVenue(null);
                    setExpandedRegion(null);
                  }}
                >
                  <span>전체</span>
                </button>
              </div>
              
              {/* 지역별 아코디언 */}
              {Object.values(Region).map((region) => {
                const venues = REGION_VENUE_MAP[region];
                const isExpanded = expandedRegion === region;
                const hasVenues = venues.length > 0;
                
                return (
                  <div key={region} className="accordion-item">
                    <button
                      className={`accordion-header ${isExpanded ? 'expanded' : ''} ${!hasVenues ? 'disabled' : ''}`}
                      onClick={() => {
                        if (hasVenues) {
                          // 다른 지역을 펼칠 때 venue 선택 초기화
                          if (!isExpanded && selectedVenue && !venues.includes(selectedVenue)) {
                            setSelectedVenue(null);
                          }
                          setExpandedRegion(isExpanded ? null : region);
                        }
                      }}
                      disabled={!hasVenues}
                    >
                      <span>{region}</span>
                      {hasVenues && (
                        <span className="accordion-icon">{isExpanded ? '▼' : '▶'}</span>
                      )}
                    </button>
                    {isExpanded && hasVenues && (
                      <div className="accordion-content">
                        {/* 지역 전체 옵션 - 선택된 venue가 없을 때만 파란색 */}
                        <button
                          className={`venue-btn ${!selectedVenue && selectedRegion === region ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedRegion(region);
                            setSelectedVenue(null);
                          }}
                        >
                          {region} (전체)
                        </button>
                        
                        {/* 개별 전시장 옵션 - 선택된 venue일 때만 파란색 */}
                        {venues.map((venue) => (
                          <button
                            key={venue}
                            className={`venue-btn ${selectedVenue === venue ? 'active' : ''}`}
                            onClick={() => {
                              // venue 선택 시 해당 지역도 함께 설정
                              setSelectedRegion(region);
                              handleVenueClick(venue);
                            }}
                          >
                            {venue}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 행사 카테고리 섹션 */}
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h3 className="sidebar-title">
                행사 카테고리
                {selectedCategories.length > 0 && (
                  <span className="selected-count-inline"> ({selectedCategories.length})</span>
                )}
              </h3>
              {selectedCategories.length > 0 && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => setSelectedCategories([])}
                  title="초기화"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="category-container" data-version="v2">
              {/* 전체 버튼 (첫 번째 줄) */}
              <button
                className={`filter-btn-sidebar ${selectedCategories.length === 0 ? 'active' : ''}`}
                onClick={() => setSelectedCategories([])}
              >
                전체
              </button>
              
              {/* 나머지 카테고리 버튼 (두 번째 줄) - 다중 선택 가능 */}
              <div className="category-buttons-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <button
                  className={`filter-btn-sidebar ${selectedCategories.includes('전시') ? 'active' : ''}`}
                  onClick={() => handleCategoryToggle('전시')}
                >
                  전시
                </button>
                <button
                  className={`filter-btn-sidebar ${selectedCategories.includes('회의') ? 'active' : ''}`}
                  onClick={() => handleCategoryToggle('회의')}
                >
                  회의
                </button>
                <button
                  className={`filter-btn-sidebar ${selectedCategories.includes('행사/공연') ? 'active' : ''}`}
                  onClick={() => handleCategoryToggle('행사/공연')}
                >
                  행사/공연
                </button>
              </div>
            </div>
          </div>

          {/* 전시품목 섹션 (아코디언) */}
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h3 className="sidebar-title">
                전시품목
                {selectedIndustries.length > 0 && (
                  <span className="selected-count-inline"> ({selectedIndustries.length})</span>
                )}
              </h3>
              {selectedIndustries.length > 0 && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => setSelectedIndustries([])}
                  title="초기화"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="industry-accordion">
              <button
                className={`accordion-header ${showIndustries ? 'expanded' : ''}`}
                onClick={() => setShowIndustries(!showIndustries)}
              >
                <span>{showIndustries ? '품목 숨기기' : '품목 선택'}</span>
                <span className="accordion-icon">{showIndustries ? '▼' : '▶'}</span>
              </button>
              {showIndustries && (
                <div className="accordion-content">
                  {INDUSTRIES.map((industry) => (
                    <button
                      key={industry}
                      className={`venue-btn ${selectedIndustries.includes(industry) ? 'active' : ''}`}
                      onClick={() => handleIndustryToggle(industry)}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* 오른쪽 메인 영역 */}
        <div className="main-content-area">
          {/* 배너 영역 */}
          <Banner />

          {/* 결과 카운트 배너 */}
          <div className="results-count-banner">
            <p>{filteredEvents.length}개의 행사</p>
            {isAdmin && (
              <div className="admin-actions">
                <button 
                  className="admin-add-event-btn"
                  onClick={() => setShowAddModal(true)}
                  title="행사 추가"
                >
                  + 행사 추가
                </button>
                <button 
                  className={`admin-delete-toggle-btn ${showDeleteMode ? 'active' : ''}`}
                  onClick={() => setShowDeleteMode(!showDeleteMode)}
                  title="행사 제거 모드"
                >
                  {showDeleteMode ? '✓ 행사 제거' : '행사 제거'}
                </button>
              </div>
            )}
          </div>

          {/* 행사 그리드 */}
          <div className="events-grid">
            {loading ? (
              <div className="no-results">
                <p>행사 정보를 불러오는 중...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="no-results">
                <p>조건에 맞는 행사가 없습니다.</p>
              </div>
            ) : (
              filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSave={handleSave}
                  onEdit={handleEdit}
                  onDelete={isAdmin && showDeleteMode ? handleDelete : undefined}
                />
              ))
            )}
          </div>
        </div>

        {/* 오른쪽 사이드바 - 방문자 통계 */}
        <aside className="stats-sidebar">
          <div className="stats-sidebar-section">
            <h3 className="stats-sidebar-title">📊 방문자 통계</h3>
            <div className="stats-sidebar-cards">
              <div className="stats-sidebar-card stats-sidebar-card-online">
                <div className="stats-sidebar-label">
                  <span className="online-indicator"></span>
                  현재 접속
                </div>
                <div className="stats-sidebar-value stats-sidebar-value-online">{onlineCount.toLocaleString()}</div>
                <div className="stats-sidebar-unit">명 온라인</div>
              </div>
              <div className="stats-sidebar-card">
                <div className="stats-sidebar-label">오늘</div>
                <div className="stats-sidebar-value">{visitorStats.today.toLocaleString()}</div>
                <div className="stats-sidebar-unit">명 방문</div>
              </div>
              <div className="stats-sidebar-card">
                <div className="stats-sidebar-label">최근 7일</div>
                <div className="stats-sidebar-value">{visitorStats.last7Days.toLocaleString()}</div>
                <div className="stats-sidebar-unit">명 방문</div>
              </div>
              <div className="stats-sidebar-card">
                <div className="stats-sidebar-label">최근 30일</div>
                <div className="stats-sidebar-value">{visitorStats.last30Days.toLocaleString()}</div>
                <div className="stats-sidebar-unit">명 방문</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 행사 추가 모달 */}
      {showAddModal && isAdmin && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            setShowAddModal(false);
            // 행사 목록 새로고침
            const data = await fetchEvents();
            setEvents(data);
          }}
        />
      )}
    </>
  );
}

// 행사 추가 모달 컴포넌트
function AddEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    venue: '',
    venue_hall: '',
    region: '수도권',
    category: ['전시'],
    start_date: '',
    end_date: '',
    organizer: '',
    poster_url: '',
    venue_event_page_url: '',
    description: '',
    operating_hours: '',
    website_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // 전시장 선택 시 지역 자동 설정
  const handleVenueChange = (venue: string) => {
    let region = '수도권';
    
    // 지역 자동 매핑
    if (['코엑스', '코엑스 마곡', 'aT센터', '세텍'].includes(venue)) {
      region = '수도권';
    } else if (['킨텍스', '수원컨벤션센터', '수원메쎄', '송도컨벤시아'].includes(venue)) {
      region = '수도권';
    } else if (['대전컨벤션센터', '청주오스코'].includes(venue)) {
      region = '대전/충청';
    } else if (['김대중컨벤션센터', '군산새만금컨벤션센터'].includes(venue)) {
      region = '광주/전남';
    } else if (['벡스코', '엑스코', '창원컨벤션센터', '유에코', '경주화백컨벤션센터', '구미코'].includes(venue)) {
      region = '부산/경남';
    } else if (venue === '제주국제컨벤션센터') {
      region = '제주';
    }
    
    setFormData({ ...formData, venue, region });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.venue || !formData.start_date || !formData.end_date) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);

      // day_string 계산
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const dayString = formData.start_date === formData.end_date
        ? days[start.getDay()]
        : `${days[start.getDay()]}~${days[end.getDay()]}`;

      const { error } = await supabase
        .from('events')
        .insert({
          ...formData,
          day_string: dayString,
          industry: '기타',
          supervisor: null,
          contact: null
        });

      if (error) throw error;

      alert('행사가 추가되었습니다.');
      onSuccess();
    } catch (error: any) {
      console.error('행사 추가 실패:', error);
      alert('행사 추가에 실패했습니다: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-event-modal" onClick={(e) => e.stopPropagation()}>
        <h2>행사 추가</h2>
        <form onSubmit={handleSubmit} className="add-event-form">
          <div className="form-group">
            <label>행사명 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>전시장 *</label>
              <select
                value={formData.venue}
                onChange={(e) => handleVenueChange(e.target.value)}
                required
              >
                <option value="">전시장 선택</option>
                <optgroup label="서울">
                  <option value="코엑스">코엑스</option>
                  <option value="코엑스 마곡">코엑스 마곡</option>
                  <option value="aT센터">aT센터</option>
                  <option value="세텍">세텍</option>
                </optgroup>
                <optgroup label="수도권">
                  <option value="킨텍스">킨텍스</option>
                  <option value="수원컨벤션센터">수원컨벤션센터</option>
                  <option value="수원메쎄">수원메쎄</option>
                  <option value="송도컨벤시아">송도컨벤시아</option>
                </optgroup>
                <optgroup label="대전/충청">
                  <option value="대전컨벤션센터">대전컨벤션센터</option>
                  <option value="청주오스코">청주오스코</option>
                </optgroup>
                <optgroup label="광주/전남">
                  <option value="김대중컨벤션센터">김대중컨벤션센터</option>
                  <option value="군산새만금컨벤션센터">군산새만금컨벤션센터</option>
                </optgroup>
                <optgroup label="부산/경남">
                  <option value="벡스코">벡스코</option>
                  <option value="엑스코">엑스코</option>
                  <option value="창원컨벤션센터">창원컨벤션센터</option>
                  <option value="유에코">유에코</option>
                  <option value="경주화백컨벤션센터">경주화백컨벤션센터</option>
                  <option value="구미코">구미코</option>
                </optgroup>
                <optgroup label="제주">
                  <option value="제주국제컨벤션센터">제주국제컨벤션센터</option>
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>홀</label>
              <input
                type="text"
                value={formData.venue_hall}
                onChange={(e) => setFormData({ ...formData, venue_hall: e.target.value })}
                placeholder="예: Hall A"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>지역 (자동 설정)</label>
              <input
                type="text"
                value={formData.region}
                readOnly
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>카테고리 *</label>
              <select
                value={formData.category[0]}
                onChange={(e) => setFormData({ ...formData, category: [e.target.value] })}
                required
              >
                <option value="전시">전시</option>
                <option value="회의">회의</option>
                <option value="행사/공연">행사/공연</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>시작일 *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>종료일 *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>주최/주관</label>
            <input
              type="text"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>포스터 URL</label>
            <input
              type="url"
              value={formData.poster_url}
              onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>행사 페이지 URL</label>
            <input
              type="url"
              value={formData.venue_event_page_url}
              onChange={(e) => setFormData({ ...formData, venue_event_page_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>웹사이트 URL</label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label>운영시간</label>
            <input
              type="text"
              value={formData.operating_hours}
              onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
              placeholder="예: 10:00 ~ 18:00"
            />
          </div>

          <div className="form-group">
            <label>설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              취소
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
