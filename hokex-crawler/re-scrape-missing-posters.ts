/**
 * 포스터 없는 행사들의 COEX 페이지에서 포스터 재크롤링
 * 더 강력한 셀렉터와 전략 사용
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function titleToSlug(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/&amp;/g, '')
    .replace(/·/g, '-')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function scrapeCoexPoster(title: string): Promise<string | null> {
  const slug = titleToSlug(title);
  const url = `https://www.coex.co.kr/exhibitions/${slug}/`;
  
  console.log(`  크롤링: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // 전략 1: og:image 메타 태그
    let posterUrl = $('meta[property="og:image"]').attr('content');
    if (posterUrl && !posterUrl.includes('bs-event.png')) {
      console.log(`  ✅ og:image에서 발견`);
      return posterUrl.startsWith('http') ? posterUrl : `https://www.coex.co.kr${posterUrl}`;
    }

    // 전략 2: 모든 img 태그 검색 (크기가 큰 이미지 우선)
    const images: Array<{url: string, size: number}> = [];
    $('img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || '';
      const width = parseInt($(img).attr('width') || '0');
      const height = parseInt($(img).attr('height') || '0');
      
      if (src && !src.includes('bs-event.png') && !src.includes('logo') && !src.includes('icon')) {
        const fullUrl = src.startsWith('http') ? src : `https://www.coex.co.kr${src}`;
        images.push({ url: fullUrl, size: width * height });
      }
    });

    // 크기 순으로 정렬
    images.sort((a, b) => b.size - a.size);
    
    if (images.length > 0) {
      console.log(`  ✅ 이미지 태그에서 발견 (${images.length}개 중 가장 큰 것)`);
      return images[0].url;
    }

    // 전략 3: wp-content/uploads 경로의 이미지 찾기
    const wpImages = $('img[src*="wp-content/uploads"]');
    if (wpImages.length > 0) {
      const src = wpImages.first().attr('src');
      if (src && !src.includes('bs-event.png')) {
        console.log(`  ✅ wp-content에서 발견`);
        return src.startsWith('http') ? src : `https://www.coex.co.kr${src}`;
      }
    }

    // 전략 4: 특정 클래스의 이미지
    const classSelectors = [
      '.exhibition-image img',
      '.event-poster img',
      '.poster-image img',
      '.main-image img',
      '.featured-image img',
      '.entry-content img',
      '.post-thumbnail img',
    ];

    for (const selector of classSelectors) {
      const img = $(selector).first();
      if (img.length > 0) {
        const src = img.attr('src') || img.attr('data-src');
        if (src && !src.includes('bs-event.png')) {
          console.log(`  ✅ ${selector}에서 발견`);
          return src.startsWith('http') ? src : `https://www.coex.co.kr${src}`;
        }
      }
    }

    console.log(`  ⚠️  포스터 없음`);
    return null;

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`  ❌ 페이지 없음 (404)`);
    } else {
      console.log(`  ❌ 에러: ${error.message}`);
    }
    return null;
  }
}

async function reScrapePosters() {
  console.log('=== 포스터 재크롤링 시작 ===\n');

  // 포스터 없거나 기본 포스터인 행사 조회
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
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

  const defaultPosters = [
    'https://www.coex.co.kr/wp-content/themes/coex-visitor/assets/images/bg/bs-event.png',
    'https://via.placeholder.com',
  ];

  const needsUpdate = events?.filter(event => 
    !event.poster_url || 
    defaultPosters.some(dp => event.poster_url?.includes(dp))
  ) || [];

  console.log(`🔍 업데이트 필요한 행사: ${needsUpdate.length}개\n`);

  let updatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < needsUpdate.length; i++) {
    const event = needsUpdate[i];
    console.log(`\n[${i + 1}/${needsUpdate.length}] ${event.title}`);

    const posterUrl = await scrapeCoexPoster(event.title);

    if (posterUrl) {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          poster_url: posterUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) {
        console.log(`  ❌ 업데이트 실패: ${updateError.message}`);
        failedCount++;
      } else {
        console.log(`  💾 데이터베이스 업데이트 완료`);
        updatedCount++;
      }
    } else {
      failedCount++;
    }

    // 요청 간격 (1초)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== 재크롤링 완료 ===');
  console.log(`✅ 포스터 업데이트: ${updatedCount}개`);
  console.log(`❌ 실패: ${failedCount}개`);
  console.log(`📊 전체: ${needsUpdate.length}개`);
}

reScrapePosters();
