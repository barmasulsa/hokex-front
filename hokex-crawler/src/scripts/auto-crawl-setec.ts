/**
 * SETEC 자동 크롤링 스크립트
 * 기본 정보 크롤링 → 상세 정보 크롤링 → Supabase 저장
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeOrganizer, normalizeContact } from '../utils/data-normalizer';

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

interface EventDetails {
  description: string;
  organizer: string;
  contact: string;
  operatingHours: string;
  eventWebsiteUrl: string;
  admissionFee: string;
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
          
          // 기간 추출
          const periodText = $elem.find('.txt ul li:contains("기간")').text().trim();
          const periodMatch = periodText.match(/기간\s*:\s*(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
          
          // 장소 추출
          const venueText = $elem.find('.txt ul li:contains("장소")').text().trim();
          const venueMatch = venueText.match(/장소\s*:\s*(.+)/);

          // 포스터 이미지 URL 추출
          const posterImg = $elem.find('.img img').attr('src');
          const posterUrl = posterImg && posterImg !== '/resources/front/img/no_img.gif' 
            ? `https://www.setec.or.kr${posterImg}` 
            : '';

          // 행사 ID 추출
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
              pageEventCount++;
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📊 총 ${allEvents.length}개 행사 발견\n`);
    return allEvents;

  } catch (error) {
    console.error('❌ SETEC 크롤링 실패:', error);
    throw error;
  }
}

async function scrapeEventDetails(venueEventPageUrl: string): Promise<EventDetails | null> {
  try {
    const response = await axios.get(venueEventPageUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let organizer = '';
    let contact = '';
    let operatingHours = '';
    let eventWebsiteUrl = '';
    let eventPeriod = '';
    let admissionFee = '';

    $('.txt_area ul li').each((_, elem) => {
      const $elem = $(elem);
      const title = $elem.find('.tit').text().trim();
      const value = $elem.find('p').text().trim();

      if (title === '주최' || title === '주관') {
        organizer = value;
      } else if (title === '전화번호' || title === '문의') {
        contact = value;
      } else if (title === '시간') {
        operatingHours = value;
      } else if (title === '기간') {
        eventPeriod = value;
      } else if (title === '입장료') {
        admissionFee = value;
      } else if (title === '홈페이지') {
        const href = $elem.find('a').attr('href');
        if (href && href.trim() !== '') {
          eventWebsiteUrl = href.trim();
        }
      }
    });

    // 운영시간에 행사 기간 추가
    if (eventPeriod && operatingHours) {
      operatingHours = `${eventPeriod}\n${operatingHours}`;
    } else if (eventPeriod && !operatingHours) {
      operatingHours = eventPeriod;
    }

    const description = $('.detail p').text().trim();

    return {
      description,
      organizer: normalizeOrganizer(organizer) || '',
      contact: normalizeContact(contact) || '',
      operatingHours,
      eventWebsiteUrl,
      admissionFee
    };

  } catch (error) {
    console.error(`❌ 상세 정보 크롤링 실패: ${venueEventPageUrl}`, error);
    return null;
  }
}

async function saveToDatabase(events: SetecEvent[]): Promise<number> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  데이터베이스 저장 및 상세 정보 크롤링');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      // 중복 체크
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

      // 상세 정보 크롤링
      let details: EventDetails | null = null;
      if (event.venueEventPageUrl) {
        console.log(`🔍 ${event.title} - 상세 정보 크롤링 중...`);
        details = await scrapeEventDetails(event.venueEventPageUrl);
        await new Promise(resolve => setTimeout(resolve, 1000));
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
          day_string: `${event.startDate} ~ ${event.endDate}`,
          description: details?.description || null,
          organizer: details?.organizer || null,
          contact: details?.contact || null,
          operating_hours: details?.operatingHours || null,
          target_link: details?.eventWebsiteUrl || null,
          admission_fee: details?.admissionFee || null
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

  return successCount;
}

async function autoCrawlSetec() {
  try {
    console.log(`\n🚀 SETEC 자동 크롤링 시작...\n`);
    console.log(`📅 ${new Date().toLocaleString('ko-KR')}\n`);

    // 1단계: 기본 정보 크롤링
    const events = await scrapeSetecSchedule();

    // 2단계: 데이터베이스 저장 및 상세 정보 크롤링
    if (events.length > 0) {
      const savedCount = await saveToDatabase(events);
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  완료!`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`✅ ${savedCount}개 행사 저장 완료!\n`);
      console.log(`🌐 웹사이트에서 확인: https://hokex-front.vercel.app/`);
      console.log(`🌐 로컬에서 확인: http://localhost:5173\n`);
    } else {
      console.log(`\n⚠️  저장할 데이터가 없습니다.\n`);
    }

  } catch (error) {
    console.error(`\n❌ 크롤링 실패:`, error);
    process.exit(1);
  }
}

// 실행
autoCrawlSetec();
