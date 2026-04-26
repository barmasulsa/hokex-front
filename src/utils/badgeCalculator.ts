import type { EventRecord } from '../types/core';
import { StatusBadge } from '../types/core';

export class BadgeCalculator {
  /**
   * 현재 날짜 기준으로 행사 상태 배지 계산
   * @param event - 행사 레코드
   * @param currentDate - 현재 날짜
   * @returns 상태 배지 또는 null
   */
  static calculateStatus(
    event: Pick<EventRecord, 'startDate' | 'endDate'>,
    currentDate: Date
  ): StatusBadge | null {
    // 현재 날짜를 자정으로 설정
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(event.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(event.endDate);
    endDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.ceil(
      (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 현재 날짜가 시작 날짜와 종료 날짜 사이 (오늘 시작하는 행사 포함)
    if (today >= startDate && today <= endDate) {
      return StatusBadge.OnGoing;
    }

    // 현재 날짜가 시작 날짜보다 60일(2개월) 이상 이전
    if (daysDiff >= 60) {
      return StatusBadge.ComingSoon;
    }

    // 현재 날짜가 시작 날짜 60일 이내
    if (daysDiff > 0 && daysDiff < 60) {
      return StatusBadge.DDay;
    }

    return null;
  }

  /**
   * D-DAY까지 남은 일수 계산
   * @param event - 행사 레코드
   * @param currentDate - 현재 날짜
   * @returns 남은 일수 (음수면 이미 시작됨)
   */
  static calculateDaysUntilStart(
    event: Pick<EventRecord, 'startDate'>,
    currentDate: Date
  ): number {
    return Math.ceil(
      (event.startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
}

/**
 * 편의 함수: 행사 상태 배지 계산
 */
export function calculateStatusBadge(
  event: Pick<EventRecord, 'startDate' | 'endDate'>,
  currentDate: Date = new Date()
): StatusBadge | null {
  return BadgeCalculator.calculateStatus(event, currentDate);
}

/**
 * 편의 함수: D-DAY까지 남은 일수 계산
 */
export function calculateDaysUntilStart(
  event: Pick<EventRecord, 'startDate'>,
  currentDate: Date = new Date()
): number {
  return BadgeCalculator.calculateDaysUntilStart(event, currentDate);
}
