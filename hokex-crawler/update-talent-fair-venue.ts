/**
 * "2026 글로벌 탤런트 페어" 이벤트의 venue_hall 업데이트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTalentFairVenue() {
  console.log('🔍 Finding "2026 글로벌 탤런트 페어" event...\n');
  
  // 이벤트 찾기
  const { data: events, error: findError } = await supabase
    .from('events')
    .select('id, title, venue_hall, start_date, end_date')
    .ilike('title', '%글로벌%탤런트%페어%')
    .order('start_date', { ascending: false });
  
  if (findError) {
    console.error('❌ Error finding event:', findError);
    return;
  }
  
  if (!events || events.length === 0) {
    console.log('❌ Event not found');
    return;
  }
  
  console.log(`✅ Found ${events.length} matching event(s):\n`);
  
  for (const event of events) {
    console.log(`📋 Event: ${event.title}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Date: ${event.start_date} ~ ${event.end_date}`);
    console.log(`   Current venue_hall: ${event.venue_hall || '(empty)'}\n`);
  }
  
  // 가장 최근 이벤트 업데이트
  const targetEvent = events[0];
  const newVenueHall = 'Hall B, 컨퍼런스룸 E';
  
  console.log(`🔄 Updating venue_hall to: "${newVenueHall}"\n`);
  
  const { error: updateError } = await supabase
    .from('events')
    .update({ venue_hall: newVenueHall })
    .eq('id', targetEvent.id);
  
  if (updateError) {
    console.error('❌ Update failed:', updateError);
    return;
  }
  
  console.log('✅ Update successful!');
  
  // 검증
  const { data: updated } = await supabase
    .from('events')
    .select('venue_hall')
    .eq('id', targetEvent.id)
    .single();
  
  console.log(`\n📊 Verification:`);
  console.log(`   Updated venue_hall: ${updated?.venue_hall}`);
}

updateTalentFairVenue();
