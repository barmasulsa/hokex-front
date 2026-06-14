// Supabase 기반 방문자 카운터 시스템
// Edge Function: track-visit
// Tables: visitor_sites, visitor_logs, visitor_dedup

import { supabase } from '../lib/supabase';

export interface VisitorStats {
  totalCount: number;
  todayCount: number;
  lastVisitDate?: string;
  isDuplicate?: boolean;
}

export interface DetailedVisitorStats {
  domain: string;
  timestamp: string;
  stats: {
    today: number;
    yesterday: number;
    last_7_days: number;
    last_30_days: number;
    last_3_months: number;
    last_6_months: number;
    last_1_year: number;
    total: number;
  };
}

const DOMAIN = 'hokex.xyz';

// 중복 방지를 위한 세션 키
const SESSION_KEY = 'visitor_recorded_this_session';

/**
 * 방문 기록 (페이지 로드 시 자동 호출)
 * Supabase Edge Function을 통해 20분 TTL 중복 방지
 */
export async function trackVisit(domain: string = DOMAIN): Promise<VisitorStats | null> {
  // 세션 내 중복 호출 방지
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    console.log('[방문자 추적] 이번 세션에서 이미 기록됨 - 스킵');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('track-visit', {
      body: { domain }
    });

    if (error) throw error;

    // 세션 플래그 설정 (중복 방지가 아닌 경우에만)
    if (!data.duplicate) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }

    console.log('[방문자 추적] 기록 성공:', {
      today: data.todayCount,
      total: data.totalCount,
      duplicate: data.duplicate
    });

    return {
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      isDuplicate: data.duplicate
    };
  } catch (error) {
    console.error('[방문자 추적] 기록 실패:', error);
    return null;
  }
}

/**
 * 방문 통계 조회 (Supabase에서 직접 가져오기)
 */
export async function getVisitorStats(domain: string = DOMAIN): Promise<VisitorStats | null> {
  try {
    const { data, error } = await supabase
      .from('visitor_sites')
      .select('total_count, today_count, last_visit_date')
      .eq('domain', domain)
      .single();

    if (error) throw error;

    return {
      totalCount: data?.total_count || 0,
      todayCount: data?.today_count || 0,
      lastVisitDate: data?.last_visit_date
    };
  } catch (error) {
    console.error('[방문자 통계] 조회 실패:', error);
    return { totalCount: 0, todayCount: 0 };
  }
}

/**
 * 방문 로그 조회 (최근 N개)
 */
export async function getRecentVisitorLogs(domain: string = DOMAIN, limit: number = 100) {
  try {
    // 먼저 site_id 조회
    const { data: site, error: siteError } = await supabase
      .from('visitor_sites')
      .select('id')
      .eq('domain', domain)
      .single();

    if (siteError) throw siteError;

    // 로그 조회
    const { data: logs, error: logsError } = await supabase
      .from('visitor_logs')
      .select('*')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (logsError) throw logsError;

    return logs;
  } catch (error) {
    console.error('[방문 로그] 조회 실패:', error);
    return [];
  }
}

/**
 * 상세한 기간별 방문자 통계 조회 (관리자용)
 */
export async function getDetailedVisitorStatistics(domain: string = DOMAIN): Promise<DetailedVisitorStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_visitor_statistics', { p_domain: domain });

    if (error) throw error;

    console.log('[방문자 통계] 상세 조회 성공:', data);
    return data;
  } catch (error) {
    console.error('[방문자 통계] 상세 조회 실패:', error);
    return null;
  }
}

// 시간대별 통계 인터페이스
export interface HourlyStats {
  hour: number;
  count: number;
}

// 날짜별 통계 인터페이스
export interface DailyStats {
  date: string;
  count: number;
}

// 커스텀 날짜 범위 통계 인터페이스
export interface CustomRangeStats {
  start_date: string;
  end_date: string;
  unique_visitors: number;
}

// 월별 통계 인터페이스
export interface MonthlyStats {
  year: number;
  month: number;
  month_label: string;
  unique_visitors: number;
}

/**
 * 시간대별 방문자 통계 조회 (오늘) - 고유 방문자 기준
 */
export async function getHourlyVisitorStats(domain: string = DOMAIN): Promise<HourlyStats[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_hourly_unique_visitors', { p_domain: domain });

    if (error) throw error;

    console.log('[시간대별 통계] 조회 성공:', data);
    return data || [];
  } catch (error) {
    console.error('[시간대별 통계] 조회 실패:', error);
    // Fallback: 빈 배열 반환
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  }
}

