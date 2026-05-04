/**
 * Puppeteer로 관련 사이트에서 포스터 이미지 URL 추출
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

async function extractPosterImage(url: string): Promise<string | null> {
  let browser;
  try {
    console.log(`  🔍 ${url} 분석 중...`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(1000);

    // 포스터 이미지 찾기
    const posterUrl = await page.evaluate(() => {
      // 1. Open Graph 이미지
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        const content = ogImage.getAttribute('content');
        if (content) return content;
      }

      // 2. Twitter Card 이미지
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        const content = twitterImage.getAttribute('content');
        if (content) return content;
      }

      // 3. 큰 이미지 찾기 (포스터일 가능성 높음)
      const images = Array.from(document.querySelectorAll('img'));
      
      // 포스터 관련 키워드가 있는 이미지 우선
      const posterKeywords = ['poster', 'thumbnail', 'main', 'banner', '포스터', '썸네일'];
      for (const img of images) {
        const src = img.src || img.getAttribute('data-src') || '';
        const alt = img.alt || '';
        const className = img.className || '';
        
        const hasKeyword = posterKeywords.some(keyword => 
          src.toLowerCase().includes(keyword) ||
          alt.toLowerCase().includes(keyword) ||
          className.toLowerCase().includes(keyword)
        );
        
        if (hasKeyword && src) {
          return src;
        }
      }

      // 4. 가장 큰 이미지 찾기
      let largestImage = '';
      let maxSize = 0;

      for (const img of images) {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const size = width * height;

        if (size > maxSize && size > 10000) { // 최소 크기 필터
          maxSize = size;
          largestImage = img.src || img.getAttribute('data-src') || '';
        }
      }

      return largestImage || null;
    });

    if (posterUrl) {
      console.log(`  ✅ 포스터 발견: ${posterUrl.substring(0, 80)}...`);
      return posterUrl;
    } else {
      console.log(`  ⚠️  포스터를 찾을 수 없습니다`);
      return null;
    }

  } catch (error: any) {
    console.log(`  ❌ 분석 실패: ${error.message}`);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractPosterImages() {
  console.log('=== 관련 사이트에서 포스터 이미지 추출 ===\n');

  // 포스터 없고 관련 사이트가 있는 행사 찾기
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .is('poster_url', null)
    .not('target_link', 'is', null)
    .or(
      'and(start_date.gte.2026-01-01,start_date.lt.2026-05-01),' +
      'and(end_date.gte.2026-01-01,end_date.lt.2026-05-01),' +
      'and(start_date.lt.2026-01-01,end_date.gte.2026-05-01)'
    )
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('✅ 관련 사이트가 있는 포스터 없는 행사가 없습니다!');
    return;
  }

  console.log(`📋 처리할 행사: ${events.length}개\n`);

  let successCount = 0;
  let failCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);
    console.log(`  관련 사이트: ${event.target_link}`);

    // 포스터 이미지 추출
    const posterUrl = await extractPosterImage(event.target_link);

    if (posterUrl) {
      // 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: posterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (!updateError) {
        console.log(`  ✅ 포스터 업데이트 성공`);
        successCount++;
      } else {
        console.log(`  ❌ 업데이트 실패:`, updateError);
        failCount++;
      }
    } else {
      failCount++;
    }

    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n=== 추출 완료 ===');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

extractPosterImages();
