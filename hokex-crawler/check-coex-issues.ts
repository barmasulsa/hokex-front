/**
 * COEX 행사 데이터 문제 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoexIssues() {
  console.log('🔍 COEX 행사 데이터 문제 확인...\n');

  try {
    // 1. 코베 베이비 페어
    console.log('=== 1. 2026 코베 베이비 페어 ===');
    const { data: babyFair } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%코베%베이비%')
      .single();

    if (babyFair) {
      console.log(`제목: ${babyFair.title}`);
      console.log(`주최: ${babyFair.organizer || '없음'}`);
      console.log(`전시품목: ${babyFair.exhibit_items || '없음'}`);
      console.log(`행사 페이지: ${babyFair.venue_event_page_url || '없음'}\n`);
    } else {
      console.log('행사를 찾을 수 없습니다.\n');
    }

    // 2. 대한레이저피부모발학회
    console.log('=== 2. 2026 대한레이저피부모발학회 미용의료기기 박람회 및 춘계학술대회 ===');
    const { data: laserFair } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%레이저피부모발%')
      .single();

    if (laserFair) {
      console.log(`제목: ${laserFair.title}`);
      console.log(`주최: ${laserFair.organizer || '없음'}`);
      console.log(`전시품목: ${laserFair.exhibit_items || '없음'}`);
      console.log(`행사 페이지: ${laserFair.venue_event_page_url || '없음'}\n`);
    } else {
      console.log('행사를 찾을 수 없습니다.\n');
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkCoexIssues();
