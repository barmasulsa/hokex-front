import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
import { fetchEvents } from '../services/eventService';
import { useAuth } from '../contexts/AuthContext';
import type { EventRecord, Venue, FilterCriteria } from '../types/core';
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

  // 로그인 체크 - 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
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
  const [selectedVenue, setSelectedVenue] = useState<Venue | '전체'>(initialState?.selectedVenue || '전체');
  const [selectedMonth, setSelectedMonth] = useState<string | '전체'>(initialState?.selectedMonth || '전체');
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>(initialState?.selectedCategory || '전체');
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
      selectedVenue,
      selectedMonth,
      selectedCategory,
      selectedIndustries,
      searchQuery,
      dateRange,
      expandedRegion,
      showCurrentOnly
    };
    sessionStorage.setItem('homeFilterState', JSON.stringify(filterState));
  }, [selectedRegion, selectedVenue, selectedMonth, selectedCategory, selectedIndustries, searchQuery, dateRange, expandedRegion, showCurrentOnly]);

  useEffect(() => {
    const criteria: FilterCriteria = {
      region: selectedRegion,
      venue: selectedVenue,
      month: selectedMonth,
      category: selectedCategory,
      industries: selectedIndustries.length > 0 ? selectedIndustries : undefined,
    };

    console.log('[HomePage] Filtering with:', {
      venue: selectedVenue,
      month: selectedMonth,
      showCurrentOnly,
      dateRange,
      totalEvents: events.length
    });

    // showCurrentOnly가 true이고 날짜 범위가 설정되지 않았을 때만 과거 행사 필터링
    let processed = (showCurrentOnly && !dateRange)
      ? FilterEngine.process(events, criteria)
      : FilterEngine.applyFilters(events, criteria);
    
    console.log('[HomePage] After initial filter:', processed.length);
    
    // 날짜 범위 필터링
    if (dateRange) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      processed = processed.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        // 행사 기간이 선택한 날짜 범위와 겹치는지 확인
        return eventStart <= endDate && eventEnd >= startDate;
      });
      // 날짜 범위 설정 시 정렬
      processed = FilterEngine.sortByStartDate(processed);
    } else if (!showCurrentOnly) {
      // "전체" 선택 시 정렬
      processed = FilterEngine.sortByStartDate(processed);
    }
    
    // 검색어 필터링 (행사명만)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      processed = processed.filter(event => 
        event.title.toLowerCase().includes(query)
      );
    }
    
    console.log('[HomePage] Final filtered:', processed.length);
    
    // ID 기준으로 중복 제거 (같은 행사가 여러 품목으로 중복 표시되는 것 방지)
    const uniqueEvents = Array.from(
      new Map(processed.map(event => [event.id, event])).values()
    );
    
    console.log('[HomePage] After deduplication:', uniqueEvents.length);
    
    // 엑스코 6월 이후 확인
    if (selectedVenue === '엑스코' || selectedVenue === '전체') {
      const excoAfterMay = uniqueEvents.filter(e => 
        e.venue === '엑스코' && e.startDate >= new Date('2026-06-01')
      );
      console.log('[HomePage] EXCO after May in final:', excoAfterMay.length);
    }
    
    setFilteredEvents(uniqueEvents);
  }, [events, selectedRegion, selectedVenue, selectedMonth, selectedCategory, selectedIndustries, searchQuery, dateRange, showCurrentOnly]);

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

  const handleIndustryToggle = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
    } else {
      setSelectedIndustries([...selectedIndustries, industry]);
    }
  };

  // 인증 로딩 중이거나 사용자가 없으면 아무것도 렌더링하지 않음
  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      {/* 메인 컨텐츠 영역 (사이드바 + 행사 그리드) */}
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
            <h3 className="sidebar-title">지역</h3>
            <div className="region-accordion">
              {/* 전체 버튼 */}
              <div className="accordion-item">
                <button
                  className={`accordion-header ${selectedRegion === '전체' && selectedVenue === '전체' ? 'expanded' : ''}`}
                  onClick={() => {
                    setSelectedRegion('전체');
                    setSelectedVenue('전체');
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
                            className={`venue-btn ${selectedVenue === venue ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedVenue(venue);
                              setSelectedRegion(region);
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
            <h3 className="sidebar-title">행사 카테고리</h3>
            <div className="category-container" data-version="v2">
              {/* 전체 버튼 (첫 번째 줄) */}
              <button
                className={`filter-btn-sidebar ${selectedCategory === '전체' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('전체')}
              >
                전체
              </button>
              
              {/* 나머지 카테고리 버튼 (두 번째 줄) */}
              <div className="category-buttons-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <button
                  className={`filter-btn-sidebar ${selectedCategory === '전시' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('전시')}
                >
                  전시
                </button>
                <button
                  className={`filter-btn-sidebar ${selectedCategory === '회의' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('회의')}
                >
                  회의
                </button>
                <button
                  className={`filter-btn-sidebar ${selectedCategory === '행사/공연' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('행사/공연')}
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
          {/* 필터 바 */}
          <FilterBar
            selectedRegion={selectedRegion}
            selectedVenue={selectedVenue}
            selectedMonth={selectedMonth}
            selectedCategory={selectedCategory}
            selectedIndustries={selectedIndustries}
            filteredCount={filteredEvents.length}
            onRegionChange={setSelectedRegion}
            onVenueChange={setSelectedVenue}
            onMonthChange={setSelectedMonth}
            onCategoryChange={setSelectedCategory}
            onIndustriesChange={setSelectedIndustries}
          />

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
      </div>
    </>
  );
}
