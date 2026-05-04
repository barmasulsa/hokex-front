/**
 * 실제 샘플 데이터 식별 (1월~4월 실제 크롤링 데이터 제외)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function identifyRealSampleData() {
  console.log('=== 실제 샘플 데이터 식별 ===\n');

  // 모든 행사 데이터 가져오기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('행사 데이터가 없습니다.');
    return;
  }

  console.log(`총 ${events.length}개의 행사\n`);

  // 1월~4월 2026 행사 (실제 크롤링한 데이터)
  const janAprEvents = events.filter(event => {
    const startDate = new Date(event.start_date);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    
    return year === 2026 && month >= 1 && month <= 4;
  });

  console.log(`1월~4월 2026 행사: ${janAprEvents.length}개 (실제 크롤링 데이터)\n`);

  // 5월 이후 행사 (샘플 데이터)
  const sampleEvents = events.filter(event => {
    const startDate = new Date(event.start_date);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    
    // 2026년 5월 이후 또는 2025년 이전
    return (year === 2026 && month >= 5) || year < 2026;
  });

  console.log(`샘플 데이터로 판단되는 행사: ${sampleEvents.length}개\n`);

  if (sampleEvents.length > 0) {
    console.log('샘플 데이터 목록 (처음 20개):');
    sampleEvents.slice(0, 20).forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   날짜: ${event.start_date} ~ ${event.end_date}`);
      console.log(`   생성일: ${event.created_at}`);
    });
    
    if (sampleEvents.length > 20) {
      console.log(`   ... 외 ${sampleEvents.length - 20}개`);
    }
  }

  console.log('\n=== 요약 ===');
  console.log(`✅ 실제 데이터 (1월~4월 2026): ${janAprEvents.length}개`);
  console.log(`⚠️  샘플 데이터 (5월 이후 또는 2025년 이전): ${sampleEvents.length}개`);
  console.log('\n샘플 데이터를 삭제하려면 delete-sample-data.ts를 실행하세요.');
}

identifyRealSampleData();
