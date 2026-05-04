/**
 * 베이비 페어 찾기
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findBabyFair() {
  console.log('🔍 베이비 페어 검색...\n');

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%베이비%')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ 에러:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('베이비 페어를 찾을 수 없습니다.');
      return;
    }

    console.log(`총 ${data.length}개 행사 발견:\n`);
    data.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   주최: ${event.organizer || '없음'}`);
      console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
      console.log(`   전시품목: ${event.exhibit_items || '없음'}\n`);
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

findBabyFair();