/**
 * 날짜별 방문자 통계 조회 (최근 N일) - 고유 방문자 기준
 */
export async function getDailyVisitorStats(domain: string = DOMAIN, days: number = 30): Promise<DailyStats[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_daily_unique_visitors', { 
        p_domain: domain,
        p_days: days 
      });

    if (error) throw error;

    console.log('[날짜별 통계] 조회 성공:', data);
    return data || [];
  } catch (error) {
    console.error('[날짜별 통계] 조회 실패:', error);
    // Fallback: 빈 배열 반환
    return [];
  }
}

/**
 * 커스텀 날짜 범위의 고유 방문자 수 조회
 */
export async function getCustomDateRangeStats(
  domain: string = DOMAIN,
  startDate: string, // YYYY-MM-DD 형식
  endDate: string     // YYYY-MM-DD 형식
): Promise<CustomRangeStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_custom_date_range_visitors', {
        p_domain: domain,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;

    console.log('[커스텀 날짜 범위] 조회 성공:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('[커스텀 날짜 범위] 조회 실패:', error);
    return null;
  }
}

/**
 * 특정 월의 고유 방문자 수 조회
 */
export async function getMonthlyStats(
  domain: string = DOMAIN,
  year: number,
  month: number // 1-12
): Promise<MonthlyStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_monthly_unique_visitors', {
        p_domain: domain,
        p_year: year,
        p_month: month
      });

    if (error) throw error;

    console.log('[월별 통계] 조회 성공:', data);
    return data?.[0] || null;
  } catch (error) {
    console.error('[월별 통계] 조회 실패:', error);
    return null;
  }
}

/**
 * 특정 년도의 전체 월별 통계 조회
 */
export async function getYearlyMonthlyStats(
  domain: string = DOMAIN,
  year: number
): Promise<MonthlyStats[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_yearly_monthly_stats', {
        p_domain: domain,
        p_year: year
      });

    if (error) throw error;

    console.log('[년도별 월 통계] 조회 성공:', data);
    return data || [];
  } catch (error) {
    console.error('[년도별 월 통계] 조회 실패:', error);
    return [];
  }
}

/**
 * 커스텀 날짜 범위의 날짜별 고유 방문자 수 조회
 */
export async function getDailyVisitorsInRange(
  domain: string = DOMAIN,
  startDate: string, // YYYY-MM-DD 형식
  endDate: string     // YYYY-MM-DD 형식
): Promise<DailyStats[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_daily_visitors_in_range', {
        p_domain: domain,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;

    console.log('[기간 내 날짜별 통계] 조회 성공:', data);
    return data || [];
  } catch (error) {
    console.error('[기간 내 날짜별 통계] 조회 실패:', error);
    return [];
  }
}

/**
 * 통계 데이터 CSV로 다운로드
 */
export function downloadStatsAsCSV(stats: DetailedVisitorStats, hourlyStats: HourlyStats[], dailyStats: DailyStats[]) {
  try {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // 기본 통계
    csvContent += '방문자 통계 리포트\n';
    csvContent += `도메인,${stats.domain}\n`;
    csvContent += `생성 시각,${stats.timestamp}\n\n`;
    
    csvContent += '기간별 통계\n';
    csvContent += '기간,방문자 수\n';
    csvContent += `오늘,${stats.stats.today}\n`;
    csvContent += `어제,${stats.stats.yesterday}\n`;
    csvContent += `최근 7일,${stats.stats.last_7_days}\n`;
    csvContent += `최근 30일,${stats.stats.last_30_days}\n`;
    csvContent += `최근 3개월,${stats.stats.last_3_months}\n`;
    csvContent += `최근 6개월,${stats.stats.last_6_months}\n`;
    csvContent += `최근 1년,${stats.stats.last_1_year}\n`;
    csvContent += `전체,${stats.stats.total}\n\n`;
    
    // 시간대별 통계
    csvContent += '시간대별 통계 (오늘)\n';
    csvContent += '시간,방문자 수\n';
    hourlyStats.forEach(h => {
      csvContent += `${h.hour}시,${h.count}\n`;
    });
    csvContent += '\n';
    
    // 날짜별 통계
    csvContent += '날짜별 통계 (최근 30일)\n';
    csvContent += '날짜,방문자 수\n';
    dailyStats.forEach(d => {
      csvContent += `${d.date},${d.count}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor_stats_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('[통계 다운로드] CSV 다운로드 성공');
  } catch (error) {
    console.error('[통계 다운로드] CSV 다운로드 실패:', error);
    alert('다운로드에 실패했습니다.');
  }
}
