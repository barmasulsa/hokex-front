import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function manualUpdateCosmoBeauty() {
  const eventId = '4789bdbe-e179-4e1c-8958-6d83be9a1275';

  // 코엑스 웹사이트에서 확인한 정보
  const updateData = {
    exhibit_items: '화장품, OEM/ODM, 원료/포장/용기, 헤어/두피, 에스테틱/스파, 네일/프랜차이즈, 천연/유기농, 이너뷰티/헬스, 스마트뷰티 등',
    operating_hours: '05/27(수) - 05/29(금)',
    // description은 이미 있음
    // contact도 이미 있음
    // organizer도 이미 있음
  };

  console.log('코스모뷰티 데이터 수동 업데이트 중...\n');
  console.log('업데이트 내용:');
  console.log('- 전시품목:', updateData.exhibit_items);
  console.log('- 운영시간:', updateData.operating_hours);

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId);

  if (error) {
    console.error('\n❌ 업데이트 실패:', error);
  } else {
    console.log('\n✅ 업데이트 완료!');
  }
}

manualUpdateCosmoBeauty();
