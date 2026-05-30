/**
 * 배너 팝업 localStorage 관리 유틸리티
 * 
 * 기능:
 * - 배너별 "다시 보지 않기" 상태 저장 (영구적)
 * - 하루에 한 번만 팝업 표시
 */

const STORAGE_KEY_PREFIX = 'banner_popup_dismissed_';
const STORAGE_KEY_LAST_SHOWN = 'banner_popup_last_shown_';

interface DismissedInfo {
  dismissedAt: string; // ISO 8601 날짜 문자열
  permanent: boolean;  // 영구 숨김 여부
}

/**
 * 배너를 영구적으로 숨김 처리 (다시 보지 않기)
 */
export function dismissBannerForWeek(bannerId: string): void {
  const now = new Date();

  const info: DismissedInfo = {
    dismissedAt: now.toISOString(),
    permanent: true
  };

  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${bannerId}`,
      JSON.stringify(info)
    );
  } catch (error) {
    console.error('Failed to save banner dismiss state:', error);
  }
}

/**
 * 배너가 숨김 상태인지 확인
 * @returns true면 숨김 상태 (표시하지 않음)
 */
export function isBannerDismissed(bannerId: string): boolean {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${bannerId}`);
    if (!stored) {
      return false;
    }

    const info: DismissedInfo = JSON.parse(stored);
    
    // 영구 숨김이면 항상 true 반환
    if (info.permanent) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to check banner dismiss state:', error);
    return false;
  }
}

/**
 * 오늘 이미 팝업을 표시했는지 확인
 * @returns true면 오늘 이미 표시함
 */
export function wasShownToday(bannerId: string): boolean {
  try {
    const lastShown = localStorage.getItem(`${STORAGE_KEY_LAST_SHOWN}${bannerId}`);
    if (!lastShown) {
      return false;
    }

    const lastShownDate = new Date(lastShown);
    const today = new Date();

    // 같은 날인지 확인 (년-월-일만 비교)
    return (
      lastShownDate.getFullYear() === today.getFullYear() &&
      lastShownDate.getMonth() === today.getMonth() &&
      lastShownDate.getDate() === today.getDate()
    );
  } catch (error) {
    console.error('Failed to check last shown date:', error);
    return false;
  }
}

/**
 * 팝업을 오늘 표시했다고 기록
 */
export function markAsShownToday(bannerId: string): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_LAST_SHOWN}${bannerId}`,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('Failed to mark banner as shown:', error);
  }
}

/**
 * 배너 팝업 표시 여부 확인 (통합 함수)
 * @returns true면 표시해야 함, false면 표시하지 않음
 */
export function shouldShowBannerPopup(bannerId: string): boolean {
  // 1. 다시 보지 않기 상태인지 확인
  if (isBannerDismissed(bannerId)) {
    return false;
  }

  // 2. 오늘 이미 표시했는지 확인
  if (wasShownToday(bannerId)) {
    return false;
  }

  return true;
}

/**
 * 배너 팝업 관련 모든 데이터 삭제 (테스트용)
 */
export function clearAllBannerPopupData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_KEY_LAST_SHOWN)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear banner popup data:', error);
  }
}
