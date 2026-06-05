// @ts-nocheck
// 방문자 통계 캐시 업데이트 Edge Function
// 30분마다: 오늘 방문자 수만 업데이트
// 새벽 4시: 전체 통계 업데이트

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성 (서비스 키 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 파라미터 확인 (type: 'today' 또는 'full')
    let updateType = 'full'; // 기본값: 전체 업데이트
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        updateType = body.type || 'full';
      } catch {
        // JSON 파싱 실패 시 기본값 사용
      }
    }

    // 한국 시간(KST, UTC+9) 사용
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
    const kstNow = new Date(now.getTime() + kstOffset);
    const today = kstNow.toISOString().split('T')[0]; // KST 기준 오늘
    
    console.log(`[update-visitor-stats-cache] UTC: ${now.toISOString()}, KST: ${kstNow.toISOString()}, Today: ${today}`);

    
    if (updateType === 'today') {
      // 30분마다: 오늘 방문자 수만 업데이트
      const { data: todayRecords, error: todayError } = await supabase
        .from('visitor_stats')
        .select('visit_count')
        .eq('visit_date', today);

      if (todayError) {
        throw todayError;
      }

      const todayCount = todayRecords?.reduce((sum, r) => sum + r.visit_count, 0) || 0;

      // 캐시에서 기존 데이터 가져오기
      const { data: existingCache } = await supabase
        .from('visitor_stats_cache')
        .select('*')
        .eq('cache_key', 'summary')
        .single();

      // 오늘 방문자 수만 업데이트
      const { error: updateError } = await supabase
        .from('visitor_stats_cache')
        .upsert({
          cache_key: 'summary',
          today: todayCount,
          yesterday: existingCache?.yesterday || 0,
          last_7_days: existingCache?.last_7_days || 0,
          last_30_days: existingCache?.last_30_days || 0,
          last_365_days: existingCache?.last_365_days || 0,
          total_visits: existingCache?.total_visits || 0,
          first_visit_date: existingCache?.first_visit_date || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        });

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'today',
          stats: { today: todayCount },
          updated_at: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 새벽 4시: 전체 통계 업데이트 (KST 기준)
    const yesterday = new Date(kstNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(kstNow);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const thirtyDaysAgo = new Date(kstNow);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const oneYearAgo = new Date(kstNow);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    console.log(`[update-visitor-stats-cache] Yesterday: ${yesterdayStr}, 7 days ago: ${sevenDaysAgoStr}`);

    // DB에서 최근 1년 데이터 조회 (visit_hour 포함)
    const { data: records, error } = await supabase
      .from('visitor_stats')
      .select('visit_date, visit_hour, visit_count')
      .gte('visit_date', oneYearAgoStr)
      .order('visit_date', { ascending: true });

    if (error) {
      throw error;
    }

    // 통계 계산
    let todayCount = 0;
    let yesterdayCount = 0;
    let last7DaysCount = 0;
    let last30DaysCount = 0;
    let last365DaysCount = 0;
    let totalVisits = 0;
    let firstVisitDate: string | null = null;

    if (records && records.length > 0) {
      firstVisitDate = records[0].visit_date;

      // 날짜별로 집계 (같은 날짜의 여러 시간대 합산)
      const dailyMap = new Map<string, number>();
      
      records.forEach(record => {
        const date = record.visit_date;
        const count = record.visit_count;
        
        // 날짜별 합산
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + count);
        
        // 총 방문 수 누적
        totalVisits += count;
      });

      // 각 기간별 집계
      dailyMap.forEach((count, date) => {
        if (date === today) {
          todayCount += count;
        }
        if (date === yesterdayStr) {
          yesterdayCount += count;
        }
        if (date >= sevenDaysAgoStr) {
          last7DaysCount += count;
        }
        if (date >= thirtyDaysAgoStr) {
          last30DaysCount += count;
        }
        last365DaysCount += count;
      });
    }

    // 캐시 업데이트
    const { error: updateError } = await supabase
      .from('visitor_stats_cache')
      .upsert({
        cache_key: 'summary',
        today: todayCount,
        yesterday: yesterdayCount,
        last_7_days: last7DaysCount,
        last_30_days: last30DaysCount,
        last_365_days: last365DaysCount,
        total_visits: totalVisits,
        first_visit_date: firstVisitDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        type: 'full',
        stats: {
          today: todayCount,
          yesterday: yesterdayCount,
          last_7_days: last7DaysCount,
          last_30_days: last30DaysCount,
          last_365_days: last365DaysCount,
          total_visits: totalVisits,
          first_visit_date: firstVisitDate
        },
        updated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error updating visitor stats cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
