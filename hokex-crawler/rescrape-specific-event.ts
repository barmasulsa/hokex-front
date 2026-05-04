/**
 * 특정 이벤트 재스크래핑 스크립트
 * contact 필드 줄바꿈 포맷 업데이트를 위해
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BatchProcessor } from './src/services/batch-processor';
import { EventIdentifier } from './src/services/fallback-mechanism';

// 환경 변수 로드
config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

async function rescrapeSpecificEvent() {
  console.log('🔄 특정 이벤트 재스크래핑 시작\n');

  // Supabase 클라이언트 생성
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 특정 이벤트 조회
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, target_link, contact')
    .eq('id', '13e0a066-89a8-4c86-994a-bcfcd9dc0138')
    .limit(1);

  if (error) {
    console.error('❌ 이벤트 조회 실패:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('❌ 이벤트를 찾을 수 없습니다.');
    return;
  }

  const event = events[0];
  console.log(`📋 이벤트 발견: ${event.title}`);
  console.log(`   현재 contact: ${event.contact || '없음'}\n`);

  // EventIdentifier 형식으로 변환
  const testEvents: EventIdentifier[] = [{
    id: event.id,
    title: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    targetLink: event.target_link
  }];

  // BatchProcessor로 처리
  console.log('🚀 재스크래핑 시작...\n');
  const processor = new BatchProcessor(SUPABASE_URL, SUPABASE_KEY);
  const stats = await processor.processBatch(testEvents);

  // 결과 확인
  console.log('\n📊 결과 확인 중...\n');
  
  const { data: updated } = await supabase
    .from('events')
    .select('contact, venue_event_page_url, poster_url, last_scrape_attempt')
    .eq('id', event.id)
    .single();

  if (updated) {
    console.log(`✓ ${event.title}`);
    console.log(`  📞 업데이트된 contact:`);
    console.log(`${updated.contact || '없음'}`);
    console.log(`\n  🔗 Venue Event Page URL: ${updated.venue_event_page_url || '없음'}`);
    console.log(`  🖼️  포스터: ${updated.poster_url ? '있음' : '없음'}`);
    console.log(`  🕐 마지막 시도: ${updated.last_scrape_attempt}\n`);
  }

  console.log('✅ 재스크래핑 완료!');
  console.log(`   성공률: ${stats.successRate.toFixed(1)}%\n`);
}

// 실행
rescrapeSpecificEvent()
  .then(() => {
    console.log('🎉 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실패:', error);
    process.exit(1);
  });
