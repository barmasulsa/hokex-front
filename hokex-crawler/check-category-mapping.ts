/**
 * 카테고리 매핑 검증 스크립트
 * 웨딩, 예술, 베이비 등의 행사가 올바른 카테고리로 매핑되었는지 확인
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

async function checkCategoryMapping() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  카테고리 매핑 검증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 웨딩 관련 행사 확인
  console.log('1️⃣  웨딩 관련 행사:');
  const { data: weddingEvents } = await supabase
    .from('events')
    .select('title, industry')
    .ilike('title', '%웨딩%')
    .order('title');
  
  weddingEvents?.forEach(event => {
    const status = event.industry === '웨딩' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 예술 관련 행사 확인
  console.log('\n2️⃣  예술 관련 행사:');
  const { data: artEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%예술%,title.ilike.%아트%,title.ilike.%일러스트%')
    .order('title');
  
  artEvents?.forEach(event => {
    const status = event.industry === '문화/예술' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 베이비/육아 관련 행사 확인
  console.log('\n3️⃣  베이비/육아 관련 행사:');
  const { data: babyEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%베이비%,title.ilike.%유아%,title.ilike.%육아%')
    .order('title');
  
  babyEvents?.forEach(event => {
    const status = event.industry === '임신/출산/육아' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 식품 관련 행사 확인
  console.log('\n4️⃣  식품 관련 행사:');
  const { data: foodEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%식품%,title.ilike.%푸드%,title.ilike.%카페%')
    .order('title');
  
  foodEvents?.forEach(event => {
    const status = event.industry === '농수축산/식음료' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 의료 관련 행사 확인
  console.log('\n5️⃣  의료 관련 행사:');
  const { data: medicalEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%의료%,title.ilike.%병원%,title.ilike.%치과%,title.ilike.%바이오%')
    .order('title');
  
  medicalEvents?.forEach(event => {
    const status = event.industry === '보건/의료/광학/정밀' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // IT/전자 관련 행사 확인
  console.log('\n6️⃣  IT/전자 관련 행사:');
  const { data: itEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%전자%,title.ilike.%IT%,title.ilike.%소프트웨어%,title.ilike.%AI%,title.ilike.%디스플레이%')
    .order('title');
  
  itEvents?.forEach(event => {
    const status = event.industry === '전기/전자/정보통신/방송' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 교육 관련 행사 확인
  console.log('\n7️⃣  교육 관련 행사:');
  const { data: eduEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%교육%,title.ilike.%유학%,title.ilike.%입학%')
    .order('title');
  
  eduEvents?.forEach(event => {
    const status = event.industry === '교육' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  // 프랜차이즈 관련 행사 확인
  console.log('\n8️⃣  프랜차이즈 관련 행사:');
  const { data: franchiseEvents } = await supabase
    .from('events')
    .select('title, industry')
    .or('title.ilike.%프랜차이즈%,title.ilike.%창업%')
    .order('title');
  
  franchiseEvents?.forEach(event => {
    const status = event.industry === '금융/부동산/전문서비스' ? '✅' : '❌';
    console.log(`${status} ${event.title} → ${event.industry}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  검증 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

checkCategoryMapping().catch(console.error);
