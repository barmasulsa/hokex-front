/**
 * 웨딩 행사 디버깅 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWeddingEvent() {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('title', '제415회 웨덱스 웨딩박람회')
    .single();

  console.log('제415회 웨덱스 웨딩박람회 데이터:');
  console.log(JSON.stringify(data, null, 2));
}

debugWeddingEvent().catch(console.error);
