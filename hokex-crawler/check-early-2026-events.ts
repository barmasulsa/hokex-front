/**
 * Check if there are events in Jan-Apr 2026 in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEarlyEvents() {
  console.log('🔍 Checking for events in Jan-Apr 2026...\n');

  // Check each month
  const months = [
    { name: '1월', start: '2026-01-01', end: '2026-01-31' },
    { name: '2월', start: '2026-02-01', end: '2026-02-28' },
    { name: '3월', start: '2026-03-01', end: '2026-03-31' },
    { name: '4월', start: '2026-04-01', end: '2026-04-30' },
  ];

  for (const month of months) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date, end_date, venue, category, industry')
      .gte('start_date', month.start)
      .lte('start_date', month.end)
      .order('start_date', { ascending: true });

    if (error) {
      console.error(`❌ Error for ${month.name}:`, error.message);
      continue;
    }

    console.log(`\n📅 ${month.name} (${month.start} ~ ${month.end}): ${data.length}개 행사`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (data.length > 0) {
      data.forEach((event, i) => {
        console.log(`${i + 1}. ${event.title}`);
        console.log(`   📅 ${event.start_date} ~ ${event.end_date}`);
        console.log(`   🏢 ${event.venue} | ${event.category} / ${event.industry}`);
      });
    } else {
      console.log('   (행사 없음)');
    }
  }

  // Total count
  const { data: totalData, error: totalError } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .gte('start_date', '2026-01-01')
    .lte('start_date', '2026-04-30');

  if (!totalError) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total: ${totalData?.length || 0}개 행사 (2026년 1월~4월)\n`);
  }
}

checkEarlyEvents();
