/**
 * COEX 페이지에서 주최/주관 정보 업데이트
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface OrganizerInfo {
  organizer?: string;  // 주최
  supervisor?: string; // 주관
}

async function extractOrganizerFromCoex(coexUrl: string): Promise<OrganizerInfo> {
  try {
    const response = await axios.get(coexUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const info: OrganizerInfo = {};

    // EventDetailBoxBody-item 찾기
    $('.EventDetailBoxBody-item').each((_, item) => {
      const $item = $(item);
      const title = $item.find('.EventDetailBoxBodyTitle').text().trim();
      const text = $item.find('.EventDetailBoxBodyText-txt').text().trim();

      if (title === '주최' && text) {
        info.organizer = text;
      } else if (title === '주관' && text) {
        info.supervisor = text;
      }
    });

    return info;

  } catch (error: any) {
    console.log(`  ⚠️  크롤링 실패: ${error.message}`);
    return {};
  }
}

async function updateOrganizers() {
  console.log('=== 전체 행사 주최/주관 정보 업데이트 ===\n');

  // target_link가 있는 모든 행사 가져오기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .not('target_link', 'is', null)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('✅ 업데이트할 행사가 없습니다!');
    return;
  }

  console.log(`📋 처리할 행사: ${events.length}개\n`);

  let updatedCount = 0;
  let failedCount = 0;
  let unchangedCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);
    console.log(`  현재 주최: ${event.organizer || '없음'}`);
    console.log(`  현재 주관: ${event.supervisor || '없음'}`);

    // COEX 페이지에서 정보 추출
    const info = await extractOrganizerFromCoex(event.target_link);

    if (info.organizer || info.supervisor) {
      console.log(`  ✅ 새로운 정보 발견:`);
      if (info.organizer) console.log(`     주최: ${info.organizer}`);
      if (info.supervisor) console.log(`     주관: ${info.supervisor}`);

      // 업데이트할 데이터 준비
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (info.organizer) updateData.organizer = info.organizer;
      if (info.supervisor) updateData.supervisor = info.supervisor;

      // 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);

      if (!updateError) {
        console.log(`  ✅ 업데이트 성공`);
        updatedCount++;
      } else {
        console.log(`  ❌ 업데이트 실패:`, updateError);
        failedCount++;
      }
    } else {
      console.log(`  ⚠️  새로운 정보 없음`);
      unchangedCount++;
    }

    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 업데이트 완료 ===');
  console.log(`✅ 업데이트 성공: ${updatedCount}개`);
  console.log(`⚠️  변경 없음: ${unchangedCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
}

updateOrganizers();
