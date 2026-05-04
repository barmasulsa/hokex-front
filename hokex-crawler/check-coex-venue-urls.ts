/**
 * COEX 행사들의 venue_event_page_url 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoexVenueUrls() {
  console.log('🔍 COEX 행사 venue_event_page_url 확인...\n');

  try {
    // 코베 베이비페어
    const { data: babyFairs } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%코베%베이비%');

    console.log('=== 코베 베이비페어 ===');
    if (babyFairs && babyFairs.length > 0) {
      babyFairs.forEach(event => {
        console.log(`\n제목: ${event.title}`);
        console.log(`주최: ${event.organizer || '없음'}`);
        console.log(`전시품목: ${event.exhibit_items || '없음'}`);
        console.log(`venue_event_page_url: ${event.venue_event_page_url || '없음'}`);
      });
    }

    // 레이저피부모발학회
    const { data: laserEvents } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%레이저피부모발%');

    console.log('\n\n=== 레이저피부모발학회 ===');
    if (laserEvents && laserEvents.length > 0) {
      laserEvents.forEach(event => {
        console.log(`\n제목: ${event.title}`);
        console.log(`주최: ${event.organizer || '없음'}`);
        console.log(`전시품목: ${event.exhibit_items || '없음'}`);
        console.log(`venue_event_page_url: ${event.venue_event_page_url || '없음'}`);
      });
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkCoexVenueUrls();
