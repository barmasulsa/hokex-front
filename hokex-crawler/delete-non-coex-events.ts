/**
 * COEX가 아닌 기타 전시장 행사 삭제
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

async function deleteNonCoexEvents() {
  console.log('=== COEX가 아닌 기타 전시장 행사 삭제 ===\n');

  // COEX가 아닌 행사 찾기
  const { data: nonCoexEvents, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .not('venue', 'ilike', '%coex%')
    .not('venue', 'ilike', '%코엑스%')
    .order('start_date', { ascending: true });

  if (fetchError) {
    console.error('❌ 조회 실패:', fetchError);
    return;
  }

  if (!nonCoexEvents || nonCoexEvents.length === 0) {
    console.log('✅ COEX가 아닌 행사가 없습니다!');
    return;
  }

  console.log(`📋 삭제할 행사: ${nonCoexEvents.length}개\n`);

  nonCoexEvents.forEach(event => {
    console.log(`  - ${event.title}`);
    console.log(`    전시장: ${event.venue}`);
    console.log(`    기간: ${event.start_date} ~ ${event.end_date}`);
    console.log();
  });

  console.log('🗑️  삭제 중...\n');

  // ID 목록으로 삭제 실행
  const idsToDelete = nonCoexEvents.map(e => e.id);
  
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError);
    return;
  }

  console.log(`✅ ${nonCoexEvents.length}개 행사 삭제 완료!`);

  // 삭제 후 확인
  const { data: remainingEvents, error: checkError } = await supabase
    .from('events')
    .select('id')
    .not('venue', 'ilike', '%coex%')
    .not('venue', 'ilike', '%코엑스%');

  if (checkError) {
    console.error('❌ 확인 실패:', checkError);
    return;
  }

  if (!remainingEvents || remainingEvents.length === 0) {
    console.log('✅ 모든 기타 전시장 행사가 삭제되었습니다.');
  } else {
    console.log(`⚠️  아직 ${remainingEvents.length}개 행사가 남아있습니다.`);
  }

  // 전체 행사 수 확인
  const { count, error: countError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📊 현재 전체 행사 수: ${count}개`);
  }
}

deleteNonCoexEvents();
