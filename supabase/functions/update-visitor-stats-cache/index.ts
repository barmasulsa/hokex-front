// 방문자 통계 캐시 업데이트 Edge Function
// 5분마다 Supabase Cron으로 실행

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

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 어제
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // 기준 날짜들
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // DB에서 최근 1년 데이터 조회
    const { data: records, error } = await supabase
      .from('visitor_stats')
      .select('visit_date, visit_count')
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
        
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + count);
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
