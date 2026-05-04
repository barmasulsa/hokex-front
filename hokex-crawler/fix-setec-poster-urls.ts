/**
 * SETEC 포스터 URL이 null인 행사 수정
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SetecEvent {
  title: string;
  startDate: string;
  posterUrl: string;
  eventId: string;
}

async function scrapeSetecPosters(): Promise<Map<string, SetecEvent>> {
  console.log('🔍 SETEC 포스터 URL 크롤링 시작...\n');

  const eventMap = new Map<string, SetecEvent>();

  try {
    let pageIndex = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      console.log(`📄 페이지 ${pageIndex} 크롤링 중...`);
      
      const response = await axios.get('https://www.setec.or.kr/front/schedule/list.do', {
        params: { 
          pageIndex,
          searchSDate: '2026-01-01',
          searchEDate: '2026-12-31'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      let pageEventCount = 0;

      $('.exhibit_list ul li').each((_, elem) => {
        try {
          const $elem = $(elem);
          const title = $elem.find('.txt strong').text().trim();
          
          const periodText = $elem.find('.txt ul li:contains("기간")').text().trim();
          const periodMatch = periodText.match(/기간\s*:\s*(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
          
          const onclickAttr = $elem.find('a').attr('onclick') || '';
          const eventIdMatch = onclickAttr.match(/fn_view\('(\d+)'\)/);
          const eventId = eventIdMatch ? eventIdMatch[1] : '';

          // 포스터 이미지 URL 추출
          const posterImg = $elem.find('.img img').attr('src');
          const posterUrl = posterImg && posterImg !== '/resources/front/img/no_img.gif' 
            ? `https://www.setec.or.kr${posterImg}` 
            : '';

          if (title && periodMatch) {
            const startDate = periodMatch[1];
            const key = `${title}|${startDate}`;
            
            eventMap.set(key, {
              title,
              startDate,
              posterUrl,
              eventId
            });

            pageEventCount++;
          }
        } catch (error) {
          console.error('행사 파싱 실패:', error);
        }
      });

      const nextPageLink = $(`.paging a:contains("${pageIndex + 1}")`);
      hasMorePages = nextPageLink.length > 0;
      
      console.log(`   ${pageEventCount}개 포스터 발견\n`);
      
      if (hasMorePages) {
        pageIndex++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 총 ${eventMap.size}개 행사 포스터 수집 완료\n`);
    return eventMap;

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
    throw error;
  }
}

async function updatePosterUrls(eventMap: Map<string, SetecEvent>): Promise<void> {
  console.log('💾 포스터 URL 업데이트 시작...\n');

  try {
    // poster_url이 null인 SETEC 행사 조회
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, start_date, poster_url')
      .eq('venue', '세텍')
      .is('poster_url', null)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  포스터 URL이 없는 SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 행사 포스터 URL 업데이트 시작\n`);

    let updateCount = 0;
    let notFoundCount = 0;

    for (const event of events) {
      const key = `${event.title}|${event.start_date}`;
      const scrapedEvent = eventMap.get(key);

      if (!scrapedEvent) {
        console.log(`⚠️  크롤링 데이터 없음: ${event.title}`);
        notFoundCount++;
        continue;
      }

      const posterUrl = scrapedEvent.posterUrl || 'https://via.placeholder.com/400x300?text=No+Image';

      // 포스터 URL 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update({ poster_url: posterUrl })
        .eq('id', event.id);

      if (updateError) {
        console.error(`❌ 업데이트 실패: ${event.title}`, updateError.message);
      } else {
        console.log(`✅ 포스터 업데이트: ${event.title}`);
        console.log(`   ${posterUrl}\n`);
        updateCount++;
      }
    }

    console.log(`\n📊 업데이트 완료:`);
    console.log(`   ✅ 업데이트: ${updateCount}개`);
    console.log(`   ⚠️  미발견: ${notFoundCount}개\n`);

  } catch (error) {
    console.error('❌ 업데이트 실패:', error);
  }
}

async function main() {
  try {
    const eventMap = await scrapeSetecPosters();
    await updatePosterUrls(eventMap);
    console.log('✅ SETEC 포스터 URL 수정 완료!');
  } catch (error) {
    console.error('❌ 실패:', error);
    process.exit(1);
  }
}

main();
