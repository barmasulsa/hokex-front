/**
 * 관련 사이트에서 직접 포스터 크롤링
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 웹페이지에서 포스터 이미지 찾기
 */
async function findPosterFromUrl(url: string): Promise<string | null> {
  try {
    console.log(`  🔍 ${url} 크롤링 중...`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Open Graph 이미지 (가장 신뢰도 높음)
    let posterUrl = $('meta[property="og:image"]').attr('content');
    if (posterUrl) {
      console.log(`  ✅ Open Graph 이미지 발견`);
      return posterUrl;
    }

    // 2. Twitter Card 이미지
    posterUrl = $('meta[name="twitter:image"]').attr('content');
    if (posterUrl) {
      console.log(`  ✅ Twitter Card 이미지 발견`);
      return posterUrl;
    }

    // 3. 큰 이미지 찾기 (포스터일 가능성 높음)
    const images = $('img');
    let largestImage = '';
    let maxSize = 0;

    images.each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      const width = parseInt($(img).attr('width') || '0');
      const height = parseInt($(img).attr('height') || '0');
      const size = width * height;

      if (src && size > maxSize) {
        maxSize = size;
        largestImage = src;
      }
    });

    if (largestImage) {
      // 상대 경로를 절대 경로로 변환
      if (!largestImage.startsWith('http')) {
        const urlObj = new URL(url);
        largestImage = `${urlObj.protocol}//${urlObj.host}${largestImage}`;
      }
      console.log(`  ✅ 큰 이미지 발견 (${maxSize}px)`);
      return largestImage;
    }

    console.log(`  ⚠️  포스터를 찾을 수 없습니다`);
    return null;

  } catch (error: any) {
    console.log(`  ❌ 크롤링 실패: ${error.message}`);
    return null;
  }
}

async function scrapeFromRelatedSites() {
  console.log('=== 관련 사이트에서 포스터 크롤링 ===\n');

  // 포스터 없는 행사 찾기
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

  let updatedCount = 0;
  let failedCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);
    console.log(`  관련 사이트: ${event.target_link}`);

    const posterUrl = await findPosterFromUrl(event.target_link);

    if (posterUrl) {
      // 포스터 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: posterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (!updateError) {
        console.log(`  ✅ 포스터 업데이트 성공`);
        console.log(`     URL: ${posterUrl.substring(0, 80)}...`);
        updatedCount++;
      } else {
        console.log(`  ❌ 업데이트 실패:`, updateError);
        failedCount++;
      }
    } else {
      failedCount++;
    }

    // 요청 간 딜레이 (서버 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 크롤링 완료 ===');
  console.log(`✅ 업데이트 성공: ${updatedCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
}

scrapeFromRelatedSites();
