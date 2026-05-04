/**
 * 전체 데이터베이스에서 COEX가 아닌 행사 찾기
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

async function findAllNonCoex() {
  console.log('=== 전체 데이터베이스에서 COEX가 아닌 행사 찾기 ===\n');

  // 모든 행사 가져오기
  const { data: allEvents, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 전체 행사: ${allEvents?.length || 0}개\n`);

  if (!allEvents || allEvents.length === 0) {
    return;
  }

  // venue 필드 분석
  const venueGroups = new Map<string, any[]>();

  allEvents.forEach(event => {
    const venue = event.venue || '전시장 정보 없음';
    if (!venueGroups.has(venue)) {
      venueGroups.set(venue, []);
    }
    venueGroups.get(venue)!.push(event);
  });

  console.log('=== 전시장별 행사 수 ===\n');
  
  const sortedVenues = Array.from(venueGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  sortedVenues.forEach(([venue, events]) => {
    console.log(`${venue}: ${events.length}개`);
  });

  // COEX가 아닌 행사들
  console.log('\n\n=== COEX가 아닌 행사 ===\n');

  const nonCoexEvents = allEvents.filter(e => {
    const venue = (e.venue || '').toLowerCase();
    return !venue.includes('coex') && !venue.includes('코엑스');
  });

  console.log(`총 ${nonCoexEvents.length}개\n`);

  if (nonCoexEvents.length > 0) {
    nonCoexEvents.forEach(event => {
      console.log(`📋 ${event.title}`);
      console.log(`   전시장: ${event.venue || '없음'}`);
      console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
      console.log(`   생성일: ${event.created_at}`);
      console.log();
    });
  }

  // 1월~4월 범위 내 COEX가 아닌 행사
  console.log('\n=== 1월~4월 중 COEX가 아닌 행사 ===\n');

  const janAprNonCoex = nonCoexEvents.filter(e => {
    const startDate = new Date(e.start_date);
    const endDate = new Date(e.end_date);
    const jan2026 = new Date('2026-01-01');
    const may2026 = new Date('2026-05-01');

    return (startDate >= jan2026 && startDate < may2026) ||
           (endDate >= jan2026 && endDate < may2026) ||
           (startDate < jan2026 && endDate >= may2026);
  });

  console.log(`총 ${janAprNonCoex.length}개\n`);

  if (janAprNonCoex.length > 0) {
    janAprNonCoex.forEach(event => {
      console.log(`📋 ${event.title}`);
      console.log(`   전시장: ${event.venue || '없음'}`);
      console.log(`   기간: ${event.start_date} ~ ${event.end_date}`);
      console.log();
    });
  }
}

findAllNonCoex();
