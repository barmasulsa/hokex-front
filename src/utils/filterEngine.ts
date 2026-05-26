import type { EventRecord, FilterCriteria, Category } from '../types/core';

export class FilterEngine {
  /**
   * 복합 필터 적용 (AND 조건)
   * @param events - 행사 목록
   * @param criteria - 필터 조건
   * @returns 필터링된 행사 목록
   */
  static applyFilters(events: EventRecord[], criteria: FilterCriteria): EventRecord[] {
    let filtered = [...events];

    // 지역 필터
    if (criteria.region && criteria.region !== '전체') {
      filtered = filtered.filter(event => event.region === criteria.region);
    }

    // 장소 필터 (계층형 연동)
    if (criteria.venue && criteria.venue !== '전체') {
      filtered = filtered.filter(event => event.venue === criteria.venue);
    }

    // 월 필터
    if (criteria.month && criteria.month !== '전체') {
      filtered = filtered.filter(event => {
        // 시작일 또는 종료일이 선택한 월에 포함되면 표시
        const eventStartMonth = event.startDate.toISOString().slice(0, 7);
        const eventEndMonth = event.endDate.toISOString().slice(0, 7);
        return eventStartMonth === criteria.month || eventEndMonth === criteria.month;
      });
    }

    // 카테고리 필터 (배열 지원)
    if (criteria.category && criteria.category !== '전체') {
      filtered = filtered.filter(event => {
        // 배열인 경우 포함 여부 확인, 단일 값인 경우 직접 비교
        if (Array.isArray(event.category)) {
          return event.category.includes(criteria.category as Category);
        }
        return event.category === criteria.category;
      });
    }

    // 산업 다중 선택 필터 (OR 조건)
    if (criteria.industries && criteria.industries.length > 0) {
      filtered = filtered.filter(event =>
        criteria.industries!.includes(event.industry)
      );
    }

    return filtered;
  }

  /**
   * 과거 행사 자동 필터링
   * @param events - 행사 목록
   * @param currentDate - 현재 날짜
   * @returns 현재/미래 행사만 포함된 목록
   */
  static filterPastEvents(events: EventRecord[], currentDate: Date = new Date()): EventRecord[] {
    return events.filter(event => event.endDate >= currentDate);
  }

  /**
   * 지역 우선순위 가져오기
   * @param region - 지역
   * @returns 우선순위 (낮을수록 우선)
   */
  private static getRegionPriority(region: string): number {
    const priorities: Record<string, number> = {
      '서울': 1,
      '수도권': 2,
      '충청도': 3,
      '전라도': 4,
      '강원도': 5,
      '경상도': 6,
      '제주도': 7
    };
    return priorities[region] || 999;
  }

  /**
   * 전시장 우선순위 가져오기
   * @param venue - 전시장
   * @returns 우선순위 (낮을수록 우선)
   */
  private static getVenuePriority(venue: string): number {
    const priorities: Record<string, number> = {
      // 서울
      '코엑스': 1,
      '코엑스 마곡': 2,
      'aT센터': 3,
      '세텍': 4,
      // 수도권
      '킨텍스': 5,
      '수원컨벤션센터': 6,
      '수원메쎄': 7,
      '송도컨벤시아': 8,
      // 충청도
      '대전컨벤션센터': 9,
      '청주오스코': 10,
      // 전라도
      '김대중컨벤션센터': 11,
      '군산새만금컨벤션센터': 12,
      // 경상도
      '벡스코': 13,
      '엑스코': 14,
      '창원컨벤션센터': 15,
      '유에코': 16,
      '경주화백컨벤션센터': 17,
      '구미코': 18,
      // 제주도
      '제주국제컨벤션센터': 19
    };
    return priorities[venue] || 999;
  }

  /**
   * 행사 기간 계산 (일수)
   * @param event - 행사
   * @returns 행사 기간 (일수)
   */
  private static getEventDuration(event: EventRecord): number {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * 복합 정렬: 시작일 → 단일날짜 우선 → 지역 → 전시장 → 종료일
   * @param events - 행사 목록
   * @returns 정렬된 행사 목록
   */
  static sortByStartDate(events: EventRecord[]): EventRecord[] {
    return [...events].sort((a, b) => {
      // 1. 시작 날짜 비교 (오름차순)
      const startDateCompare = a.startDate.getTime() - b.startDate.getTime();
      if (startDateCompare !== 0) return startDateCompare;

      // 2. 시작일이 같으면 단일 날짜 행사 우선 (기간 1일 = 단일 날짜)
      const durationA = this.getEventDuration(a);
      const durationB = this.getEventDuration(b);
      const isSingleDayA = durationA === 1;
      const isSingleDayB = durationB === 1;
      
      if (isSingleDayA && !isSingleDayB) return -1; // A가 단일날짜면 우선
      if (!isSingleDayA && isSingleDayB) return 1;  // B가 단일날짜면 우선

      // 3. 둘 다 단일날짜이거나 둘 다 기간행사인 경우
      // 3-1. 지역 우선순위 비교
      const regionCompare = this.getRegionPriority(a.region) - this.getRegionPriority(b.region);
      if (regionCompare !== 0) return regionCompare;

      // 3-2. 같은 지역이면 전시장 우선순위 비교
      const venueCompare = this.getVenuePriority(a.venue) - this.getVenuePriority(b.venue);
      if (venueCompare !== 0) return venueCompare;

      // 3-3. 같은 전시장이면 종료일 비교 (먼저 끝나는 것 우선)
      const endDateCompare = a.endDate.getTime() - b.endDate.getTime();
      return endDateCompare;
    });
  }

  /**
   * 전체 필터링 및 정렬 파이프라인
   * @param events - 행사 목록
   * @param criteria - 필터 조건
   * @param currentDate - 현재 날짜
   * @param showCurrentOnly - 현재/미래 행사만 표시할지 여부 (기본값: true)
   * @returns 필터링 및 정렬된 행사 목록
   */
  static process(
    events: EventRecord[],
    criteria: FilterCriteria,
    currentDate: Date = new Date(),
    showCurrentOnly: boolean = true
  ): EventRecord[] {
    let processed = events;
    
    // showCurrentOnly가 true이고 월 필터가 "전체"일 때만 과거 행사 필터링
    // 특정 월을 선택하면 그 달의 모든 행사(과거 포함)를 표시
    if (showCurrentOnly && (!criteria.month || criteria.month === '전체')) {
      processed = this.filterPastEvents(events, currentDate);
    }
    
    processed = this.applyFilters(processed, criteria);
    processed = this.sortByStartDate(processed);
    return processed;
  }
}

/**
 * 편의 함수들
 */
export function applyFilters(events: EventRecord[], criteria: FilterCriteria): EventRecord[] {
  return FilterEngine.applyFilters(events, criteria);
}

export function filterPastEvents(events: EventRecord[], currentDate?: Date): EventRecord[] {
  return FilterEngine.filterPastEvents(events, currentDate);
}

export function sortByStartDate(events: EventRecord[]): EventRecord[] {
  return FilterEngine.sortByStartDate(events);
}
