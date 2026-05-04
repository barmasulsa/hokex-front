/**
 * List all COEX events without posters
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

async function listMissingPosters() {
  console.log('🔍 Querying COEX events without posters...\n');

  const { data, error } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, target_link, category, industry')
    .eq('venue', '코엑스')
    .gte('start_date', '2026-01-01')
    .is('poster_url', null)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Found ${data.length} events without posters\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  data.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   📅 Date: ${event.start_date} ~ ${event.end_date}`);
    console.log(`   🏷️  Category: ${event.category} / ${event.industry}`);
    console.log(`   🔗 Link: ${event.target_link || 'N/A'}`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Total: ${data.length} events\n`);

  // Group by category
  const byCategory = data.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 By Category:');
  Object.entries(byCategory).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`);
  });

  // Count events with/without target_link
  const withLink = data.filter(e => e.target_link).length;
  const withoutLink = data.length - withLink;

  console.log(`\n🔗 With target_link: ${withLink}`);
  console.log(`❌ Without target_link: ${withoutLink}\n`);
}

listMissingPosters();
