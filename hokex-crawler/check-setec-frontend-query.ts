/**
 * 프론트엔드가 실제로 받는 SETEC 데이터 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!; // 프론트엔드와 동일한 키 사용
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFrontendQuery() {
  console.log('🔍 프론트엔드 쿼리 시뮬레이션 (ANON KEY 사용)...\n');

  try {
    // 프론트엔드와 동일한 쿼리
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true })
      .limit(3);

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${data.length}개 행사 조회됨\n`);

    data.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   operating_hours: ${event.operating_hours || '❌ NULL'}`);
      console.log(`   admission_fee: ${event.admission_fee || '❌ NULL'}`);
      console.log(`   contact: ${event.contact || '❌ NULL'}`);
      console.log(`   organizer: ${event.organizer || '❌ NULL'}`);
      console.log(`   venue_event_page_url: ${event.venue_event_page_url || '❌ NULL'}`);
      console.log(`   target_link: ${event.target_link || '❌ NULL'}`);
      console.log(`   venue_hall: ${event.venue_hall || '❌ NULL'}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkFrontendQuery();
