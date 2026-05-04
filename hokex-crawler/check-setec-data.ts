/**
 * SETEC 행사 데이터 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetecData() {
  console.log('🔍 SETEC 행사 데이터 확인...\n');

  try {
    // 첫 번째 SETEC 행사 조회
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!data) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log('✅ 행사 데이터 확인:\n');
    console.log(`제목: ${data.title}`);
    console.log(`기간: ${data.start_date} ~ ${data.end_date}`);
    console.log(`장소: ${data.venue} - ${data.venue_hall || '없음'}`);
    console.log(`\n📋 상세 정보:`);
    console.log(`주최: ${data.organizer || '없음'}`);
    console.log(`문의: ${data.contact || '없음'}`);
    console.log(`운영시간: ${data.operating_hours || '없음'}`);
    console.log(`전시장 행사 페이지: ${data.venue_event_page_url || '없음'}`);
    console.log(`공식 웹사이트: ${data.target_link || '없음'}`);
    console.log(`포스터: ${data.poster_url || '없음'}`);
    console.log(`\n행사 소개 (첫 100자):`);
    console.log(data.description ? data.description.substring(0, 100) + '...' : '없음');

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkSetecData();
