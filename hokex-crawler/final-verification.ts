/**
 * 최종 검증: Category와 Industry 매핑 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalVerification() {
  const today = '2026-05-02';
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  최종 검증 (오늘 크롤링: ${today})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 박람회/페어/엑스포가 전시로 분류되었는지 확인
  console.log('1️⃣  박람회/페어/엑스포 → 전시 분류 확인:');
  const { data: fairs } = await supabase
    .from('events')
    .select('title, category, industry')
    .or('title.ilike.%박람회%,title.ilike.%페어%,title.ilike.%엑스포%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .limit(10);
  
  let fairCorrect = 0;
  let fairWrong = 0;
  fairs?.forEach(event => {
    const status = event.category === '전시' ? '✅' : '❌';
    if (event.category === '전시') fairCorrect++;
    else fairWrong++;
    console.log(`${status} ${event.title} → ${event.category}`);
  });
  console.log(`결과: ${fairCorrect}/${fairs?.length || 0}개 정확\n`);

  // 2. 컨퍼런스/세미나가 회의로 분류되었는지 확인
  console.log('2️⃣  컨퍼런스/세미나 → 회의 분류 확인:');
  const { data: conferences } = await supabase
    .from('events')
    .select('title, category')
    .or('title.ilike.%컨퍼런스%,title.ilike.%세미나%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .limit(5);
  
  let confCorrect = 0;
  let confWrong = 0;
  conferences?.forEach(event => {
    // 특수 케이스: "박람회"가 메인이고 "세미나"가 부가 프로그램인 경우는 전시가 맞음
    const hasExhibitionKeyword = event.title.toLowerCase().includes('박람회') || 
                                  event.title.toLowerCase().includes('페어') ||
                                  event.title.toLowerCase().includes('엑스포');
    
    const expectedCategory = hasExhibitionKeyword ? '전시' : '회의';
    const status = event.category === expectedCategory ? '✅' : '❌';
    
    if (event.category === expectedCategory) confCorrect++;
    else confWrong++;
    
    console.log(`${status} ${event.title} → ${event.category} (예상: ${expectedCategory})`);
  });
  console.log(`결과: ${confCorrect}/${conferences?.length || 0}개 정확\n`);

  // 3. 웨딩 행사 Industry 확인
  console.log('3️⃣  웨딩 행사 Industry 확인:');
  const { data: weddings } = await supabase
    .from('events')
    .select('title, category, industry')
    .ilike('title', '%웨딩%')
    .gte('last_crawled_at', `${today}T00:00:00`);
  
  let weddingCorrect = 0;
  let weddingWrong = 0;
  weddings?.forEach(event => {
    const catStatus = event.category === '전시' ? '✅' : '❌';
    const indStatus = event.industry === '웨딩' ? '✅' : '❌';
    if (event.category === '전시' && event.industry === '웨딩') weddingCorrect++;
    else weddingWrong++;
    console.log(`${catStatus}${indStatus} ${event.title}`);
    console.log(`   Category: ${event.category}, Industry: ${event.industry}`);
  });
  console.log(`결과: ${weddingCorrect}/${weddings?.length || 0}개 정확\n`);

  // 4. 베이비/육아 행사 Industry 확인
  console.log('4️⃣  베이비/육아 행사 Industry 확인:');
  const { data: babies } = await supabase
    .from('events')
    .select('title, category, industry')
    .or('title.ilike.%베이비%,title.ilike.%유아%')
    .gte('last_crawled_at', `${today}T00:00:00`)
    .limit(5);
  
  let babyCorrect = 0;
  let babyWrong = 0;
  babies?.forEach(event => {
    const catStatus = event.category === '전시' ? '✅' : '❌';
    const indStatus = event.industry === '임신/출산/육아' ? '✅' : '❌';
    if (event.category === '전시' && event.industry === '임신/출산/육아') babyCorrect++;
    else babyWrong++;
    console.log(`${catStatus}${indStatus} ${event.title}`);
    console.log(`   Category: ${event.category}, Industry: ${event.industry}`);
  });
  console.log(`결과: ${babyCorrect}/${babies?.length || 0}개 정확\n`);

  // 5. 전체 통계
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  전체 통계');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const totalCorrect = fairCorrect + confCorrect + weddingCorrect + babyCorrect;
  const totalChecked = (fairs?.length || 0) + (conferences?.length || 0) + (weddings?.length || 0) + (babies?.length || 0);
  const accuracy = totalChecked > 0 ? ((totalCorrect / totalChecked) * 100).toFixed(1) : 0;
  
  console.log(`✅ 정확: ${totalCorrect}개`);
  console.log(`❌ 오류: ${totalChecked - totalCorrect}개`);
  console.log(`📊 정확도: ${accuracy}%\n`);
}

finalVerification().catch(console.error);
