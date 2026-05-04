/**
 * SETEC 행사 상세 정보 크롤링
 * 이미 저장된 SETEC 행사들의 상세 정보를 업데이트
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeOrganizer, normalizeContact } from './src/utils/data-normalizer';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EventDetails {
  description: string;
  organizer: string;
  contact: string;
  operatingHours: string;
  eventWebsiteUrl: string;
  admissionFee: string;
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

    // 기본 정보 추출
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

    // 행사 상세 정보 (원본 텍스트)
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

async function updateSetecEventDetails() {
  console.log('🔍 SETEC 행사 상세 정보 업데이트 시작...\n');

  try {
    // venue_event_page_url이 있는 SETEC 행사 조회
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, venue_event_page_url')
      .eq('venue', '세텍')
      .not('venue_event_page_url', 'is', null)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('❌ 행사 조회 실패:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  업데이트할 SETEC 행사가 없습니다.');
      return;
    }

    console.log(`📊 총 ${events.length}개 행사 상세 정보 크롤링 시작\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        console.log(`🔍 ${event.title}`);

        const details = await scrapeEventDetails(event.venue_event_page_url);

        if (!details) {
          console.log(`   ⏭️  상세 정보 없음\n`);
          skipCount++;
          continue;
        }

        // 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('events')
          .update({
            description: details.description || null,
            organizer: details.organizer || null,
            contact: details.contact || null,
            operating_hours: details.operatingHours || null,
            target_link: details.eventWebsiteUrl || null,
            admission_fee: details.admissionFee || null
          })
          .eq('id', event.id);

        if (updateError) {
          console.error(`   ❌ 업데이트 실패:`, updateError.message);
          errorCount++;
        } else {
          console.log(`   ✅ 업데이트 완료`);
          console.log(`   주최: ${details.organizer || '없음'}`);
          console.log(`   문의: ${details.contact || '없음'}`);
          console.log(`   운영시간: ${details.operatingHours || '없음'}`);
          console.log(`   입장료: ${details.admissionFee || '없음'}`);
          console.log(`   공식 웹사이트: ${details.eventWebsiteUrl || '없음'}`);
          console.log(`   행사 소개: ${details.description ? details.description.substring(0, 50) + '...' : '없음'}\n`);
          successCount++;
        }

        // 서버 부하 방지
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`   ❌ 에러:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 업데이트 완료:`);
    console.log(`   ✅ 성공: ${successCount}개`);
    console.log(`   ⏭️  스킵: ${skipCount}개`);
    console.log(`   ❌ 실패: ${errorCount}개\n`);

  } catch (error) {
    console.error('❌ 업데이트 실패:', error);
  }
}

updateSetecEventDetails();
