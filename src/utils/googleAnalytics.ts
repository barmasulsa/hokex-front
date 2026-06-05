// Google Analytics 4 통계 유틸리티
// GA4 Measurement ID: G-4SHZ77PG3Y

export interface GAVisitorStats {
  today: number;
  yesterday: number;
  last7Days: number;
  last15Days: number;
  last30Days: number;
  last365Days: number;
  allTime: number;
  realTimeUsers: number;
  loading: boolean;
  error?: string;
}

/**
 * Google Analytics에서 실시간 사용자 수를 가져옵니다
 * gtag.js가 로드되어 있어야 합니다
 */
export function getRealTimeUsers(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !(window as any).gtag) {
      resolve(0);
      return;
    }

    // Google Analytics의 실시간 데이터는 gtag 이벤트를 통해 직접 가져올 수 없습니다
    // 대신 GA4 Reporting API를 사용하거나, 여기서는 0을 반환합니다
    // 실제 구현을 위해서는 서버 사이드에서 GA4 Data API를 사용해야 합니다
    resolve(0);
  });
}

/**
 * GA4에 커스텀 이벤트를 보냅니다
 */
export function sendGAEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !(window as any).gtag) {
    console.warn('Google Analytics가 로드되지 않았습니다');
    return;
  }

  (window as any).gtag('event', eventName, params);
}

/**
 * 현재 페이지 뷰를 GA4에 전송합니다
 */
export function sendPageView(path: string) {
  if (typeof window === 'undefined' || !(window as any).gtag) {
    return;
  }

  (window as any).gtag('config', 'G-4SHZ77PG3Y', {
    page_path: path,
  });
}

/**
 * Google Analytics Dashboard 링크를 생성합니다
 */
export function getGADashboardUrl(): string {
  // GA4 Property ID를 알고 있다면 직접 링크를 생성할 수 있습니다
  // 예: https://analytics.google.com/analytics/web/#/p{PROPERTY_ID}/reports/dashboard
  return 'https://analytics.google.com/';
}

/**
 * 브라우저에서 GA 대시보드를 엽니다
 */
export function openGADashboard() {
  window.open(getGADashboardUrl(), '_blank');
}

/**
 * Supabase Edge Function에서 GA4 통계를 가져옵니다
 */
export async function fetchGAStats(): Promise<GAVisitorStats> {
  const result: GAVisitorStats = {
    today: 0,
    yesterday: 0,
    last7Days: 0,
    last15Days: 0,
    last30Days: 0,
    last365Days: 0,
    allTime: 0,
    realTimeUsers: 0,
    loading: false,
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found')
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-ga-stats`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GA4 API 호출 실패: ${response.status} ${errorText}`)
    }

    const { success, data, error } = await response.json()

    if (!success || error) {
      throw new Error(error || 'GA4 데이터 조회 실패')
    }

    return {
      today: data.today || 0,
      yesterday: data.yesterday || 0,
      last7Days: data.last7Days || 0,
      last15Days: data.last15Days || 0,
      last30Days: data.last30Days || 0,
      last365Days: data.last365Days || 0,
      allTime: data.allTime || 0,
      realTimeUsers: 0, // GA4 API에서 실시간 사용자는 별도 처리 필요
      loading: false,
    }
  } catch (error) {
    console.error('fetchGAStats error:', error)
    return {
      ...result,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * GA4 통계 데이터를 설명하는 안내 메시지
 */
export const GA_INFO_MESSAGE = `
📊 Google Analytics 통계 안내

현재 사이트에는 Google Analytics 4 (GA4)가 설치되어 있습니다.
Measurement ID: G-4SHZ77PG3Y

✅ GA4에서 확인 가능한 통계:
• 실시간 방문자 수
• 일별/주별/월별 방문자 추이
• 페이지뷰 및 이벤트
• 사용자 인구통계 (연령, 성별, 지역)
• 트래픽 소스 분석
• 사용자 행동 흐름
• 전환 추적

🔗 Google Analytics 대시보드 접속 방법:
1. 아래 버튼을 클릭하여 GA 대시보드로 이동
2. Google 계정으로 로그인
3. 해당 속성(Property) 선택
4. 보고서(Reports) 메뉴에서 원하는 통계 확인

💡 참고사항:
• GA4는 실시간 데이터와 과거 데이터를 모두 제공합니다
• 데이터는 24시간 후 정확히 집계됩니다
• 개인정보 보호를 위해 일부 데이터는 집계되어 표시됩니다
`;
