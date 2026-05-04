/**
 * 모든 COEX 행사에 venue_event_page_url 추가
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

/**
 * 행사명을 URL 슬러그로 변환
 */
function titleToSlug(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/&amp;/g, '')
    .replace(/·/g, '-')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function updateAllCoexVenueUrls() {
  console.log('🔄 모든 COEX 행사의 venue_event_page_url 업데이트 시작\n');

  // COEX 행사 모두 가져오기
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, venue')
    .eq('venue', '코엑스')
    .is('venue_event_page_url', null);

  if (error) {
    console.error('❌ Error fetching events:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('✅ 모든 COEX 행사에 이미 venue_event_page_url이 있습니다.');
    return;
  }

  console.log(`📊 총 ${events.length}개의 COEX 행사 발견\n`);

  let successCount = 0;
  let failCount = 0;

  for (const event of events) {
    const slug = titleToSlug(event.title);
    const venueEventPageUrl = `https://www.coex.co.kr/exhibitions/${slug}/`;

    console.log(`\n처리 중: ${event.title}`);
    console.log(`  URL: ${venueEventPageUrl}`);

    const { error: updateError } = await supabase
      .from('events')
      .update({ venue_event_page_url: venueEventPageUrl })
      .eq('id', event.id);

    if (updateError) {
      console.error(`  ❌ 업데이트 실패:`, updateError);
      failCount++;
    } else {
      console.log(`  ✅ 업데이트 성공`);
      successCount++;
    }

    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 결과:');
  console.log(`  ✅ 성공: ${successCount}개`);
  console.log(`  ❌ 실패: ${failCount}개`);
  console.log('='.repeat(60));
}

updateAllCoexVenueUrls()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
