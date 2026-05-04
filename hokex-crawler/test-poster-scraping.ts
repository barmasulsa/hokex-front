/**
 * COEX 포스터 스크래핑 테스트 스크립트
 * 실제 데이터베이스의 COEX 이벤트 몇 개를 샘플로 스크래핑 테스트
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BatchProcessor } from './src/services/batch-processor';
import { EventIdentifier } from './src/services/fallback-mechanism';

// 환경 변수 로드
config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

async function testPosterScraping() {
  console.log('🧪 COEX 포스터 스크래핑 테스트 시작\n');

  // Supabase 클라이언트 생성
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. 포스터가 없는 COEX 이벤트 5개 조회
  console.log('📋 테스트할 이벤트 조회 중...\n');
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_date, end_date, target_link')
    .eq('venue', 'COEX')
    .is('poster_url', null)
    .gte('start_date', '2026-01-01')
    .order('start_date', { ascending: true })
    .limit(5);

  if (error) {
    console.error('❌ 이벤트 조회 실패:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('✅ 포스터가 없는 COEX 이벤트가 없습니다!');
    console.log('   모든 이벤트에 포스터가 있거나, COEX 이벤트가 없습니다.\n');
    
    // 대신 포스터가 있는 이벤트 몇 개 조회해서 재스크래핑 테스트
    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, title, start_date, end_date, target_link, poster_url')
      .eq('venue', 'COEX')
      .not('poster_url', 'is', null)
      .gte('start_date', '2026-01-01')
      .order('start_date', { ascending: true })
      .limit(3);

    if (existingEvents && existingEvents.length > 0) {
      console.log('📋 기존 포스터가 있는 이벤트로 재스크래핑 테스트:\n');
      existingEvents.forEach((event, idx) => {
        console.log(`${idx + 1}. ${event.title}`);
        console.log(`   현재 포스터: ${event.poster_url?.substring(0, 60)}...`);
        console.log(`   시작일: ${event.start_date}\n`);
      });

      // 이벤트 변환
      const testEvents: EventIdentifier[] = existingEvents.map(e => ({
        id: e.id,
        title: e.title,
        startDate: e.start_date,
        endDate: e.end_date,
        targetLink: e.target_link
      }));

      // BatchProcessor로 처리
      console.log('🚀 배치 처리 시작...\n');
      const processor = new BatchProcessor(SUPABASE_URL, SUPABASE_KEY);
      const stats = await processor.processBatch(testEvents);

      console.log('\n✅ 테스트 완료!');
      console.log(`   성공률: ${stats.successRate.toFixed(1)}%`);
      console.log(`   성공: ${stats.successfulScrapes}개`);
      console.log(`   실패: ${stats.failedScrapes}개\n`);
    }
    return;
  }

  console.log(`✅ ${events.length}개의 테스트 이벤트 발견:\n`);
  events.forEach((event, idx) => {
    console.log(`${idx + 1}. ${event.title}`);
    console.log(`   시작일: ${event.start_date}`);
    console.log(`   target_link: ${event.target_link || '없음'}\n`);
  });

  // 2. EventIdentifier 형식으로 변환
  const testEvents: EventIdentifier[] = events.map(e => ({
    id: e.id,
    title: e.title,
    startDate: e.start_date,
    endDate: e.end_date,
    targetLink: e.target_link
  }));

  // 3. BatchProcessor로 처리
  console.log('🚀 배치 처리 시작...\n');
  const processor = new BatchProcessor(SUPABASE_URL, SUPABASE_KEY);
  const stats = await processor.processBatch(testEvents);

  // 4. 결과 확인
  console.log('\n📊 결과 확인 중...\n');
  
  for (const event of events) {
    const { data: updated } = await supabase
      .from('events')
      .select('poster_url, last_scrape_attempt, successful_scrape_strategy')
      .eq('id', event.id)
      .single();

    if (updated) {
      console.log(`✓ ${event.title}`);
      if (updated.poster_url) {
        console.log(`  ✅ 포스터: ${updated.poster_url.substring(0, 60)}...`);
        console.log(`  📍 전략: ${updated.successful_scrape_strategy}`);
      } else {
        console.log(`  ❌ 포스터 없음`);
      }
      console.log(`  🕐 마지막 시도: ${updated.last_scrape_attempt}\n`);
    }
  }

  console.log('✅ 테스트 완료!');
  console.log(`   최종 성공률: ${stats.successRate.toFixed(1)}%`);
  console.log(`   성공: ${stats.successfulScrapes}개`);
  console.log(`   실패: ${stats.failedScrapes}개\n`);

  // 5. 전략별 통계
  console.log('📊 전략별 성공 횟수:');
  console.log(`   Direct: ${stats.strategyStats.direct}개`);
  console.log(`   Schedule: ${stats.strategyStats.schedule}개`);
  console.log(`   Search: ${stats.strategyStats.search}개\n`);
}

// 실행
testPosterScraping()
  .then(() => {
    console.log('🎉 테스트 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  });
