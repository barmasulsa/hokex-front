/**
 * Puppeteer로 관련 사이트 스크린샷 캡처하여 포스터 생성
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function captureScreenshot(url: string, outputPath: string): Promise<boolean> {
  let browser;
  try {
    console.log(`  📸 ${url} 캡처 중...`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(2000);

    // 스크린샷 캡처
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 85
    });

    console.log(`  ✅ 스크린샷 저장: ${outputPath}`);
    return true;

  } catch (error: any) {
    console.log(`  ❌ 캡처 실패: ${error.message}`);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function captureMissingPosters() {
  console.log('=== 포스터 없는 행사 스크린샷 캡처 ===\n');

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

  // 스크린샷 저장 디렉토리 생성
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const event of events) {
    console.log(`\n처리 중: ${event.title}`);
    console.log(`  관련 사이트: ${event.target_link}`);

    // 파일명 생성 (안전한 파일명으로 변환)
    const safeFileName = event.title
      .replace(/[^a-zA-Z0-9가-힣]/g, '_')
      .substring(0, 50);
    const outputPath = path.join(screenshotDir, `${safeFileName}.jpg`);

    // 스크린샷 캡처
    const success = await captureScreenshot(event.target_link, outputPath);

    if (success) {
      console.log(`  ✅ 캡처 성공`);
      console.log(`  💡 수동으로 이미지를 업로드하고 URL을 업데이트하세요:`);
      console.log(`     파일: ${outputPath}`);
      console.log(`     행사 ID: ${event.id}`);
      successCount++;
    } else {
      failCount++;
    }

    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== 캡처 완료 ===');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`\n📁 스크린샷 저장 위치: ${screenshotDir}`);
  console.log('\n💡 다음 단계:');
  console.log('   1. screenshots 폴더의 이미지를 확인');
  console.log('   2. 이미지 호스팅 서비스에 업로드 (예: Supabase Storage, Cloudinary)');
  console.log('   3. 업로드된 URL로 데이터베이스 업데이트');
}

captureMissingPosters();
