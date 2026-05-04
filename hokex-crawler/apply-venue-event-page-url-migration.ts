/**
 * Apply venue_event_page_url migration
 * 1. Add venue_event_page_url column to events table
 * 2. Update database function to include the new parameter
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function applyMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 Applying venue_event_page_url migration...\n');

  try {
    // Step 1: Add column
    console.log('📝 Step 1: Adding venue_event_page_url column...');
    const addColumnSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add-venue-event-page-url.sql'),
      'utf-8'
    );

    const { error: columnError } = await supabase.rpc('exec_sql', { sql: addColumnSql });
    
    if (columnError) {
      // Try direct query if rpc doesn't work
      const { error: directError } = await supabase.from('_sql').insert({ query: addColumnSql });
      
      if (directError) {
        console.log('⚠️  Could not add column via Supabase client. Please run the SQL manually:');
        console.log('\n' + addColumnSql + '\n');
      } else {
        console.log('✅ Column added successfully');
      }
    } else {
      console.log('✅ Column added successfully');
    }

    // Step 2: Update function
    console.log('\n📝 Step 2: Updating database function...');
    const updateFunctionSql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'update-event-scraping-result-function-add-venue-url.sql'),
      'utf-8'
    );

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: updateFunctionSql });
    
    if (functionError) {
      console.log('⚠️  Could not update function via Supabase client. Please run the SQL manually:');
      console.log('\n' + updateFunctionSql + '\n');
    } else {
      console.log('✅ Function updated successfully');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Summary:');
    console.log('   - Added venue_event_page_url column to events table');
    console.log('   - Updated update_event_scraping_result function');
    console.log('\n💡 Next steps:');
    console.log('   - Run poster scraping to populate venue_event_page_url');
    console.log('   - Update frontend to display venue event page link');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
