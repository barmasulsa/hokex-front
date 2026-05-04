/**
 * 웹사이트에서 주최/주관 정보 업데이트
 * 웹사이트 정보를 Excel 데이터보다 우선시
 */

import { SupabaseService } from './src/services/supabase';
import { PosterScraper } from './src/services/poster-scraper';

async function updateOrganizersFromWebsite() {
  console.log('=== 웹사이트에서 주최/주관 정보 업데이트 ===\n');

  const supabase = new SupabaseService();
  const posterScraper = new PosterScraper();

  try {
    // target_link가 있는 모든 COEX 행사 가져오기
    const { data: events, error: fetchError } = await (supabase as any).client
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .not('target_link', 'is', null)
      .order('start_date', { ascending: true });

    if (fetchError) {
      console.error('❌ 행사 조회 실패:', fetchError);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  업데이트할 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 행사 처리 시작\n`);

    let updatedCount = 0;
    let noChangeCount = 0;
    let errorCount = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\n[${i + 1}/${events.length}] ${event.title}`);
      console.log(`  현재 주최: ${event.organizer || '없음'}`);
      console.log(`  현재 주관: ${event.supervisor || '없음'}`);

      try {
        // COEX 페이지에서 크롤링
        const result = await posterScraper.scrapePostUrl(
          event.target_link,
          event.title,
          'COEX'
        );

        // 웹사이트에서 크롤링한 정보가 있으면 업데이트
        const hasNewOrganizer = result.organizer && result.organizer !== event.organizer;
        const hasNewSupervisor = result.supervisor && result.supervisor !== event.supervisor;

        if (hasNewOrganizer || hasNewSupervisor) {
          const updateData: any = {};
          if (hasNewOrganizer) updateData.organizer = result.organizer;
          if (hasNewSupervisor) updateData.supervisor = result.supervisor;
          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await (supabase as any).client
            .from('events')
            .update(updateData)
            .eq('id', event.id);

          if (updateError) {
            console.log(`  ❌ 업데이트 실패: ${updateError.message}`);
            errorCount++;
          } else {
            console.log(`  ✅ 업데이트 완료`);
            if (hasNewOrganizer) console.log(`     주최: ${result.organizer}`);
            if (hasNewSupervisor) console.log(`     주관: ${result.supervisor}`);
            updatedCount++;
          }
        } else {
          console.log(`  ✓ 변경 없음`);
          noChangeCount++;
        }

        // 요청 간 딜레이 (서버 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`  ❌ 크롤링 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log(`\n\n📊 업데이트 결과:`);
    console.log(`  업데이트: ${updatedCount}개`);
    console.log(`  변경없음: ${noChangeCount}개`);
    console.log(`  에러: ${errorCount}개`);
    console.log(`  전체: ${events.length}개\n`);

  } catch (error) {
    console.error('❌ 업데이트 실패:', error);
    process.exit(1);
  }
}

updateOrganizersFromWebsite();
