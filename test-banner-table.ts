import { supabase } from './src/lib/supabase';

async function testBannerTable() {
  console.log('배너 테이블 확인 중...');
  
  // 배너 테이블 조회 시도
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ 배너 테이블이 없습니다:', error.message);
    console.log('\n다음 SQL을 Supabase 대시보드에서 실행하세요:');
    console.log('파일 위치: hokex-front/supabase-migrations/create-banner-system.sql');
    return false;
  }

  console.log('✅ 배너 테이블이 존재합니다');
  console.log('배너 개수:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('배너 데이터:', data);
  }
  return true;
}

testBannerTable();
