/**
 * Update poster URLs from COEX schedule page
 */

import { createClient } from '@supabase/supabase-js';
import { ScheduleStrategy } from './src/services/schedule-strategy';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePostersFromSchedule() {
  console.log('🔄 Updating posters from COEX schedule page...\n');

  // Fetch schedule page
  const scheduleStrategy = new ScheduleStrategy();
  const scheduleData = await (scheduleStrategy as any).fetchSchedulePage();

  console.log(`✅ Fetched ${scheduleData.size} events from schedule page\n`);

  // Get events without posters from database
  const { data: eventsWithoutPosters, error } = await supabase
    .from('events')
    .select('id, title, start_date, end_date')
    .eq('venue', '코엑스')
    .gte('start_date', '2026-01-01')
    .is('poster_url', null);

  if (error) {
    console.error('❌ Error fetching events:', error.message);
    return;
  }

  console.log(`📊 Found ${eventsWithoutPosters.length} events without posters\n`);

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const event of eventsWithoutPosters) {
    // Normalize title for matching
    const normalizedTitle = normalizeTitle(event.title);

    // Find in schedule data
    if (scheduleData.has(normalizedTitle)) {
      const scheduleEvent = scheduleData.get(normalizedTitle);

      console.log(`✅ Found match: ${event.title}`);
      console.log(`   Poster: ${scheduleEvent.posterUrl}`);

      // Update database
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: scheduleEvent.posterUrl,
          venue_hall: scheduleEvent.hall || null
        })
        .eq('id', event.id);

      if (updateError) {
        console.error(`   ❌ Update failed: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated\n`);
        updatedCount++;
      }
    } else {
      console.log(`❌ No match found: ${event.title}`);
      notFoundCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`❌ Not found: ${notFoundCount}`);
  console.log(`📊 Total: ${eventsWithoutPosters.length}\n`);
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/&amp;/g, '')
    .replace(/·/g, '')
    .replace(/\//g, '')
    .replace(/-/g, '')
    .replace(/,/g, '')
    .trim();
}

updatePostersFromSchedule();
