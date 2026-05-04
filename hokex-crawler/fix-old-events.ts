/**
 * 과거 행사 카테고리 수정 스크립트
 * 유사한 행사의 카테고리를 참고하여 잘못된 카테고리 수정
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOldEvents() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  과거 행사 카테고리 수정');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. "제415회 웨덱스 웨딩박람회" 수정
  console.log('1️⃣  제415회 웨덱스 웨딩박람회 수정:');
  
  // 유사한 웨딩박람회 찾기
  const { data: similarWeddings } = await supabase
    .from('events')
    .select('title, category, industry')
    .ilike('title', '%웨덱스%웨딩박람회%')
    .neq('title', '제415회 웨덱스 웨딩박람회')
    .limit(3);
  
  console.log('   유사 행사 참고:');
  similarWeddings?.forEach(event => {
    console.log(`   - ${event.title}: ${event.category}, ${event.industry}`);
  });
  
  // 제415회 웨덱스 웨딩박람회 업데이트
  const { error: error1 } = await supabase
    .from('events')
    .update({
      category: '전시',
      industry: '웨딩',
      updated_at: new Date().toISOString()
    })
    .eq('title', '제415회 웨덱스 웨딩박람회');
  
  if (error1) {
    console.log(`   ❌ 업데이트 실패: ${error1.message}`);
  } else {
    console.log(`   ✅ 업데이트 완료: 회의 → 전시, 문화/예술 → 웨딩\n`);
  }

  // 2. "2026 유학박람회" 수정
  console.log('2️⃣  2026 유학박람회 수정:');
  
  // 유사한 유학박람회 찾기
  const { data: similarStudy } = await supabase
    .from('events')
    .select('title, category, industry')
    .ilike('title', '%유학%박람회%')
    .neq('title', '2026 유학박람회')
    .limit(3);
  
  console.log('   유사 행사 참고:');
  similarStudy?.forEach(event => {
    console.log(`   - ${event.title}: ${event.category}, ${event.industry}`);
  });
  
  // 2026 유학박람회 업데이트
  const { error: error2 } = await supabase
    .from('events')
    .update({
      category: '전시',
      industry: '교육',
      updated_at: new Date().toISOString()
    })
    .eq('title', '2026 유학박람회');
  
  if (error2) {
    console.log(`   ❌ 업데이트 실패: ${error2.message}`);
  } else {
    console.log(`   ✅ 업데이트 완료: 회의 → 전시, 문화/예술 → 교육\n`);
  }

  // 3. 검증
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  수정 결과 검증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const { data: fixed1 } = await supabase
    .from('events')
    .select('title, category, industry')
    .eq('title', '제415회 웨덱스 웨딩박람회')
    .single();
  
  if (fixed1) {
    const status = (fixed1.category === '전시' && fixed1.industry === '웨딩') ? '✅' : '❌';
    console.log(`${status} ${fixed1.title}`);
    console.log(`   Category: ${fixed1.category}, Industry: ${fixed1.industry}\n`);
  }
  
  const { data: fixed2 } = await supabase
    .from('events')
    .select('title, category, industry')
    .eq('title', '2026 유학박람회')
    .single();
  
  if (fixed2) {
    const status = (fixed2.category === '전시' && fixed2.industry === '교육') ? '✅' : '❌';
    console.log(`${status} ${fixed2.title}`);
    console.log(`   Category: ${fixed2.category}, Industry: ${fixed2.industry}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

fixOldEvents().catch(console.error);
