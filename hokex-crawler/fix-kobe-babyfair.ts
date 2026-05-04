/**
 * 2026 코베 베이비페어 주최 정보 수정
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

async function fixKobeBabyFair() {
  console.log('=== 2026 코베 베이비페어 주최 정보 수정 ===\n');

  // 행사 찾기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%코베%베이비페어%')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('❌ 행사를 찾을 수 없습니다.');
    return;
  }

  const event = events[0];
  console.log(`행사명: ${event.title}`);
  console.log(`현재 주최: ${event.organizer}`);
  console.log(`\n수정할 주최: 코엑스, 메쎄이상\n`);

  // 업데이트
  const { error: updateError } = await supabase
    .from('events')
    .update({
      organizer: '코엑스, 메쎄이상',
      updated_at: new Date().toISOString()
    })
    .eq('id', event.id);

  if (updateError) {
    console.error('❌ 업데이트 실패:', updateError);
    return;
  }

  console.log('✅ 업데이트 완료!');
}

fixKobeBabyFair();
