/**
 * SETEC 행사 데이터가 프론트엔드에 제대로 표시되는지 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySetecData() {
  console.log('🔍 SETEC 행사 데이터 확인 (프론트엔드 표시용)...\n');

  try {
    // 모든 SETEC 행사 조회
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true })
      .limit(5);

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 행사 확인 (처음 5개):\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
      console.log(`   ✅ 운영시간: ${event.operating_hours || '❌ 없음'}`);
      console.log(`   ✅ 입장료: ${event.admission_fee || '❌ 없음'}`);
      console.log(`   ✅ 문의: ${event.contact || '❌ 없음'}`);
      console.log(`   ✅ 주최: ${event.organizer || '❌ 없음'}`);
      console.log(`   ✅ 전시장 행사 페이지: ${event.venue_event_page_url || '❌ 없음'}`);
      console.log(`   ✅ 공식 웹사이트: ${event.target_link || '❌ 없음'}`);
      console.log(`   포스터: ${event.poster_url ? '있음' : '❌ 없음'}`);
      console.log();
    });

    // 통계
    const withOperatingHours = events.filter(e => e.operating_hours).length;
    const withAdmissionFee = events.filter(e => e.admission_fee).length;
    const withContact = events.filter(e => e.contact).length;
    const withOrganizer = events.filter(e => e.organizer).length;
    const withVenueUrl = events.filter(e => e.venue_event_page_url).length;
    const withWebsite = events.filter(e => e.target_link).length;

    console.log('📊 통계 (처음 5개 중):');
    console.log(`   운영시간: ${withOperatingHours}/${events.length}`);
    console.log(`   입장료: ${withAdmissionFee}/${events.length}`);
    console.log(`   문의: ${withContact}/${events.length}`);
    console.log(`   주최: ${withOrganizer}/${events.length}`);
    console.log(`   전시장 행사 페이지: ${withVenueUrl}/${events.length}`);
    console.log(`   공식 웹사이트: ${withWebsite}/${events.length}`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

verifySetecData();
