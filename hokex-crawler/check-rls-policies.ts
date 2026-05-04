/**
 * Supabase RLS 정책 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  console.log('🔍 RLS 정책 확인...\n');

  try {
    // events 테이블의 RLS 정책 확인
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'events');

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    console.log('📊 events 테이블 RLS 정책:\n');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkRLSPolicies();
