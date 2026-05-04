import { useState } from 'react';
import type { Venue } from '../types/core';
import { Region, Category } from '../types/core';
import { getVenuesForRegion } from '../utils/venueValidator';

interface FilterBarProps {
  selectedRegion: Region | '전체';
  selectedVenue: Venue | '전체';
  selectedMonth: string | '전체';
  selectedCategory: Category | '전체';
  selectedIndustries: string[];
  dateRange: { start: string; end: string } | null;
  onRegionChange: (region: Region | '전체') => void;
  onVenueChange: (venue: Venue | '전체') => void;
  onMonthChange: (month: string | '전체') => void;
  onCategoryChange: (category: Category | '전체') => void;
  onIndustriesChange: (industries: string[]) => void;
  onDateRangeChange: (dateRange: { start: string; end: string } | null) => void;
}

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

export function FilterBar({
  selectedRegion,
  selectedVenue,
  selectedMonth,
  selectedCategory,
  selectedIndustries,
  dateRange,
  onRegionChange,
  onVenueChange,
  onMonthChange,
  onCategoryChange,
  onIndustriesChange,
  onDateRangeChange,
}: FilterBarProps) {
  const [showIndustries, setShowIndustries] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026'); // 기본 년도

  // 기간 설정 함수
  const setDateRangeByPeriod = (months: number) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + months);
    
    onDateRangeChange({
      start: today.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
  };

  const handleStartDateChange = (date: string) => {
    if (dateRange) {
      onDateRangeChange({ ...dateRange, start: date });
    } else {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(today.getMonth() + 1);
      onDateRangeChange({ start: date, end: endDate.toISOString().split('T')[0] });
    }
  };

  const handleEndDateChange = (date: string) => {
    if (dateRange) {
      onDateRangeChange({ ...dateRange, end: date });
    } else {
      const today = new Date();
      onDateRangeChange({ start: today.toISOString().split('T')[0], end: date });
    }
  };

  // 년도 목록 (2020년부터 2030년까지)
  const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // 월 목록
  const months = [
    { value: '전체', label: '전체' },
    { value: `${selectedYear}-01`, label: '1월' },
    { value: `${selectedYear}-02`, label: '2월' },
    { value: `${selectedYear}-03`, label: '3월' },
    { value: `${selectedYear}-04`, label: '4월' },
    { value: `${selectedYear}-05`, label: '5월' },
    { value: `${selectedYear}-06`, label: '6월' },
    { value: `${selectedYear}-07`, label: '7월' },
    { value: `${selectedYear}-08`, label: '8월' },
    { value: `${selectedYear}-09`, label: '9월' },
    { value: `${selectedYear}-10`, label: '10월' },
    { value: `${selectedYear}-11`, label: '11월' },
    { value: `${selectedYear}-12`, label: '12월' },
  ];

  const venues = selectedRegion === '전체' 
    ? [] 
    : getVenuesForRegion(selectedRegion);

  const handleRegionChange = (region: Region | '전체') => {
    onRegionChange(region);
    onVenueChange('전체'); // 지역 변경 시 장소 초기화
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    // 년도 변경 시 월 필터 초기화
    onMonthChange('전체');
  };

  const handleIndustryToggle = (industry: string) => {
    if (selectedIndustries.includes(industry)) {
      onIndustriesChange(selectedIndustries.filter(i => i !== industry));
    } else {
      onIndustriesChange([...selectedIndustries, industry]);
    }
  };

  return (
    <div className="filter-bar">
      {/* 기간 필터 */}
      <div className="filter-section">
        <h3 className="filter-title">기간</h3>
        <div className="date-range-filter">
          <div className="period-buttons">
            <button
              className={`filter-btn ${!dateRange ? 'active' : ''}`}
              onClick={() => onDateRangeChange(null)}
            >
              전체
            </button>
            <button
              className="filter-btn"
              onClick={() => setDateRangeByPeriod(1)}
            >
              1개월
            </button>
            <button
              className="filter-btn"
              onClick={() => setDateRangeByPeriod(3)}
            >
              3개월
            </button>
            <button
              className="filter-btn"
              onClick={() => setDateRangeByPeriod(6)}
            >
              6개월
            </button>
            <button
              className="filter-btn"
              onClick={() => setDateRangeByPeriod(12)}
            >
              1년
            </button>
          </div>
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange?.start || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="date-input"
            />
            <span className="date-separator">-</span>
            <input
              type="date"
              value={dateRange?.end || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>

      {/* 지역 필터 */}
      <div className="filter-section">
        <h3 className="filter-title">지역</h3>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${selectedRegion === '전체' ? 'active' : ''}`}
            onClick={() => handleRegionChange('전체')}
          >
            전체
          </button>
          {Object.values(Region).map(region => (
            <button
              key={region}
              className={`filter-btn ${selectedRegion === region ? 'active' : ''}`}
              onClick={() => handleRegionChange(region)}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* 장소 필터 (지역 선택 시에만 표시) */}
      {selectedRegion !== '전체' && venues.length > 0 && (
        <div className="filter-section">
          <h3 className="filter-title">장소</h3>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${selectedVenue === '전체' ? 'active' : ''}`}
              onClick={() => onVenueChange('전체')}
            >
              전체
            </button>
            {venues.map(venue => (
              <button
                key={venue}
                className={`filter-btn ${selectedVenue === venue ? 'active' : ''}`}
                onClick={() => onVenueChange(venue)}
              >
                {venue}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 월 필터 (년도 선택 포함) */}
      <div className="filter-section">
        <div className="filter-title-with-dropdown">
          <h3 className="filter-title">월</h3>
          <select 
            className="year-dropdown"
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
        <div className="filter-buttons scrollable">
          {months.map(month => (
            <button
              key={month.value}
              className={`filter-btn ${selectedMonth === month.value ? 'active' : ''}`}
              onClick={() => onMonthChange(month.value)}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="filter-section">
        <h3 className="filter-title">카테고리</h3>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${selectedCategory === '전체' ? 'active' : ''}`}
            onClick={() => onCategoryChange('전체')}
          >
            전체
          </button>
          {Object.values(Category).map(category => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 전시품목 필터 (드롭다운) */}
      <div className="filter-section">
        <h3 className="filter-title">
          전시품목
          {selectedIndustries.length > 0 && (
            <span className="selected-count">({selectedIndustries.length})</span>
          )}
        </h3>
        <button
          className="industry-toggle-btn"
          onClick={() => setShowIndustries(!showIndustries)}
        >
          {showIndustries ? '▲ 숨기기' : '▼ 품목 선택'}
        </button>
        
        {showIndustries && (
          <div className="industry-dropdown">
            <button
              className="filter-btn small"
              onClick={() => onIndustriesChange([])}
            >
              전체 해제
            </button>
            {INDUSTRIES.map(industry => (
              <button
                key={industry}
                className={`filter-btn small ${selectedIndustries.includes(industry) ? 'active' : ''}`}
                onClick={() => handleIndustryToggle(industry)}
              >
                {industry}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
