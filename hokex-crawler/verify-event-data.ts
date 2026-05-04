/**
 * 이벤트 데이터 검증 스크립트
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

async function verifyEvent() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', '13e0a066-89a8-4c86-994a-bcfcd9dc0138')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('='.repeat(60));
  console.log('이벤트 데이터 검증');
  console.log('='.repeat(60));
  console.log('\n📋 기본 정보:');
  console.log(`  제목: ${data.title}`);
  console.log(`  시작일: ${data.start_date}`);
  console.log(`  종료일: ${data.end_date}`);
  
  console.log('\n📍 장소 정보:');
  console.log(`  전시장: ${data.venue}`);
  console.log(`  관람 장소: ${data.venue_hall || '없음'}`);
  
  console.log('\n🔗 URL 정보:');
  console.log(`  공식 웹사이트: ${data.target_link || '없음'}`);
  console.log(`  전시장 행사 페이지: ${data.venue_event_page_url || '없음'}`);
  
  console.log('\n📞 문의 정보:');
  console.log(`  ${data.contact || '없음'}`);
  
  console.log('\n⏰ D-Day 계산:');
  const today = new Date('2026-05-04');
  const startDate = new Date(data.start_date);
  const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`  오늘: 2026-05-04`);
  console.log(`  시작일까지: ${daysUntil}일`);
  console.log(`  예상 배지: ${daysUntil >= 60 ? 'COMING SOON' : daysUntil > 0 ? `D-${daysUntil}` : 'ON-GOING'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 검증 완료');
  console.log('='.repeat(60));
}

verifyEvent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
