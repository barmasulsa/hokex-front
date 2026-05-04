/**
 * "메쎄이" 오타를 "메쎄이상"으로 수정
 * 규칙: 주최/주관에서 "메쎄이"로만 끝나면 "메쎄이상"으로 변경
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * "메쎄이"를 "메쎄이상"으로 수정하는 함수
 * - "메쎄이"로 끝나는 경우만 수정
 * - "메쎄이상"은 그대로 유지
 */
function fixMesseiTypo(text: string | null): string | null {
  if (!text) return text;
  
  // "메쎄이"로 끝나는 경우 (뒤에 공백이나 쉼표가 있을 수 있음)
  // 예: "메쎄이", "코엑스, 메쎄이", "메쎄이 " 등
  const pattern = /메쎄이(?![상가-힣])/g;
  
  return text.replace(pattern, '메쎄이상');
}

async function fixMesseiInDatabase() {
  console.log('🔧 "메쎄이" 오타를 "메쎄이상"으로 수정 시작...\n');

  try {
    // 1. organizer 필드에서 "메쎄이" 찾기
    console.log('=== 1. organizer 필드 검색 ===');
    const { data: organizerEvents } = await supabase
      .from('events')
      .select('id, title, organizer')
      .ilike('organizer', '%메쎄이%');

    if (organizerEvents && organizerEvents.length > 0) {
      console.log(`📊 ${organizerEvents.length}개 행사 발견\n`);

      for (const event of organizerEvents) {
        const originalOrganizer = event.organizer;
        const fixedOrganizer = fixMesseiTypo(originalOrganizer);

        if (originalOrganizer !== fixedOrganizer) {
          console.log(`🔄 ${event.title}`);
          console.log(`   변경 전: ${originalOrganizer}`);
          console.log(`   변경 후: ${fixedOrganizer}`);

          const { error } = await supabase
            .from('events')
            .update({ organizer: fixedOrganizer })
            .eq('id', event.id);

          if (error) {
            console.error(`   ❌ 업데이트 실패:`, error.message);
          } else {
            console.log(`   ✅ 업데이트 완료\n`);
          }
        } else {
          console.log(`⏭️  ${event.title} - 이미 올바름 (${originalOrganizer})\n`);
        }
      }
    } else {
      console.log('⚠️  "메쎄이"가 포함된 organizer 없음\n');
    }

    // 2. supervisor 필드에서 "메쎄이" 찾기
    console.log('\n=== 2. supervisor 필드 검색 ===');
    const { data: supervisorEvents } = await supabase
      .from('events')
      .select('id, title, supervisor')
      .ilike('supervisor', '%메쎄이%');

    if (supervisorEvents && supervisorEvents.length > 0) {
      console.log(`📊 ${supervisorEvents.length}개 행사 발견\n`);

      for (const event of supervisorEvents) {
        const originalSupervisor = event.supervisor;
        const fixedSupervisor = fixMesseiTypo(originalSupervisor);

        if (originalSupervisor !== fixedSupervisor) {
          console.log(`🔄 ${event.title}`);
          console.log(`   변경 전: ${originalSupervisor}`);
          console.log(`   변경 후: ${fixedSupervisor}`);

          const { error } = await supabase
            .from('events')
            .update({ supervisor: fixedSupervisor })
            .eq('id', event.id);

          if (error) {
            console.error(`   ❌ 업데이트 실패:`, error.message);
          } else {
            console.log(`   ✅ 업데이트 완료\n`);
          }
        } else {
          console.log(`⏭️  ${event.title} - 이미 올바름 (${originalSupervisor})\n`);
        }
      }
    } else {
      console.log('⚠️  "메쎄이"가 포함된 supervisor 없음\n');
    }

    console.log('\n✅ 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 실패:', error);
  }
}

fixMesseiInDatabase();
