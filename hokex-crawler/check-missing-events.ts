/**
 * Check details of events that failed to scrape
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

async function checkMissingEvents() {
  console.log('🔍 Checking missing events...\n');

  const eventTitles = [
    '2026 자율제조AI 월드쇼',
    '제 34회 국제 방송 · 미디어 · 음향 · 조명 전시회'
  ];

  for (const title of eventTitles) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('title', title)
      .single();

    if (error) {
      console.log(`❌ Error fetching "${title}":`, error.message);
      continue;
    }

    console.log(`\n📋 Event: ${data.title}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Date: ${data.start_date} ~ ${data.end_date}`);
    console.log(`   Venue: ${data.venue}`);
    console.log(`   Target Link: ${data.target_link || 'N/A'}`);
    console.log(`   Poster URL: ${data.poster_url || 'N/A'}`);
    console.log(`   Category: ${data.category}`);
    console.log(`   Industry: ${data.industry}`);
    console.log(`   Created: ${data.created_at}`);
  }
}

checkMissingEvents();
