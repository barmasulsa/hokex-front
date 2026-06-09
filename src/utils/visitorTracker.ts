/**
 * Visitor Tracker Utility
 * Based on: free-visit-counter-api-dashboard
 * 
 * 자동으로 페이지 방문을 추적하고 서버에 전송합니다.
 * 
 * Usage:
 * ```ts
 * import { trackVisit } from './utils/visitorTracker';
 * trackVisit();
 * ```
 */

interface VisitData {
  domain: string;
  timezone: string;
  page_path: string;
  page_title: string;
  referrer: string;
  search_query: string;
}

interface VisitResponse {
  dashboardUrl: string;
  totalCount: number;
  todayCount: number;
  counted: boolean;
}

/**
 * 현재 페이지 방문을 추적합니다
 */
export async function trackVisit(): Promise<VisitResponse | null> {
  try {
    const domain = window.location.hostname;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const page_path = window.location.pathname;
    const page_title = document.title;
    const referrer = document.referrer;

    // 검색 엔진에서 온 경우 검색 쿼리 추출
    let search_query = '';
    if (referrer) {
      try {
        const url = new URL(referrer);
        const searchEngines = [
          { hostname: 'google', param: 'q' },
          { hostname: 'bing', param: 'q' },
          { hostname: 'yahoo', param: 'p' },
          { hostname: 'duckduckgo', param: 'q' },
          { hostname: 'naver', param: 'query' },
          { hostname: 'daum', param: 'q' }
        ];

        for (const engine of searchEngines) {
          if (url.hostname.includes(engine.hostname)) {
            search_query = url.searchParams.get(engine.param) || '';
            break;
          }
        }
      } catch (e) {
        // 유효하지 않은 URL, 무시
        console.debug('Invalid referrer URL:', e);
      }
    }

    const visitData: VisitData = {
      domain,
      timezone,
      page_path,
      page_title,
      referrer,
      search_query
    };

    // Supabase Edge Function 호출
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify(visitData)
    });

    if (!response.ok) {
      throw new Error(`Failed to track visit: ${response.statusText}`);
    }

    const data: VisitResponse = await response.json();
    
    console.log('🔍 방문자 추적:', {
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      counted: data.counted
    });

    // 방문자 수를 표시할 엘리먼트가 있다면 업데이트
    updateVisitorDisplay(data);

    return data;
  } catch (error) {
    console.error('방문자 추적 오류:', error);
    return null;
  }
}

/**
 * 방문자 수를 페이지에 표시합니다
 */
function updateVisitorDisplay(data: VisitResponse): void {
  // ID로 엘리먼트 찾기
  const totalCountEl = document.getElementById('visitor-total-count');
  const todayCountEl = document.getElementById('visitor-today-count');

  if (totalCountEl) {
    totalCountEl.textContent = data.totalCount.toLocaleString();
  }

  if (todayCountEl) {
    todayCountEl.textContent = data.todayCount.toLocaleString();
  }

  // data attribute로 찾기
  const els = document.querySelectorAll('[data-visitor-count]');
  els.forEach(el => {
    const type = el.getAttribute('data-visitor-count');
    if (type === 'total') {
      el.textContent = data.totalCount.toLocaleString();
    } else if (type === 'today') {
      el.textContent = data.todayCount.toLocaleString();
    }
  });
}

/**
 * React Hook for visitor tracking
 */
export function useVisitorTracker() {
  const [stats, setStats] = React.useState<VisitResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    trackVisit().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  return { stats, loading };
}

/**
 * 페이지 로드 시 자동으로 추적 (전역 스크립트용)
 */
if (typeof window !== 'undefined') {
  // DOMContentLoaded 이벤트에서 자동 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.location.pathname.includes('/admin')) {
        trackVisit();
      }
    });
  } else {
    // 이미 로드된 경우 즉시 실행
    if (!window.location.pathname.includes('/admin')) {
      trackVisit();
    }
  }
}

// React import (선택사항)
import React from 'react';
