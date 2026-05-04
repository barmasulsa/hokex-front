/**
 * SETEC 행사들의 description 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSetecDescriptions() {
  console.log('🔍 SETEC 행사 description 확인...\n');

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, description, operating_hours, contact, organizer, venue_event_page_url, target_link')
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

    console.log(`📊 총 ${events.length}개 행사:\n`);

    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   description: ${event.description ? event.description.substring(0, 100) + '...' : '❌ NULL'}`);
      console.log(`   operating_hours: ${event.operating_hours || '❌ NULL'}`);
      console.log(`   contact: ${event.contact || '❌ NULL'}`);
      console.log(`   organizer: ${event.organizer || '❌ NULL'}`);
      console.log(`   venue_event_page_url: ${event.venue_event_page_url || '❌ NULL'}`);
      console.log(`   target_link: ${event.target_link || '❌ NULL'}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkSetecDescriptions();
