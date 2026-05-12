import type { EventRecord, FilterCriteria } from '../types/core';

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
          return event.category.includes(criteria.category!);
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
   * 시작 날짜 기준 오름차순 정렬
   * @param events - 행사 목록
   * @returns 정렬된 행사 목록
   */
  static sortByStartDate(events: EventRecord[]): EventRecord[] {
    return [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
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
