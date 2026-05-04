/**
 * Update event descriptions by re-scraping
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { PosterScraper } from './src/services/poster-scraper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDescriptions() {
  console.log('🔄 Updating event descriptions...\n');

  // Get events without descriptions or with short descriptions
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, target_link, venue')
    .eq('venue', '코엑스')
    .gte('start_date', '2026-01-01')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Filter events that need description updates
  const eventsToUpdate = events.filter(e => 
    !e.description || e.description.trim().length < 20
  );

  console.log(`📊 Total events: ${events.length}`);
  console.log(`🔄 Events needing description: ${eventsToUpdate.length}\n`);

  if (eventsToUpdate.length === 0) {
    console.log('✅ All events have descriptions!\n');
    return;
  }

  const scraper = new PosterScraper();
  let updated = 0;
  let failed = 0;

  for (const event of eventsToUpdate) {
    console.log(`\n📋 ${event.title}`);

    try {
      let description: string | undefined;

      // Try COEX page first
      const coexResult = await scraper.scrapeCoexEventPage(event.title);
      if (coexResult.description) {
        description = coexResult.description;
        console.log(`   ✅ Found description from COEX page`);
      }

      // If not found and has target_link, try event website
      if (!description && event.target_link) {
        const websiteResult = await scraper.scrapePostUrl(
          event.target_link,
          event.title,
          'COEX'
        );
        if (websiteResult.description) {
          description = websiteResult.description;
          console.log(`   ✅ Found description from event website`);
        }
      }

      // Update database if description found
      if (description) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ description })
          .eq('id', event.id);

        if (updateError) {
          console.error(`   ❌ Failed to update: ${updateError.message}`);
          failed++;
        } else {
          console.log(`   💾 Updated in database`);
          updated++;
        }
      } else {
        console.log(`   ⚠️  No description found`);
        failed++;
      }

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n✅ Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success rate: ${((updated / eventsToUpdate.length) * 100).toFixed(1)}%\n`);
}

updateDescriptions();
