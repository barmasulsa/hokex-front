/**
 * Re-scrape COEX event posters for historical events
 * Processes events from 2026-01-01 onwards with missing or failed posters
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { BatchProcessor } from '../services/batch-processor';
import { EventIdentifier } from '../services/fallback-mechanism';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ScriptOptions {
  startDate?: string;
  venue?: string;
  limit?: number;
  dryRun?: boolean;
}

async function rescrapeCoexPosters(options: ScriptOptions = {}) {
  const {
    startDate = '2026-01-01',
    venue = '코엑스',
    limit,
    dryRun = false
  } = options;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  COEX Poster Re-scraping Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📅 Start Date: ${startDate}`);
  console.log(`🏢 Venue: ${venue}`);
  if (limit) console.log(`🔢 Limit: ${limit} events`);
  if (dryRun) console.log(`🔍 DRY RUN MODE - No database updates\n`);
  else console.log('');

  try {
    // Query events needing re-scraping
    console.log('🔍 Querying events needing poster scraping...\n');

    let query = supabase
      .from('events')
      .select('id, title, start_date, end_date, target_link, poster_url')
      .eq('venue', venue)
      .gte('start_date', startDate)
      .is('poster_url', null) // Only events without posters
      .order('start_date', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Failed to query events: ${error.message}`);
    }

    if (!events || events.length === 0) {
      console.log('✅ No events found needing poster scraping!\n');
      return;
    }

    console.log(`📊 Found ${events.length} events needing poster scraping\n`);

    // Show sample events
    console.log('📋 Sample events:');
    events.slice(0, 5).forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.title}`);
      console.log(`      Date: ${event.start_date} ~ ${event.end_date}`);
      console.log(`      Poster: ${event.poster_url ? '✅ Has poster' : '❌ Missing'}\n`);
    });

    if (events.length > 5) {
      console.log(`   ... and ${events.length - 5} more events\n`);
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - Exiting without processing\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // Convert to EventIdentifier format
    const eventIdentifiers: EventIdentifier[] = events.map(event => ({
      id: event.id,
      title: event.title,
      startDate: event.start_date,
      endDate: event.end_date,
      targetLink: event.target_link
    }));

    // Process with BatchProcessor
    const processor = new BatchProcessor(supabaseUrl, supabaseKey);
    const stats = await processor.processBatch(eventIdentifiers);

    // Display recommendations
    console.log('\n📋 Recommendations:\n');

    if (stats.failedScrapes > 0) {
      console.log(`❌ ${stats.failedScrapes} events failed to scrape`);
      console.log('   Run this query to see failed events:');
      console.log('   SELECT * FROM scraping_failures WHERE resolved = false ORDER BY timestamp DESC;\n');
    }

    if (stats.successRate >= 95) {
      console.log('✅ Success rate meets 95% target!');
    } else {
      console.log(`⚠️  Success rate (${stats.successRate.toFixed(1)}%) is below 95% target`);
      console.log('   Consider manual review of failed events\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Re-scraping Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const options: ScriptOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--start-date' && args[i + 1]) {
    options.startDate = args[i + 1];
    i++;
  } else if (arg === '--venue' && args[i + 1]) {
    options.venue = args[i + 1];
    i++;
  } else if (arg === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npx tsx src/scripts/rescrape-coex-posters.ts [options]

Options:
  --start-date <date>   Start date for filtering events (default: 2026-01-01)
  --venue <name>        Venue name to filter (default: 코엑스)
  --limit <number>      Limit number of events to process
  --dry-run             Preview events without updating database
  --help, -h            Show this help message

Examples:
  # Re-scrape all COEX events from 2026-01-01
  npx tsx src/scripts/rescrape-coex-posters.ts

  # Preview first 10 events
  npx tsx src/scripts/rescrape-coex-posters.ts --limit 10 --dry-run

  # Re-scrape events from specific date
  npx tsx src/scripts/rescrape-coex-posters.ts --start-date 2026-03-01
`);
    process.exit(0);
  }
}

// Run script
rescrapeCoexPosters(options).catch(console.error);
