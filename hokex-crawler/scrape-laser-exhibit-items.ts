/**
 * 레이저피부모발학회 전시품목 크롤링
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeLaserExhibitItems() {
  const url = 'https://www.coex.co.kr/exhibitions/2026-%eb%8c%80%ed%95%9c%eb%a0%88%ec%9d%b4%ec%a0%80%ed%94%bc%eb%b6%80%eb%aa%a8%eb%b0%9c%ed%95%99%ed%9a%8c-%eb%af%b8%ec%9a%a9%ec%9d%98%eb%a3%8c%ea%b8%b0%ea%b8%b0-%eb%b0%95%eb%9e%8c%ed%9a%8c-%eb%b0%8f/?var_page=1&search_start_date=2026.05.03&search_end_date=2026.07.17&list_type=LIST';
  
  try {
    console.log(`🔍 크롤링: ${url}\n`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // HTML 저장
    fs.writeFileSync('laser-event-page.html', html, 'utf-8');
    console.log('✅ HTML 저장: laser-event-page.html\n');

    // 전시품목 찾기
    let exhibitItems = '';

    // COEX 페이지 구조: EventDetailBoxBody-item
    $('.EventDetailBoxBody-item').each((_, item) => {
      const $item = $(item);
      const title = $item.find('.EventDetailBoxBodyTitle').text().trim();
      
      if (title === '전시품목' || title.includes('전시품목')) {
        exhibitItems = $item.find('.EventDetailBoxBodyText-txt').text().trim();
      }
    });

    console.log('📊 크롤링 결과:');
    console.log(`전시품목: ${exhibitItems || '❌ 없음'}\n`);

    if (exhibitItems) {
      // 데이터베이스 업데이트
      const { data: events } = await supabase
        .from('events')
        .select('id, title')
        .eq('venue', '코엑스')
        .ilike('title', '%레이저피부모발%');

      if (events && events.length > 0) {
        for (const event of events) {
          const { error } = await supabase
            .from('events')
            .update({ exhibit_items: exhibitItems })
            .eq('id', event.id);

          if (error) {
            console.error(`❌ 업데이트 실패 (${event.title}):`, error.message);
          } else {
            console.log(`✅ 업데이트 완료: ${event.title}`);
          }
        }
      }
    } else {
      console.log('⚠️  전시품목을 찾을 수 없습니다. HTML 파일을 확인하세요.');
    }

  } catch (error: any) {
    console.error('❌ 에러:', error.message);
  }
}

scrapeLaserExhibitItems();
