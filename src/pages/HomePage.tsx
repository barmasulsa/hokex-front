import { useState, useEffect } from 'react';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
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
        // requestAnimationFrame을 사용하여 렌더링 완료 후 스크롤
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10));
          sessionStorage.removeItem('homeScrollPosition');
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

    let processed = FilterEngine.process(events, criteria);
    
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
    }
    
    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      processed = processed.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.industry.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query)
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

      {/* 검색바 (Sticky) */}
      <div className="search-bar-sticky">
        <div className="search-container">
          <input
            type="text"
            placeholder="행사명, 장소, 산업 분야로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 필터 바 */}
      <FilterBar
        selectedRegion={selectedRegion}
        selectedVenue={selectedVenue}
        selectedMonth={selectedMonth}
        selectedCategory={selectedCategory}
        selectedIndustries={selectedIndustries}
        dateRange={dateRange}
        onRegionChange={setSelectedRegion}
        onVenueChange={setSelectedVenue}
        onMonthChange={setSelectedMonth}
        onCategoryChange={setSelectedCategory}
        onIndustriesChange={setSelectedIndustries}
        onDateRangeChange={setDateRange}
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
    </>
  );
}
