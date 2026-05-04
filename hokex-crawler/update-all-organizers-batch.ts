/**
 * 전체 행사 주최/주관 정보 업데이트 (배치 처리)
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
  organizer?: string;
  supervisor?: string;
}

async function extractOrganizerFromCoex(coexUrl: string): Promise<OrganizerInfo> {
  try {
    const response = await axios.get(coexUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const info: OrganizerInfo = {};

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
    return {};
  }
}

async function updateAllOrganizersBatch() {
  console.log('=== 전체 행사 주최/주관 정보 업데이트 (배치 처리) ===\n');

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

  console.log(`📋 전체 행사: ${events.length}개`);
  console.log(`⏱️  예상 소요 시간: 약 ${Math.ceil(events.length * 1.5 / 60)}분\n`);

  let updatedCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const progress = `[${i + 1}/${events.length}]`;

    console.log(`${progress} ${event.title.substring(0, 50)}...`);

    // COEX 페이지에서 정보 추출
    const info = await extractOrganizerFromCoex(event.target_link);

    if (info.organizer || info.supervisor) {
      // 변경사항이 있는지 확인
      const hasChanges = 
        (info.organizer && info.organizer !== event.organizer) ||
        (info.supervisor && info.supervisor !== event.supervisor);

      if (hasChanges) {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (info.organizer) updateData.organizer = info.organizer;
        if (info.supervisor) updateData.supervisor = info.supervisor;

        const { error: updateError } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', event.id);

        if (!updateError) {
          console.log(`  ✅ 업데이트: 주최=${info.organizer || '변경없음'}, 주관=${info.supervisor || '변경없음'}`);
          updatedCount++;
        } else {
          console.log(`  ❌ 업데이트 실패`);
          errorCount++;
        }
      } else {
        unchangedCount++;
      }
    } else {
      unchangedCount++;
    }

    // 10개마다 진행상황 출력
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- 진행상황: ${i + 1}/${events.length} (${Math.round((i + 1) / events.length * 100)}%) ---`);
      console.log(`✅ 업데이트: ${updatedCount}개 | ⚠️  변경없음: ${unchangedCount}개 | ❌ 오류: ${errorCount}개\n`);
    }

    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log('\n=== 업데이트 완료 ===');
  console.log(`✅ 업데이트 성공: ${updatedCount}개`);
  console.log(`⚠️  변경 없음: ${unchangedCount}개`);
  console.log(`❌ 오류: ${errorCount}개`);
}

updateAllOrganizersBatch();
