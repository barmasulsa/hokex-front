/**
 * COEX 행사 데이터 수정 (사용자 제공 URL 형식 사용)
 * URL 형식: https://www.coex.co.kr/exhibitions/2025-코베-베이비페어/?var_page=1&search_start_date=2026.05.03&search_end_date=2026.07.17&list_type=LIST
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeCoexEventDetails(url: string) {
  try {
    console.log(`  🔍 크롤링 중: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 주최/주관 추출
    let organizer = '';
    let supervisor = '';
    let exhibitItems = '';
    let contact = '';

    // 정보 테이블에서 추출
    $('.info-table tr, .detail-info tr, table tr').each((_, row) => {
      const $row = $(row);
      const label = $row.find('th, .label, td:first-child').text().trim();
      const value = $row.find('td:last-child, .value').text().trim();

      if (label.includes('주최')) {
        organizer = value;
      } else if (label.includes('주관')) {
        supervisor = value;
      } else if (label.includes('전시품목') || label.includes('전시 품목')) {
        exhibitItems = value;
      } else if (label.includes('문의') || label.includes('연락처')) {
        contact = value;
      }
    });

    // 리스트 형식에서도 추출 시도
    $('.info-list li, .detail-list li').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      
      if (text.includes('주최:') || text.includes('주최 :')) {
        organizer = text.replace(/주최\s*:\s*/g, '').trim();
      } else if (text.includes('주관:') || text.includes('주관 :')) {
        supervisor = text.replace(/주관\s*:\s*/g, '').trim();
      } else if (text.includes('전시품목:') || text.includes('전시품목 :')) {
        exhibitItems = text.replace(/전시품목\s*:\s*/g, '').trim();
      }
    });

    // dl/dt/dd 형식에서도 추출
    $('dl').each((_, dl) => {
      const $dl = $(dl);
      $dl.find('dt').each((i, dt) => {
        const $dt = $(dt);
        const $dd = $dt.next('dd');
        const label = $dt.text().trim();
        const value = $dd.text().trim();

        if (label.includes('주최')) {
          organizer = value;
        } else if (label.includes('주관')) {
          supervisor = value;
        } else if (label.includes('전시품목')) {
          exhibitItems = value;
        } else if (label.includes('문의')) {
          contact = value;
        }
      });
    });

    return {
      organizer: organizer || null,
      supervisor: supervisor || null,
      exhibitItems: exhibitItems || null,
      contact: contact || null
    };

  } catch (error: any) {
    console.error(`  ❌ 크롤링 실패:`, error.message);
    return null;
  }
}

async function fixCoexData() {
  console.log('🔧 COEX 행사 데이터 수정 (사용자 제공 URL 형식)\n');

  try {
    // 1. 코베 베이비페어 수정
    console.log('=== 1. 2026 코베 베이비페어 ===');
    const babyFairUrl = 'https://www.coex.co.kr/exhibitions/2025-코베-베이비페어/?var_page=1&search_start_date=2026.05.03&search_end_date=2026.07.17&list_type=LIST';
    
    const { data: babyFairs } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%코베%베이비%');

    if (babyFairs && babyFairs.length > 0) {
      for (const event of babyFairs) {
        console.log(`\n📝 ${event.title}`);
        console.log(`   현재 주최: ${event.organizer || '없음'}`);
        
        const details = await scrapeCoexEventDetails(babyFairUrl);
        
        if (details) {
          console.log(`\n   COEX 웹사이트 정보:`);
          console.log(`   주최: ${details.organizer || '없음'}`);
          console.log(`   주관: ${details.supervisor || '없음'}`);
          console.log(`   전시품목: ${details.exhibitItems ? details.exhibitItems.substring(0, 50) + '...' : '없음'}`);
          console.log(`   문의: ${details.contact || '없음'}`);

          // 업데이트할 데이터 준비
          const updates: any = {};
          if (details.organizer) updates.organizer = details.organizer;
          if (details.supervisor) updates.supervisor = details.supervisor;
          if (details.exhibitItems) updates.exhibit_items = details.exhibitItems;
          if (details.contact) updates.contact = details.contact;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from('events')
              .update(updates)
              .eq('id', event.id);

            if (error) {
              console.error(`   ❌ 업데이트 실패:`, error.message);
            } else {
              console.log(`   ✅ 업데이트 완료`);
            }
          } else {
            console.log(`   ⚠️  업데이트할 정보 없음`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log('⚠️  코베 베이비페어를 찾을 수 없습니다.');
    }

    // 2. 대한레이저피부모발학회 수정
    console.log('\n\n=== 2. 2026 대한레이저피부모발학회 미용의료기기 박람회 및 춘계학술대회 ===');
    
    const { data: laserEvents } = await supabase
      .from('events')
      .select('*')
      .eq('venue', '코엑스')
      .ilike('title', '%레이저피부모발%');

    if (laserEvents && laserEvents.length > 0) {
      for (const event of laserEvents) {
        console.log(`\n📝 ${event.title}`);
        console.log(`   현재 전시품목: ${event.exhibit_items || '없음'}`);
        
        // venue_event_page_url이 있으면 사용, 없으면 타이틀로 URL 생성
        let eventUrl = event.venue_event_page_url;
        
        if (!eventUrl) {
          // 타이틀에서 URL 생성 시도
          const titleSlug = event.title
            .replace(/2026\s*/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
          eventUrl = `https://www.coex.co.kr/exhibitions/${titleSlug}/?var_page=1&search_start_date=${event.start_date.replace(/-/g, '.')}&search_end_date=${event.end_date.replace(/-/g, '.')}&list_type=LIST`;
        }
        
        console.log(`   URL: ${eventUrl}`);
        
        const details = await scrapeCoexEventDetails(eventUrl);
        
        if (details) {
          console.log(`\n   COEX 웹사이트 정보:`);
          console.log(`   주최: ${details.organizer || '없음'}`);
          console.log(`   주관: ${details.supervisor || '없음'}`);
          console.log(`   전시품목: ${details.exhibitItems ? details.exhibitItems.substring(0, 100) + '...' : '없음'}`);
          console.log(`   문의: ${details.contact || '없음'}`);

          // 업데이트할 데이터 준비
          const updates: any = {};
          if (details.organizer) updates.organizer = details.organizer;
          if (details.supervisor) updates.supervisor = details.supervisor;
          if (details.exhibitItems) updates.exhibit_items = details.exhibitItems;
          if (details.contact) updates.contact = details.contact;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from('events')
              .update(updates)
              .eq('id', event.id);

            if (error) {
              console.error(`   ❌ 업데이트 실패:`, error.message);
            } else {
              console.log(`   ✅ 업데이트 완료`);
            }
          } else {
            console.log(`   ⚠️  업데이트할 정보 없음`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log('⚠️  레이저피부모발학회 행사를 찾을 수 없습니다.');
    }

    console.log('\n\n✅ 모든 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 실패:', error);
  }
}

fixCoexData();
