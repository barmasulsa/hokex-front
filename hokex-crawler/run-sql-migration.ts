/**
 * Supabase에 SQL 마이그레이션 실행
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('=== Supabase SQL 마이그레이션 실행 ===\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // SQL 파일 읽기
    const sql = fs.readFileSync('add-supervisor-column.sql', 'utf-8');
    
    console.log('📄 실행할 SQL:\n');
    console.log(sql);
    console.log('\n🔄 실행 중...\n');

    // SQL 실행
    const { data, error } = await client.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ SQL 실행 실패:', error);
      
      // RPC 함수가 없는 경우 직접 ALTER TABLE 시도
      console.log('\n⚠️  RPC 함수를 사용할 수 없습니다.');
      console.log('📋 Supabase Dashboard의 SQL Editor에서 다음 SQL을 직접 실행하세요:\n');
      console.log(sql);
      console.log('\n🔗 https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new\n');
      
      return;
    }

    console.log('✅ SQL 실행 완료!\n');
    console.log('결과:', data);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

runMigration();
