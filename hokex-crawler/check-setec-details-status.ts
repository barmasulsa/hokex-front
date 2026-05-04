/**
 * SETEC 행사 상세 정보 상태 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetailsStatus() {
  console.log('🔍 SETEC 행사 상세 정보 상태 확인...\n');

  try {
    // 모든 SETEC 행사 조회
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, venue_event_page_url, organizer, contact, operating_hours')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 SETEC 행사\n`);

    let withUrl = 0;
    let withDetails = 0;
    let needsDetails = 0;

    events.forEach((event, index) => {
      const hasUrl = !!event.venue_event_page_url;
      const hasDetails = !!(event.organizer || event.contact || event.operating_hours);

      if (hasUrl) withUrl++;
      if (hasDetails) withDetails++;
      if (hasUrl && !hasDetails) {
        needsDetails++;
        console.log(`${needsDetails}. ${event.title}`);
        console.log(`   URL: ${event.venue_event_page_url}`);
        console.log(`   주최: ${event.organizer || '❌ 없음'}`);
        console.log(`   문의: ${event.contact || '❌ 없음'}`);
        console.log(`   운영시간: ${event.operating_hours || '❌ 없음'}\n`);
      }
    });

    console.log(`\n📊 통계:`);
    console.log(`   전체 행사: ${events.length}개`);
    console.log(`   venue_event_page_url 있음: ${withUrl}개`);
    console.log(`   상세 정보 있음: ${withDetails}개`);
    console.log(`   상세 정보 필요: ${needsDetails}개`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkDetailsStatus();
