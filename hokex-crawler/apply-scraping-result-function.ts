/**
 * Apply database function for updating event scraping results
 * This script creates the update_event_scraping_result function in the database
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
    console.error('❌ Missing Supabase credentials in environment variables');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', 'create-update-event-scraping-result-function.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration...');
    const { error } = await client.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('✅ Function update_event_scraping_result created');

  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();
