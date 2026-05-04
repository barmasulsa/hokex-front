/**
 * 간단한 Puppeteer 접근 - COEX 일정 페이지에서 1월~4월 포스터 크롤링
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CoexPoster {
  title: string;
  posterUrl: string;
  date: string;
}

async function scrapeCoexSimple() {
  console.log('=== COEX 포스터 크롤링 (간단 버전) ===\n');

  let browser;
  try {
    console.log('브라우저 실행 중...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // 불필요한 리소스 차단으로 속도 향상
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('✅ 브라우저 실행 성공\n');

    console.log('📥 COEX 일정 페이지 로딩 중...');
    
    // 더 짧은 타임아웃으로 시도
    await page.goto('https://www.coex.co.kr/event/full-schedules/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('✅ 페이지 로딩 완료\n');

    // 페이지가 로드될 때까지 대기
    await page.waitForSelector('.BlogEventItem', { timeout: 10000 });

    console.log('📸 포스터 정보 추출 중...\n');

    // 포스터 정보 추출
    const posters: CoexPoster[] = await page.evaluate(() => {
      const results: CoexPoster[] = [];
      const cards = document.querySelectorAll('.BlogEventItem');

      cards.forEach(card => {
        try {
          const titleEl = card.querySelector('.BlogEventItemCont-tit');
          const title = titleEl?.textContent?.trim() || '';

          const imgEl = card.querySelector('.BlogEventItemHover img');
          let posterUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
          
          if (posterUrl && !posterUrl.startsWith('http')) {
            posterUrl = `https://www.coex.co.kr${posterUrl}`;
          }

          const dateEl = card.querySelector('.BlogEventItemCont-date');
          const date = dateEl?.textContent?.trim() || '';

          if (title && posterUrl) {
            results.push({ title, posterUrl, date });
          }
        } catch (error) {
          // 무시
        }
      });

      return results;
    });

    console.log(`✅ ${posters.length}개 포스터 발견\n`);

    // 1월~4월 행사만 필터링
    const janAprPosters = posters.filter(p => {
      // 날짜 형식: "2026.01.15 ~ 2026.01.17" 또는 "2026.01.15"
      const dateMatch = p.date.match(/2026\.0([1-4])/);
      return dateMatch !== null;
    });

    console.log(`📅 1월~4월 행사: ${janAprPosters.length}개\n`);

    if (janAprPosters.length > 0) {
      console.log('발견된 행사:');
      janAprPosters.slice(0, 10).forEach(p => {
        console.log(`  - ${p.title}`);
        console.log(`    날짜: ${p.date}`);
      });
      if (janAprPosters.length > 10) {
        console.log(`  ... 외 ${janAprPosters.length - 10}개`);
      }
      console.log();
    }

    // 데이터베이스에서 포스터 없는 행사 가져오기
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .is('poster_url', null)
      .or(
        'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
        'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
        'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
      );

    if (!events || events.length === 0) {
      console.log('✅ 모든 행사에 포스터가 있습니다!');
      return;
    }

    console.log(`💾 데이터베이스 업데이트 중... (${events.length}개 행사)\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const event of events) {
      // 행사명으로 매칭 (유사도 검사)
      const matchedPoster = janAprPosters.find(p => {
        const eventTitle = event.title.toLowerCase().replace(/\s+/g, '');
        const posterTitle = p.title.toLowerCase().replace(/\s+/g, '');
        
        return eventTitle.includes(posterTitle) || 
               posterTitle.includes(eventTitle) ||
               eventTitle === posterTitle;
      });

      if (matchedPoster) {
        const { error } = await supabase
          .from('events')
          .update({
            poster_url: matchedPoster.posterUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (!error) {
          console.log(`✅ ${event.title}: 포스터 업데이트`);
          updatedCount++;
        }
      } else {
        console.log(`⚠️  ${event.title}: 매칭 실패`);
        notFoundCount++;
      }
    }

    console.log('\n=== 업데이트 완료 ===');
    console.log(`✅ 업데이트: ${updatedCount}개`);
    console.log(`⚠️  매칭 실패: ${notFoundCount}개`);

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

scrapeCoexSimple();
