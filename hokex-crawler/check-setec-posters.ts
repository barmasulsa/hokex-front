/**
 * SETEC 행사 포스터 URL 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetecPosters() {
  console.log('🔍 SETEC 행사 포스터 URL 확인...\n');

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, poster_url')
      .eq('venue', '세텍')
      .order('start_date', { ascending: true })
      .limit(10);

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 처음 10개 행사 포스터 URL:\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   포스터 URL: ${event.poster_url}\n`);
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkSetecPosters();
