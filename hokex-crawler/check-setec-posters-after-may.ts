/**
 * SETEC 5월 3일 이후 행사 포스터 URL 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetecPostersAfterMay() {
  console.log('🔍 SETEC 5월 3일 이후 행사 포스터 URL 확인...\n');

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, start_date, poster_url')
      .eq('venue', '세텍')
      .gte('start_date', '2026-05-03')
      .order('start_date', { ascending: true })
      .limit(20);

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  5월 3일 이후 SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 5월 3일 이후 ${events.length}개 행사:\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   시작일: ${event.start_date}`);
      console.log(`   포스터 URL: ${event.poster_url || 'NULL'}`);
      
      if (!event.poster_url) {
        console.log(`   ❌ NULL - 포스터 URL 없음\n`);
      } else if (event.poster_url.includes('placeholder')) {
        console.log(`   ⚠️  Placeholder 이미지\n`);
      } else if (event.poster_url.includes('setec.or.kr')) {
        console.log(`   ✅ SETEC 이미지\n`);
      } else {
        console.log(`   ❓ 기타 이미지\n`);
      }
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkSetecPostersAfterMay();
