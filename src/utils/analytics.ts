// Google Analytics 4 유틸리티 함수

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    GA4_MEASUREMENT_ID?: string;
  }
}

// GA4 초기화
export function initGA4() {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  
  if (!measurementId || measurementId === '') {
    console.warn('GA4 측정 ID가 설정되지 않았습니다.');
    return;
  }

  // gtag.js 스크립트 로드
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // dataLayer 초기화
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer!.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
  
  console.log('GA4 초기화 완료:', measurementId);
}

// 페이지뷰 추적
export function trackPageView(path: string) {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path
    });
  }
}

// 커스텀 이벤트 추적
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// 방문자 통계 가져오기 (로컬 스토리지 기반 - 간단한 구현)
export interface VisitorStats {
  today: number;
  last7Days: number;
  last30Days: number;
}

// 로컬 스토리지에 방문 기록 저장 - 하루에 한 번만 카운트
export function recordVisit() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 오늘 이미 방문했는지 확인
  const lastVisitDate = localStorage.getItem('last_visit_date');
  if (lastVisitDate === today) {
    // 오늘 이미 방문했으면 카운트하지 않음
    return;
  }
  
  // 오늘 첫 방문이므로 기록
  localStorage.setItem('last_visit_date', today);
  
  const visits = getVisitHistory();
  
  // 오늘 날짜가 없으면 추가
  if (!visits[today]) {
    visits[today] = 0;
  }
  visits[today]++;
  
  // 30일 이전 데이터 삭제
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  Object.keys(visits).forEach(date => {
    if (new Date(date) < thirtyDaysAgo) {
      delete visits[date];
    }
  });
  
  localStorage.setItem('visitor_history', JSON.stringify(visits));
}

// 방문 기록 가져오기
function getVisitHistory(): Record<string, number> {
  const stored = localStorage.getItem('visitor_history');
  return stored ? JSON.parse(stored) : {};
}

// 방문자 통계 계산
export function getVisitorStats(): VisitorStats {
  const visits = getVisitHistory();
  const today = new Date().toISOString().split('T')[0];
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let todayCount = visits[today] || 0;
  let last7DaysCount = 0;
  let last30DaysCount = 0;
  
  Object.entries(visits).forEach(([date, count]) => {
    const visitDate = new Date(date);
    
    if (visitDate >= sevenDaysAgo) {
      last7DaysCount += count;
    }
    
    if (visitDate >= thirtyDaysAgo) {
      last30DaysCount += count;
    }
  });
  
  return {
    today: todayCount,
    last7Days: last7DaysCount,
    last30Days: last30DaysCount
  };
}
