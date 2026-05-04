/**
 * SETEC 전시장 크롤러
 * https://www.setec.or.kr/front/schedule/list.do
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
  endDate: string;
  venueHall: string;
  posterUrl: string;
  venueEventPageUrl: string;
  eventId: string;
}

async function scrapeSetecSchedule(): Promise<SetecEvent[]> {
  console.log('🔍 SETEC 일정 페이지 크롤링 시작 (2026.01.01 ~ 2026.12.31)...\n');

  try {
    const allEvents: SetecEvent[] = [];
    const startDateFilter = new Date('2026-01-01');
    const endDateFilter = new Date('2026-12-31');
    
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

      // 행사 카드 파싱
      $('.exhibit_list ul li').each((_, elem) => {
        try {
          const $elem = $(elem);
          const title = $elem.find('.txt strong').text().trim();
          
          // 기간 추출: "기간 : 2026-05-09 ~ 2026-05-10"
          const periodText = $elem.find('.txt ul li:contains("기간")').text().trim();
          const periodMatch = periodText.match(/기간\s*:\s*(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
          
          // 장소 추출: "장소 : 제1전시실, 제2전시실, 제3전시실"
          const venueText = $elem.find('.txt ul li:contains("장소")').text().trim();
          const venueMatch = venueText.match(/장소\s*:\s*(.+)/);

          // 포스터 이미지 URL 추출
          const posterImg = $elem.find('.img img').attr('src');
          const posterUrl = posterImg && posterImg !== '/resources/front/img/no_img.gif' 
            ? `https://www.setec.or.kr${posterImg}` 
            : '';

          // 행사 ID 추출 (onclick="fn_view('2282')")
          const onclickAttr = $elem.find('a').attr('onclick') || '';
          const eventIdMatch = onclickAttr.match(/fn_view\('(\d+)'\)/);
          const eventId = eventIdMatch ? eventIdMatch[1] : '';
          const venueEventPageUrl = eventId 
            ? `https://www.setec.or.kr/front/schedule/view.do?sIdx=${eventId}` 
            : '';

          if (title && periodMatch && venueMatch) {
            const startDate = periodMatch[1];
            const endDate = periodMatch[2];
            const venueHall = venueMatch[1].trim();

            // 2026년 기간 필터링
            const eventStartDate = new Date(startDate);
            
            if (eventStartDate >= startDateFilter && eventStartDate <= endDateFilter) {
              allEvents.push({
                title,
                startDate,
                endDate,
                venueHall,
                posterUrl,
                venueEventPageUrl,
                eventId
              });

              console.log(`✅ ${title}`);
              console.log(`   기간: ${startDate} ~ ${endDate}`);
              console.log(`   장소: ${venueHall}`);
              console.log(`   포스터: ${posterUrl || '없음'}`);
              console.log(`   상세페이지: ${venueEventPageUrl}\n`);
              pageEventCount++;
            } else {
              console.log(`⏭️  범위 밖: ${title} (${startDate})`);
            }
          }
        } catch (error) {
          console.error('행사 파싱 실패:', error);
        }
      });

      // 다음 페이지 확인
      const nextPageLink = $(`.paging a:contains("${pageIndex + 1}")`);
      hasMorePages = nextPageLink.length > 0;
      
      console.log(`📄 페이지 ${pageIndex}: ${pageEventCount}개 행사 발견\n`);
      
      if (hasMorePages) {
        pageIndex++;
        // 서버 부하 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📊 총 ${allEvents.length}개 행사 발견 (${pageIndex}페이지 크롤링 완료)\n`);
    return allEvents;

  } catch (error) {
    console.error('❌ SETEC 크롤링 실패:', error);
    throw error;
  }
}

async function saveToDatabase(events: SetecEvent[]): Promise<void> {
  console.log('💾 데이터베이스 저장 시작...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      // 중복 체크: 같은 제목 + 같은 전시장 + 같은 시작일
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('title', event.title)
        .eq('venue', '세텍')
        .eq('start_date', event.startDate)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  중복: ${event.title}`);
        skipCount++;
        continue;
      }

      // 새 행사 저장
      const { error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          start_date: event.startDate,
          end_date: event.endDate,
          venue: '세텍',
          region: '서울',
          venue_hall: event.venueHall,
          venue_event_page_url: event.venueEventPageUrl,
          poster_url: event.posterUrl || 'https://via.placeholder.com/400x300?text=No+Image',
          category: '전시',
          industry: '기타',
          day_string: `${event.startDate} ~ ${event.endDate}`
        });

      if (error) {
        console.error(`❌ 저장 실패: ${event.title}`, error.message);
        errorCount++;
      } else {
        console.log(`✅ 저장: ${event.title}`);
        successCount++;
      }

    } catch (error: any) {
      console.error(`❌ 에러: ${event.title}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 저장 완료:`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ⏭️  중복: ${skipCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개\n`);
}

async function main() {
  try {
    const events = await scrapeSetecSchedule();
    await saveToDatabase(events);
    console.log('✅ SETEC 크롤링 완료!');
  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
    process.exit(1);
  }
}

main();
