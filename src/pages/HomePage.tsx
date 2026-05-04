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

  // 필터링된 이벤트
  const [filteredEvents, setFilteredEvents] = useState<EventRecord[]>(events);

  // 스크롤 위치 복원
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('homeScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition, 10));
      sessionStorage.removeItem('homeScrollPosition');
    }
  }, [filteredEvents]);

  // 스크롤 위치 저장 (페이지 떠날 때)
  useEffect(() => {
    const saveScrollPosition = () => {
      sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
    };

    // 이벤트 카드 클릭 시 스크롤 위치 저장
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  useEffect(() => {
    const criteria: FilterCriteria = {
      region: selectedRegion,
      venue: selectedVenue,
      month: selectedMonth,
      category: selectedCategory,
      industries: selectedIndustries.length > 0 ? selectedIndustries : undefined,
    };

    const processed = FilterEngine.process(events, criteria);
    setFilteredEvents(processed);
  }, [events, selectedRegion, selectedVenue, selectedMonth, selectedCategory, selectedIndustries]);

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
    </>
  );
}
