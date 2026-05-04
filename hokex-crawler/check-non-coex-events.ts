/**
 * 포스터 없는 행사들이 COEX 행사인지 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNonCoexEvents() {
  console.log('=== 포스터 없는 행사 상세 정보 확인 ===\n');

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .is('poster_url', null)
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

  if (!events || events.length === 0) {
    console.log('✅ 포스터 없는 행사가 없습니다!');
    return;
  }

  console.log(`총 ${events.length}개 행사\n`);

  events.forEach(event => {
    console.log(`\n📋 ${event.title}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   전시장: ${event.venue || '없음'}`);
    console.log(`   홀: ${event.hall || '없음'}`);
    console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
    console.log(`   관련 사이트: ${event.target_link || '없음'}`);
    console.log(`   생성일: ${event.created_at}`);
  });

  console.log('\n\n=== 분석 ===');
  
  const coexEvents = events.filter(e => 
    e.venue?.toLowerCase().includes('coex') || 
    e.hall?.toLowerCase().includes('coex')
  );
  
  const nonCoexEvents = events.filter(e => 
    !e.venue?.toLowerCase().includes('coex') && 
    !e.hall?.toLowerCase().includes('coex')
  );

  console.log(`\n✅ COEX 행사: ${coexEvents.length}개`);
  coexEvents.forEach(e => console.log(`   - ${e.title}`));

  console.log(`\n⚠️  COEX 아닌 행사: ${nonCoexEvents.length}개`);
  nonCoexEvents.forEach(e => console.log(`   - ${e.title} (${e.venue || '전시장 정보 없음'})`));

  if (nonCoexEvents.length > 0) {
    console.log('\n💡 COEX가 아닌 행사는 샘플 데이터일 가능성이 높습니다.');
    console.log('   이 행사들을 삭제하시겠습니까?');
  }
}

checkNonCoexEvents();
