import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '../components/EventCard';
import { Banner } from '../components/Banner';
import { fetchEvents } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';
import { getVisitorStats, type VisitorStats } from '../utils/analytics';
import { PresenceManager } from '../utils/onlinePresence';
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitorStats, setVisitorStats] = useState<VisitorStats>({
    today: 0,
    last7Days: 0,
    last30Days: 0
  });
  const [onlineCount, setOnlineCount] = useState<number>(0);

  // 홈페이지는 누구나 접근 가능 (로그인 불필요)
  // 관리자 기능(배너 관리 등)만 로그인 필요
  
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
  const [selectedVenues, setSelectedVenues] = useState<Venue[]>(initialState?.selectedVenues || []); // 배열로 변경
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

  // Supabase에서 데이터 가져오기
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
      setLoading(false);
    }
    loadEvents();
  }, []);

  // 방문자 통계 가져오기
  useEffect(() => {
    const stats = getVisitorStats();
    setVisitorStats(stats);
    
    // 1분마다 통계 업데이트
    const interval = setInterval(() => {
      const updatedStats = getVisitorStats();
      setVisitorStats(updatedStats);
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

  // 스크롤 위치 복원 (데이터 로딩 완료 후)
  useEffect(() => {
    if (!loading && events.length > 0) {
      const savedScrollPosition = sessionStorage.getItem('homeScrollPosition');
      if (savedScrollPosition) {
        // 여러 프레임을 기다려서 DOM이 완전히 렌더링된 후 스크롤
        const scrollPos = parseInt(savedScrollPosition, 10);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo({ top: scrollPos, behavior: 'instant' });
              sessionStorage.removeItem('homeScrollPosition');
            }, 150);
          });
        });
      }
    }
  }, [loading, events.length]);

  // 필터 상태 저장
  useEffect(() => {
    const filterState = {
      selectedRegion,
      selectedVenues, // 변경
      selectedMonth,
      selectedCategories, // 변경
      selectedIndustries,
      searchQuery,
      dateRange,
      expandedRegion,
      showCurrentOnly
    };
    sessionStorage.setItem('homeFilterState', JSON.stringify(filterState));
  }, [selectedRegion, selectedVenues, selectedMonth, selectedCategories, selectedIndustries, searchQuery, dateRange, expandedRegion, showCurrentOnly]);

  useEffect(() => {
    console.log('[HomePage] Filtering with:', {
      venues: selectedVenues,
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
    
    // 다중 venue 필터링
    if (selectedVenues.length > 0) {
      processed = processed.filter(event => selectedVenues.includes(event.venue as Venue));
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
  }, [events, selectedRegion, selectedVenues, selectedMonth, selectedCategories, selectedIndustries, searchQuery, dateRange, showCurrentOnly]);

  const handleSave = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, isSaved: !event.isSaved }
        : event
    ));
  };

  const handleEdit = (eventId: string, field: string, value: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, [field]: value }
        : event
    ));
    console.log(`Edited event ${eventId}: ${field} = ${value}`);
  };

  const handleVenueToggle = (venue: Venue) => {
    if (selectedVenues.includes(venue)) {
      // 이미 선택된 경우 제거
      setSelectedVenues(selectedVenues.filter(v => v !== venue));
    } else {
      // 선택되지 않은 경우 추가
      setSelectedVenues([...selectedVenues, venue]);
    }
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

  // 홈페이지는 누구나 볼 수 있음 (로그인 불필요)

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
                {selectedVenues.length > 0 && (
                  <span className="selected-count-inline"> ({selectedVenues.length})</span>
                )}
              </h3>
              {selectedVenues.length > 0 && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => {
                    setSelectedVenues([]);
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
                  className={`accordion-header ${selectedRegion === '전체' && selectedVenues.length === 0 ? 'expanded' : ''}`}
                  onClick={() => {
                    setSelectedRegion('전체');
                    setSelectedVenues([]);
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
                        {venues.map((venue) => (
                          <button
                            key={venue}
                            className={`venue-btn ${selectedVenues.includes(venue) ? 'active' : ''}`}
                            onClick={() => handleVenueToggle(venue)}
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
    </>
  );
}
