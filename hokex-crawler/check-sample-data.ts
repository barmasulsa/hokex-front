/**
 * 샘플 데이터 확인
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

async function checkSampleData() {
  console.log('=== 샘플 데이터 확인 ===\n');

  // 모든 행사 데이터 가져오기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('행사 데이터가 없습니다.');
    return;
  }

  console.log(`총 ${events.length}개의 행사\n`);

  // 샘플 데이터 특징:
  // 1. 초기에 생성된 데이터 (created_at이 오래된 것)
  // 2. 포스터 URL이 placeholder인 경우
  // 3. 설명이 너무 일반적이거나 템플릿 같은 경우
  // 4. venue_id가 없거나 이상한 경우

  const sampleDataCandidates: any[] = [];

  events.forEach(event => {
    let isSample = false;
    const reasons: string[] = [];

    // 1. Placeholder 포스터
    if (event.poster_url && event.poster_url.includes('placeholder')) {
      isSample = true;
      reasons.push('placeholder 포스터');
    }

    // 2. 기본 COEX 포스터
    if (event.poster_url && event.poster_url.includes('bs-event.png')) {
      isSample = true;
      reasons.push('기본 COEX 포스터');
    }

    // 3. 설명이 템플릿 같은 경우 (특정 패턴 검사)
    if (event.description && event.description.includes('최신 트렌드와 혁신 기술을 한자리에서')) {
      isSample = true;
      reasons.push('템플릿 설명');
    }

    // 4. venue_id가 없는 경우
    if (!event.venue_id) {
      isSample = true;
      reasons.push('venue_id 없음');
    }

    // 5. 2025년 이전 행사
    const startDate = new Date(event.start_date);
    if (startDate.getFullYear() < 2025) {
      isSample = true;
      reasons.push('2025년 이전 행사');
    }

    if (isSample) {
      sampleDataCandidates.push({
        ...event,
        reasons
      });
    }
  });

  if (sampleDataCandidates.length === 0) {
    console.log('✅ 샘플 데이터로 의심되는 행사가 없습니다.');
    return;
  }

  console.log(`⚠️  샘플 데이터로 의심되는 행사: ${sampleDataCandidates.length}개\n`);

  sampleDataCandidates.forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   ID: ${event.id}`);
    console.log(`   날짜: ${event.start_date} ~ ${event.end_date}`);
    console.log(`   포스터: ${event.poster_url || '없음'}`);
    console.log(`   이유: ${event.reasons.join(', ')}`);
    console.log(`   생성일: ${event.created_at}`);
    console.log();
  });

  console.log('\n=== 확인 완료 ===');
  console.log('위 행사들을 삭제하려면 delete-sample-data.ts를 실행하세요.');
}

checkSampleData();
