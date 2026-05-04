/**
 * SETEC 행사 개수 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countSetecEvents() {
  console.log('🔍 SETEC 행사 개수 확인...\n');

  try {
    // 전체 SETEC 행사
    const { count: totalCount, error: totalError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('venue', '세텍');

    if (totalError) {
      console.error('❌ 조회 실패:', totalError);
      return;
    }

    // venue_event_page_url이 있는 행사
    const { count: withUrlCount, error: urlError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('venue', '세텍')
      .not('venue_event_page_url', 'is', null);

    if (urlError) {
      console.error('❌ 조회 실패:', urlError);
      return;
    }

    // venue_event_page_url이 없는 행사
    const { count: withoutUrlCount, error: noUrlError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('venue', '세텍')
      .is('venue_event_page_url', null);

    if (noUrlError) {
      console.error('❌ 조회 실패:', noUrlError);
      return;
    }

    console.log(`📊 SETEC 행사 통계:`);
    console.log(`   전체: ${totalCount}개`);
    console.log(`   venue_event_page_url 있음: ${withUrlCount}개`);
    console.log(`   venue_event_page_url 없음: ${withoutUrlCount}개`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

countSetecEvents();
