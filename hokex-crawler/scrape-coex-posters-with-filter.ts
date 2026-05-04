/**
 * Puppeteer로 COEX 일정 페이지에서 1월~4월 포스터 크롤링
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

async function scrapeCoexPostersWithFilter() {
  console.log('=== Puppeteer로 COEX 포스터 크롤링 시작 ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 120000 // 2분으로 증가
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📥 COEX 일정 페이지 로딩 중...\n');
    await page.goto('https://www.coex.co.kr/event/full-schedules/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 페이지 로딩 대기
    await page.waitForSelector('.BlogEventItem', { timeout: 10000 });

    console.log('🔍 1월~4월 필터 적용 중...\n');

    // 날짜 필터 클릭 (1월 버튼)
    try {
      // 1월 버튼 찾기 및 클릭
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div'));
        const janButton = buttons.find(btn => 
          btn.textContent?.includes('1월') || 
          btn.textContent?.includes('01월')
        );
        if (janButton && janButton instanceof HTMLElement) {
          janButton.click();
        }
      });

      await page.waitForTimeout(2000);

      // 4월까지 선택 (Shift + 클릭 또는 개별 클릭)
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div'));
        const aprButton = buttons.find(btn => 
          btn.textContent?.includes('4월') || 
          btn.textContent?.includes('04월')
        );
        if (aprButton && aprButton instanceof HTMLElement) {
          aprButton.click();
        }
      });

      await page.waitForTimeout(2000);

    } catch (error) {
      console.log('⚠️  필터 적용 실패, 전체 페이지에서 크롤링합니다.');
    }

    // 포스터 정보 추출
    console.log('📸 포스터 정보 추출 중...\n');

    const posters: CoexPoster[] = await page.evaluate(() => {
      const results: CoexPoster[] = [];
      const cards = document.querySelectorAll('.BlogEventItem');

      cards.forEach(card => {
        try {
          // 제목
          const titleEl = card.querySelector('.BlogEventItemCont-tit');
          const title = titleEl?.textContent?.trim() || '';

          // 포스터 이미지
          const imgEl = card.querySelector('.BlogEventItemHover img');
          let posterUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
          
          if (posterUrl && !posterUrl.startsWith('http')) {
            posterUrl = `https://www.coex.co.kr${posterUrl}`;
          }

          // 날짜
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

    // 1월~4월 행사만 필터링 (날짜 기준)
    const janAprPosters = posters.filter(p => {
      const dateMatch = p.date.match(/2026\.(\d{2})/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        return month >= 1 && month <= 4;
      }
      return false;
    });

    console.log(`📅 1월~4월 행사: ${janAprPosters.length}개\n`);

    if (janAprPosters.length > 0) {
      console.log('발견된 행사:');
      janAprPosters.forEach(p => {
        console.log(`  - ${p.title}`);
        console.log(`    날짜: ${p.date}`);
        console.log(`    포스터: ${p.posterUrl.substring(0, 60)}...`);
      });
    }

    // 데이터베이스 업데이트
    console.log('\n💾 데이터베이스 업데이트 중...\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const poster of janAprPosters) {
      // 행사명으로 데이터베이스에서 찾기
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .ilike('title', `%${poster.title}%`)
        .limit(1);

      if (events && events.length > 0) {
        const event = events[0];
        
        // 포스터 업데이트
        const { error } = await supabase
          .from('events')
          .update({
            poster_url: poster.posterUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (!error) {
          console.log(`✅ ${poster.title}: 포스터 업데이트`);
          updatedCount++;
        }
      } else {
        console.log(`⚠️  ${poster.title}: 데이터베이스에 없음`);
        notFoundCount++;
      }
    }

    console.log('\n=== 업데이트 완료 ===');
    console.log(`✅ 업데이트: ${updatedCount}개`);
    console.log(`⚠️  매칭 실패: ${notFoundCount}개`);

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
  } finally {
    await browser.close();
  }
}

scrapeCoexPostersWithFilter();
