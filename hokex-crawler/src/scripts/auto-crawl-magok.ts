/**
 * COEX Magok 자동 크롤링 스크립트
 * 기본 정보 크롤링 → Supabase 저장
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { CoexMagokScraper } from '../services/coex-magok-scraper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveToDatabase(events: any[]): Promise<number> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  데이터베이스 저장');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      // 중복 체크
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('title', event.title)
        .eq('venue', '코엑스 마곡')
        .eq('start_date', event.startDate)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  중복: ${event.title}`);
        skipCount++;
        continue;
      }

      // 새 행사 저장
      const { error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          start_date: event.startDate,
          end_date: event.endDate,
          venue: '코엑스 마곡',
          region: '서울',
          venue_hall: event.venueHall || null,
          poster_url: 'https://via.placeholder.com/400x300?text=No+Image',
          category: event.category || '전시',
          industry: '기타',
          day_string: `${event.startDate} ~ ${event.endDate}`
        });

      if (error) {
        console.error(`❌ 저장 실패: ${event.title}`, error.message);
        errorCount++;
      } else {
        console.log(`✅ 저장: ${event.title}`);
        successCount++;
      }

    } catch (error: any) {
      console.error(`❌ 에러: ${event.title}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 저장 완료:`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ⏭️  중복: ${skipCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개\n`);

  return successCount;
}

async function autoCrawlMagok() {
  try {
    console.log(`\n🚀 COEX Magok 자동 크롤링 시작...\n`);
    console.log(`📅 ${new Date().toLocaleString('ko-KR')}\n`);

    // 1단계: 기본 정보 크롤링
    const scraper = new CoexMagokScraper();
    const events = await scraper.scrapeEventList();

    // 2단계: 데이터베이스 저장
    if (events.length > 0) {
      const savedCount = await saveToDatabase(events);
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  완료!`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`✅ ${savedCount}개 행사 저장 완료!\n`);
      console.log(`🌐 웹사이트에서 확인: https://hokex-front.vercel.app/`);
      console.log(`🌐 로컬에서 확인: http://localhost:5173\n`);
    } else {
      console.log(`\n⚠️  저장할 데이터가 없습니다.\n`);
    }

  } catch (error) {
    console.error(`\n❌ 크롤링 실패:`, error);
    process.exit(1);
  }
}

// 실행
autoCrawlMagok();
