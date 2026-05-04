/**
 * 잘못된 필드 매핑 수정
 * exhibit_products에 있는 주관 정보를 제거하고
 * 웹사이트에서 다시 크롤링하여 올바른 정보로 업데이트
 */

import { SupabaseService } from './src/services/supabase';
import { PosterScraper } from './src/services/poster-scraper';

async function fixFieldMappings() {
  console.log('=== 필드 매핑 수정 ===\n');

  const supabase = new SupabaseService();
  const scraper = new PosterScraper();

  try {
    // target_link가 있는 모든 행사 가져오기
    const { data: events, error: fetchError } = await (supabase as any).client
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .not('target_link', 'is', null);

    if (fetchError) {
      console.error('❌ 행사 가져오기 실패:', fetchError);
      return;
    }

    console.log(`📋 총 ${events.length}개 행사 처리 시작\n`);

    let updatedCount = 0;
    let noChangeCount = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      console.log(`\n[${i + 1}/${events.length}] ${event.title}`);

      // COEX 페이지에서 정보 크롤링
      const result = await scraper.scrapeCoexEventPage(event.title);

      // 업데이트할 데이터 준비
      const updateData: any = {};
      let hasChanges = false;

      // 전시품목이 크롤링되었으면 업데이트
      if (result.exhibitItems) {
        updateData.exhibit_items = result.exhibitItems;
        hasChanges = true;
        console.log(`  ✅ 전시품목 업데이트: ${result.exhibitItems.substring(0, 50)}...`);
      }

      // exhibit_products 필드는 null로 설정 (더 이상 사용하지 않음)
      if (event.exhibit_products) {
        updateData.exhibit_products = null;
        hasChanges = true;
        console.log(`  🗑️  exhibit_products 제거`);
      }

      if (hasChanges) {
        const { error: updateError } = await (supabase as any).client
          .from('events')
          .update(updateData)
          .eq('id', event.id);

        if (updateError) {
          console.log(`  ❌ 업데이트 실패: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } else {
        console.log(`  ✓ 변경 없음`);
        noChangeCount++;
      }

      // API 호출 제한 방지
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n\n📊 수정 결과:`);
    console.log(`  업데이트: ${updatedCount}개`);
    console.log(`  변경없음: ${noChangeCount}개`);
    console.log(`  전체: ${events.length}개\n`);

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

fixFieldMappings();
