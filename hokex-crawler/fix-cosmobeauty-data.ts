import { CoexWebScraper } from './src/services/coex-web-scraper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCosmoBeautyData() {
  const eventId = '4789bdbe-e179-4e1c-8958-6d83be9a1275';

  console.log('코스모뷰티 이벤트 데이터 재크롤링 시작...\n');

  // 먼저 데이터베이스에서 target_link 가져오기
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('target_link')
    .eq('id', eventId)
    .single();

  if (fetchError || !event) {
    console.error('이벤트를 찾을 수 없습니다:', fetchError);
    return;
  }

  const targetUrl = event.target_link;
  console.log('Target URL:', targetUrl, '\n');

  const scraper = new CoexWebScraper();
  const result = await scraper.scrapeEventDetail(targetUrl);

  console.log('=== 크롤링 결과 ===');
  console.log('행사 소개:', result.description?.substring(0, 100) || '없음');
  console.log('입장료:', result.admissionFee || '없음');
  console.log('전시품목:', result.exhibitItems || '없음');
  console.log('전시제품:', result.exhibitProducts || '없음');
  console.log('주최:', result.organizer || '없음');
  console.log('주관:', result.supervisor || '없음');
  console.log('운영시간:', result.operatingHours || '없음');
  console.log('담당자:', result.contact || '없음');

  // 데이터베이스 업데이트
  const updateData: any = {};
  if (result.description) updateData.description = result.description;
  if (result.admissionFee) updateData.admission_fee = result.admissionFee;
  if (result.exhibitItems) updateData.exhibit_items = result.exhibitItems;
  if (result.exhibitProducts) updateData.exhibit_products = result.exhibitProducts;
  if (result.organizer) updateData.organizer = result.organizer;
  if (result.supervisor) updateData.supervisor = result.supervisor;
  if (result.operatingHours) updateData.operating_hours = result.operatingHours;
  if (result.contact) updateData.contact = result.contact;
  if (result.venueHall) updateData.venue_hall = result.venueHall;

  if (Object.keys(updateData).length > 0) {
    console.log('\n데이터베이스 업데이트 중...');
    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('업데이트 실패:', error);
    } else {
      console.log('✅ 업데이트 완료!');
    }
  } else {
    console.log('\n업데이트할 데이터가 없습니다.');
  }
}

fixCosmoBeautyData();
