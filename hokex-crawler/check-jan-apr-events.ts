import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJanAprEvents() {
  console.log('=== 2026년 1월~4월 행사 확인 ===\n');

  // 1월~4월 행사 조회 (시작일 또는 종료일이 해당 기간에 포함)
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .or(
      'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
      'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
      'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
    )
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`총 ${events?.length || 0}개의 행사 발견\n`);

  if (events && events.length > 0) {
    // 월별로 그룹화
    const byMonth: Record<string, any[]> = {
      '2026-01': [],
      '2026-02': [],
      '2026-03': [],
      '2026-04': [],
    };

    events.forEach(event => {
      const startMonth = event.start_date.slice(0, 7);
      const endMonth = event.end_date.slice(0, 7);
      
      // 시작일이 해당 월에 포함
      if (byMonth[startMonth]) {
        byMonth[startMonth].push(event);
      }
      
      // 종료일이 해당 월에 포함 (시작일과 다른 경우)
      if (byMonth[endMonth] && startMonth !== endMonth) {
        byMonth[endMonth].push(event);
      }
    });

    // 월별 출력
    Object.entries(byMonth).forEach(([month, monthEvents]) => {
      const monthLabel = month.slice(5, 7) + '월';
      console.log(`\n${monthLabel}: ${monthEvents.length}개`);
      monthEvents.forEach(event => {
        console.log(`  - ${event.title}`);
        console.log(`    기간: ${event.start_date} ~ ${event.end_date}`);
        console.log(`    장소: ${event.venue}`);
      });
    });
  } else {
    console.log('❌ 1월~4월 행사가 데이터베이스에 없습니다.');
  }
}

checkJanAprEvents();
