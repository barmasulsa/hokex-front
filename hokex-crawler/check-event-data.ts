import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEventData() {
  const eventId = '4789bdbe-e179-4e1c-8958-6d83be9a1275';
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== Event Data ===');
  console.log('Title:', data.title);
  console.log('\n=== Description ===');
  console.log(data.description || '(empty)');
  console.log('\n=== Exhibit Items ===');
  console.log(data.exhibit_items || '(empty)');
  console.log('\n=== Operating Hours ===');
  console.log(data.operating_hours || '(empty)');
  console.log('\n=== Contact ===');
  console.log(data.contact || '(empty)');
  console.log('\n=== Organizer ===');
  console.log(data.organizer || '(empty)');
  console.log('\n=== Supervisor ===');
  console.log(data.supervisor || '(empty)');
}

checkEventData();
