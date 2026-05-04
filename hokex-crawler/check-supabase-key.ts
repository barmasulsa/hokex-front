/**
 * Supabase 키 확인
 */

import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('=== Supabase 환경 변수 확인 ===\n');

console.log('SUPABASE_URL:', supabaseUrl ? '✅ 설정됨' : '❌ 없음');
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ 설정됨' : '❌ 없음');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 설정됨' : '❌ 없음');

console.log('\n현재 사용 중인 키:', supabaseServiceKey ? 'SERVICE_KEY' : 'ANON_KEY');

if (!supabaseServiceKey) {
  console.log('\n⚠️  SERVICE_KEY가 없습니다. 삭제 권한이 없을 수 있습니다.');
  console.log('   .env 파일에 SUPABASE_SERVICE_KEY를 추가하세요.');
}
