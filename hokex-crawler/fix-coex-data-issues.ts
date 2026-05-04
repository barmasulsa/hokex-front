/**
 * COEX 행사 데이터 문제 수정
 * - 전시장 웹사이트 정보를 우선으로 사용
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeCoexEventPage(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 주최/주관 추출
    let organizer = '';
    let supervisor = '';
    $('.info-list li').each((_, elem) => {
      const $elem = $(elem);
      const label = $elem.find('.label').text().trim();
      const value = $elem.find('.value').text().trim();

      if (label === '주최') {
        organizer = value;
      } else if (label === '주관') {
        supervisor = value;
      }
    });

    // 전시품목 추출
    let exhibitItems = '';
    $('.section').each((_, section) => {
      const $section = $(section);
      const title = $section.find('.section-title').text().trim();
      
      if (title === '전시품목') {
        exhibitItems = $section.find('.section-content').text().trim();
      }
    });

    return {
      organizer,
      supervisor,
      exhibitItems
    };

  } catch (error) {
    console.error(`❌ 크롤링 실패: ${url}`, error);
    return null;
  }
}

async function fixCoexDataIssues() {
  console.log('🔧 COEX 행사 데이터 수정 시작...\n');

  try {
    // 1. 코베 베이비페어 수정
    console.log('=== 1. 2026 코베 베이비페어 수정 ===');
    const { data: babyFairs } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%코베%베이비%');

    if (babyFairs && babyFairs.length > 0) {
      for (const event of babyFairs) {
        console.log(`\n처리 중: ${event.title}`);
        console.log(`현재 주최: ${event.organizer}`);
        
        if (event.venue_event_page_url) {
          const details = await scrapeCoexEventPage(event.venue_event_page_url);
          
          if (details) {
            console.log(`COEX 웹사이트 정보:`);
            console.log(`  주최: ${details.organizer || '없음'}`);
            console.log(`  주관: ${details.supervisor || '없음'}`);
            console.log(`  전시품목: ${details.exhibitItems ? details.exhibitItems.substring(0, 50) + '...' : '없음'}`);

            // 업데이트
            const { error } = await supabase
              .from('events')
              .update({
                organizer: details.organizer || event.organizer,
                supervisor: details.supervisor || event.supervisor,
                exhibit_items: details.exhibitItems || event.exhibit_items
              })
              .eq('id', event.id);

            if (error) {
              console.error(`  ❌ 업데이트 실패:`, error.message);
            } else {
              console.log(`  ✅ 업데이트 완료`);
            }
          }
        } else {
          console.log(`  ⚠️  행사 페이지 URL 없음`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 2. 대한레이저피부모발학회 수정
    console.log('\n\n=== 2. 2026 대한레이저피부모발학회 미용의료기기 박람회 및 춘계학술대회 수정 ===');
    const { data: laserFair } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%레이저피부모발%')
      .single();

    if (laserFair) {
      console.log(`\n처리 중: ${laserFair.title}`);
      console.log(`현재 전시품목: ${laserFair.exhibit_items || '없음'}`);
      
      if (laserFair.venue_event_page_url) {
        const details = await scrapeCoexEventPage(laserFair.venue_event_page_url);
        
        if (details) {
          console.log(`COEX 웹사이트 정보:`);
          console.log(`  주최: ${details.organizer || '없음'}`);
          console.log(`  주관: ${details.supervisor || '없음'}`);
          console.log(`  전시품목: ${details.exhibitItems ? details.exhibitItems.substring(0, 100) + '...' : '없음'}`);

          // 업데이트
          const { error } = await supabase
            .from('events')
            .update({
              organizer: details.organizer || laserFair.organizer,
              supervisor: details.supervisor || laserFair.supervisor,
              exhibit_items: details.exhibitItems || laserFair.exhibit_items
            })
            .eq('id', laserFair.id);

          if (error) {
            console.error(`  ❌ 업데이트 실패:`, error.message);
          } else {
            console.log(`  ✅ 업데이트 완료`);
          }
        }
      } else {
        console.log(`  ⚠️  행사 페이지 URL 없음`);
      }
    }

    console.log('\n\n✅ 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 실패:', error);
  }
}

fixCoexDataIssues();
