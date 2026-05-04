import { useState, useEffect } from 'react';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
import { CustomDateInput } from '../components/CustomDateInput';
import { fetchEvents } from '../services/eventService';
import type { EventRecord, Venue, FilterCriteria } from '../types/core';
import { Region, Category } from '../types/core';
import { FilterEngine } from '../utils/filterEngine';

interface HomePageProps {
  isAdmin: boolean;
}

export function HomePage({ isAdmin }: HomePageProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 필터 상태
  const [selectedRegion, setSelectedRegion] = useState<Region | '전체'>('전체');
  const [selectedVenue, setSelectedVenue] = useState<Venue | '전체'>('전체');
  const [selectedMonth, setSelectedMonth] = useState<string | '전체'>('전체');
  const [selectedCategory, setSelectedCategory] = useState<Category | '전체'>('전체');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

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

  useEffect(() => {
    const criteria: FilterCriteria = {
      region: selectedRegion,
      venue: selectedVenue,
      month: selectedMonth,
      category: selectedCategory,
      industries: selectedIndustries.length > 0 ? selectedIndustries : undefined,
    };

    // 날짜 범위가 설정되지 않았을 때만 과거 행사 필터링
    let processed = dateRange 
      ? FilterEngine.applyFilters(events, criteria)
      : FilterEngine.process(events, criteria);
    
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
    }
    
    // 검색어 필터링 (행사명만)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      processed = processed.filter(event => 
        event.title.toLowerCase().includes(query)
      );
    }
    
    setFilteredEvents(processed);
  }, [events, selectedRegion, selectedVenue, selectedMonth, selectedCategory, selectedIndustries, searchQuery, dateRange]);

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

  return (
    <>
      {/* 관리자 모드 알림 */}
      {isAdmin && (
        <div className="admin-notice">
          ✏️ 관리자 모드: 행사 정보를 클릭하여 수정할 수 있습니다
        </div>
      )}

      {/* 메인 컨텐츠 영역 (사이드바 + 행사 그리드) */}
      <div className="main-content-wrapper">
        {/* 왼쪽 사이드바 - 기간 + 검색 필터 */}
        <aside className="filter-sidebar">
          {/* 기간 섹션 */}
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h3 className="sidebar-title">기간</h3>
              {dateRange && (
                <button 
                  className="reset-btn-sidebar"
                  onClick={() => setDateRange(null)}
                  title="초기화"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="date-range-filter-sidebar">
              <div className="period-buttons-sidebar">
                <button
                  className={`filter-btn-sidebar ${!dateRange ? 'active' : ''}`}
                  onClick={() => setDateRange(null)}
                >
                  전체
                </button>
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
                  }}
                >
                  1년
                </button>
              </div>
              <div className="date-inputs-sidebar">
                <CustomDateInput
                  value={dateRange?.start || ''}
                  onChange={(value) => {
                    if (value) {
                      if (dateRange) {
                        setDateRange({ ...dateRange, start: value });
                      } else {
                        const today = new Date();
                        const endDate = new Date(today);
                        endDate.setMonth(today.getMonth() + 1);
                        setDateRange({ start: value, end: endDate.toISOString().split('T')[0] });
                      }
                    }
                  }}
                />
                <span className="date-separator-sidebar">-</span>
                <CustomDateInput
                  value={dateRange?.end || ''}
                  onChange={(value) => {
                    if (value) {
                      if (dateRange) {
                        setDateRange({ ...dateRange, end: value });
                      } else {
                        const today = new Date();
                        setDateRange({ start: today.toISOString().split('T')[0], end: value });
                      }
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
            onRegionChange={setSelectedRegion}
            onVenueChange={setSelectedVenue}
            onMonthChange={setSelectedMonth}
            onCategoryChange={setSelectedCategory}
            onIndustriesChange={setSelectedIndustries}
          />

          {/* 결과 카운트 */}
          <div className="results-info">
            <p>{loading ? '로딩 중...' : `${filteredEvents.length}개의 행사`}</p>
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
                  isAdmin={isAdmin}
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
