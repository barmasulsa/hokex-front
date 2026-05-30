import type { Announcement } from '../types/announcement';

const VIEWED_KEY = 'viewedAnnouncements';
const HIDE_UNTIL_KEY = 'hideUntilAnnouncements';

interface ViewedAnnouncements {
  [announcementId: string]: string; // ISO timestamp
}

interface HideUntilAnnouncements {
  [announcementId: string]: string; // ISO timestamp (오늘 자정)
}

/**
 * 알림을 본 것으로 표시
 */
export function markAsViewed(announcementId: string): void {
  try {
    const viewed = getViewedAnnouncements();
    viewed[announcementId] = new Date().toISOString();
    localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  } catch (error) {
    console.error('Error marking announcement as viewed:', error);
  }
}

/**
 * 오늘 하루 보지 않기
 */
export function hideUntilTomorrow(announcementId: string): void {
  try {
    const hideUntil = getHideUntilAnnouncements();
    
    // 오늘 자정 계산
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    
    hideUntil[announcementId] = tomorrow.toISOString();
    localStorage.setItem(HIDE_UNTIL_KEY, JSON.stringify(hideUntil));
  } catch (error) {
    console.error('Error hiding announcement:', error);
  }
}

/**
 * 알림을 표시해야 하는지 확인
 */
export function shouldShowAnnouncement(announcement: Announcement): boolean {
  try {
    // 1. 이미 본 알림인지 확인
    const viewed = getViewedAnnouncements();
    if (viewed[announcement.id]) {
      return false;
    }

    // 2. "오늘 하루 보지 않기"로 숨긴 알림인지 확인
    const hideUntil = getHideUntilAnnouncements();
    const hideUntilDate = hideUntil[announcement.id];
    
    if (hideUntilDate) {
      const now = new Date();
      const hideUntilTime = new Date(hideUntilDate);
      
      if (now < hideUntilTime) {
        return false; // 아직 숨김 기간
      } else {
        // 숨김 기간이 지났으면 제거
        delete hideUntil[announcement.id];
        localStorage.setItem(HIDE_UNTIL_KEY, JSON.stringify(hideUntil));
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking if should show announcement:', error);
    return true; // 에러 시 표시
  }
}

/**
 * 만료된 hideUntil 정리
 */
export function cleanupExpiredHides(): void {
  try {
    const hideUntil = getHideUntilAnnouncements();
    const now = new Date();
    let hasChanges = false;

    Object.keys(hideUntil).forEach(id => {
      const hideUntilTime = new Date(hideUntil[id]);
      if (now >= hideUntilTime) {
        delete hideUntil[id];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      localStorage.setItem(HIDE_UNTIL_KEY, JSON.stringify(hideUntil));
    }
  } catch (error) {
    console.error('Error cleaning up expired hides:', error);
  }
}

/**
 * localStorage에서 본 알림 목록 가져오기
 */
function getViewedAnnouncements(): ViewedAnnouncements {
  try {
    const stored = localStorage.getItem(VIEWED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting viewed announcements:', error);
    return {};
  }
}

/**
 * localStorage에서 숨긴 알림 목록 가져오기
 */
function getHideUntilAnnouncements(): HideUntilAnnouncements {
  try {
    const stored = localStorage.getItem(HIDE_UNTIL_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting hide until announcements:', error);
    return {};
  }
}
