/**
 * 데이터베이스와 COEX 페이지의 주최/주관 정보 비교
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

async function compareOrganizerData() {
  console.log('=== 데이터베이스 vs COEX 페이지 주최/주관 정보 비교 ===\n');

  // 2026 호텔페어 찾기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%호텔페어%')
    .limit(1);

  if (error || !events || events.length === 0) {
    console.error('행사를 찾을 수 없습니다');
    return;
  }

  const event = events[0];
  console.log(`행사명: ${event.title}`);
  console.log(`\n📊 데이터베이스:`);
  console.log(`  주최: ${event.organizer || '없음'}`);
  console.log(`  주관: ${event.supervisor || '없음'}`);

  // COEX 페이지에서 정보 추출
  try {
    const response = await axios.get(event.target_link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log(`\n📊 COEX 페이지:`);

    let foundOrganizer = false;
    let foundSupervisor = false;

    $('.EventDetailBoxBody-item').each((_, item) => {
      const $item = $(item);
      const title = $item.find('.EventDetailBoxBodyTitle').text().trim();
      const text = $item.find('.EventDetailBoxBodyText-txt').text().trim();

      if (title === '주최' && text) {
        console.log(`  주최: ${text}`);
        foundOrganizer = true;
        
        if (text !== event.organizer) {
          console.log(`  ⚠️  DB와 다름! DB="${event.organizer}" vs COEX="${text}"`);
        }
      } else if (title === '주관' && text) {
        console.log(`  주관: ${text}`);
        foundSupervisor = true;
        
        if (text !== event.supervisor) {
          console.log(`  ⚠️  DB와 다름! DB="${event.supervisor}" vs COEX="${text}"`);
        }
      }
    });

    if (!foundOrganizer) console.log(`  주최: 없음`);
    if (!foundSupervisor) console.log(`  주관: 없음`);

  } catch (error: any) {
    console.error(`\n❌ COEX 페이지 크롤링 실패: ${error.message}`);
  }
}

compareOrganizerData();
