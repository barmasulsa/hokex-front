/**
 * Check event descriptions in database
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

async function checkDescriptions() {
  console.log('🔍 Checking event descriptions...\n');

  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, target_link, venue')
    .eq('venue', '코엑스')
    .gte('start_date', '2026-05-01')
    .order('start_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Found ${data.length} events\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  data.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   🔗 Link: ${event.target_link || 'N/A'}`);
    console.log(`   📝 Description: ${event.description || '(없음)'}`);
    console.log('');
  });

  // Count events with/without descriptions
  const withDesc = data.filter(e => e.description && e.description.trim().length > 0).length;
  const withoutDesc = data.length - withDesc;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n✅ With description: ${withDesc}`);
  console.log(`❌ Without description: ${withoutDesc}\n`);
}

checkDescriptions();
