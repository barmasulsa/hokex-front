// 새로운 방문자 카운터 시스템 서비스
import { supabase } from '../lib/supabase';

export interface VisitorStats {
  totalCount: number;
  todayCount: number;
  lastVisitDate: string | null;
}

/**
 * 방문 추적 (Edge Function 호출)
 * @param domain - 도메인명 (기본값: hokex.xyz)
 * @returns 통계 정보 또는 null (에러 시)
 */
export const trackVisit = async (domain: string = 'hokex.xyz') => {
  try {
    const { data, error } = await supabase.functions.invoke('track-visit', {
      body: { domain }
    });

    if (error) {
      console.error('Failed to track visit:', error);
      return null;
    }

    return {
      totalCount: data.totalCount,
      todayCount: data.todayCount,
      isDuplicate: data.duplicate
    };
  } catch (error) {
    console.error('Failed to track visit:', error);
    return null;
  }
};

/**
 * 방문자 통계 조회
 * @param domain - 도메인명 (기본값: hokex.xyz)
 * @returns 통계 정보
 */
export const getVisitorStats = async (domain: string = 'hokex.xyz'): Promise<VisitorStats> => {
  try {
    const { data, error } = await supabase
      .from('visitor_sites')
      .select('total_count, today_count, last_visit_date')
      .eq('domain', domain)
      .single();

    if (error) {
      console.error('Failed to get visitor stats:', error);
      return { totalCount: 0, todayCount: 0, lastVisitDate: null };
    }

    return {
      totalCount: data?.total_count || 0,
      todayCount: data?.today_count || 0,
      lastVisitDate: data?.last_visit_date
    };
  } catch (error) {
    console.error('Failed to get visitor stats:', error);
    return { totalCount: 0, todayCount: 0, lastVisitDate: null };
  }
};

/**
 * 방문자 로그 조회 (관리자용)
 * @param domain - 도메인명
 * @param limit - 조회 개수 (기본값: 100)
 * @returns 방문자 로그 배열
 */
export const getVisitorLogs = async (domain: string = 'hokex.xyz', limit: number = 100) => {
  try {
    // 먼저 site_id 조회
    const { data: site, error: siteError } = await supabase
      .from('visitor_sites')
      .select('id')
      .eq('domain', domain)
      .single();

    if (siteError || !site) {
      console.error('Site not found:', siteError);
      return [];
    }

    // 로그 조회
    const { data, error } = await supabase
      .from('visitor_logs')
      .select('*')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get visitor logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get visitor logs:', error);
    return [];
  }
};

/**
 * 중복 제거 레코드 조회 (디버깅용)
 * @param domain - 도메인명
 * @returns 중복 제거 레코드 배열
 */
export const getDedupRecords = async (domain: string = 'hokex.xyz') => {
  try {
    // 먼저 site_id 조회
    const { data: site, error: siteError } = await supabase
      .from('visitor_sites')
      .select('id')
      .eq('domain', domain)
      .single();

    if (siteError || !site) {
      console.error('Site not found:', siteError);
      return [];
    }

    // Dedup 레코드 조회
    const { data, error } = await supabase
      .from('visitor_dedup')
      .select('*')
      .eq('site_id', site.id)
      .order('last_visit', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to get dedup records:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get dedup records:', error);
    return [];
  }
};
