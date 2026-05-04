/**
 * COEX 페이지가 404인 이벤트들의 venue_hall을 Excel 데이터로 업데이트
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { ExcelDownloader } from './src/services/excel-downloader';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

/**
 * 제목 정규화 (매칭용)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')  // 공백 제거
    .replace(/[()]/g, '')  // 괄호 제거
    .replace(/·/g, '')     // 중점 제거
    .replace(/&amp;/g, '')  // &amp; 제거
    .replace(/제\d+회/g, '')  // "제N회" 제거
    .trim();
}

/**
 * venue_hall 정규화 (공백 추가)
 */
function normalizeVenueHall(venueHall: string): string {
  let normalized = venueHall;
  
  // Hall + 알파벳/숫자 (예: HallA → Hall A, HallB1 → Hall B1)
  normalized = normalized
    .replace(/Hall\s*([A-D]\d*)/gi, 'Hall $1')
    // 홀 + 알파벳/숫자 (예: 홀A → 홀 A)
    .replace(/홀\s*([A-D가-힣]\d*)/g, '홀 $1')
    // 전시장 + 알파벳/숫자 (예: 전시장A → 전시장 A)
    .replace(/전시장\s*([A-D가-힣0-9]+)/g, '전시장 $1')
    // 컨퍼런스룸 + 알파벳/숫자 (예: 컨퍼런스룸E → 컨퍼런스룸 E)
    .replace(/컨퍼런스룸\s*([A-Z가-힣0-9]+)/gi, '컨퍼런스룸 $1')
    // Conference Room + 알파벳/숫자
    .replace(/Conference\s*Room\s*([A-Z]\d*)/gi, 'Conference Room $1');
  
  // 연속된 장소 패턴을 쉼표로 구분
  normalized = normalized
    .replace(/(Hall [A-D]\d*)Hall/gi, '$1, Hall')
    .replace(/(Hall [A-D]\d*)컨퍼런스룸/gi, '$1, 컨퍼런스룸')
    .replace(/(Hall [A-D]\d*)홀/gi, '$1, 홀')
    .replace(/(Hall [A-D]\d*)전시장/gi, '$1, 전시장')
    .replace(/(홀 [A-D가-힣]\d*)홀/g, '$1, 홀')
    .replace(/(홀 [A-D가-힣]\d*)Hall/gi, '$1, Hall')
    .replace(/(홀 [A-D가-힣]\d*)컨퍼런스룸/g, '$1, 컨퍼런스룸')
    .replace(/(전시장 [A-D가-힣0-9]+)전시장/g, '$1, 전시장')
    .replace(/(전시장 [A-D가-힣0-9]+)Hall/gi, '$1, Hall')
    .replace(/(전시장 [A-D가-힣0-9]+)컨퍼런스룸/g, '$1, 컨퍼런스룸')
    .replace(/(컨퍼런스룸 [A-Z가-힣0-9()]+)컨퍼런스룸/gi, '$1, 컨퍼런스룸')
    .replace(/(컨퍼런스룸 [A-Z가-힣0-9()]+)Hall/gi, '$1, Hall')
    .replace(/(컨퍼런스룸 [A-Z가-힣0-9()]+)홀/gi, '$1, 홀');
  
  // 중복 공백 및 쉼표 정리
  normalized = normalized
    .replace(/\s+/g, ' ')  // 중복 공백 제거
    .replace(/,\s*,/g, ',')  // 중복 쉼표 제거
    .replace(/,\s+/g, ', ')  // 쉼표 뒤 공백 정규화
    .trim();
  
  return normalized;
}

async function updateVenueHallFromExcel() {
  console.log('🔄 COEX 이벤트의 venue_hall을 Excel 데이터로 업데이트 시작\n');

  // 1. venue_hall이 없는 COEX 이벤트 가져오기
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, venue_hall, start_date, end_date')
    .eq('venue', '코엑스')
    .is('venue_hall', null);

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError);
    return;
  }

  if (!events || events.length === 0) {
    console.log('✅ venue_hall이 없는 COEX 이벤트가 없습니다.');
    return;
  }

  console.log(`📊 venue_hall이 없는 COEX 이벤트: ${events.length}개\n`);

  // 2. Excel 파일 다운로드
  console.log('📥 Excel 파일 다운로드 중...\n');
  const downloader = new ExcelDownloader();
  
  // 2026년 전체 데이터 다운로드
  const filePath = await downloader.downloadCoexSchedule('2026.01.01', '2026.12.31');
  
  console.log(`📄 파일 경로: ${filePath}\n`);
  
  // 3. Excel 파일 파싱
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Excel 데이터: ${excelData.length}개 행사\n`);
  
  // 4. Excel 데이터를 Map으로 변환 (정규화된 제목을 키로)
  const excelMap = new Map<string, any>();
  excelData.forEach((row: any) => {
    const title = row['행사명'];
    const venueHall = row['행사 장소'];
    if (title && venueHall) {
      const normalizedTitle = normalizeTitle(title);
      excelMap.set(normalizedTitle, {
        originalTitle: title,
        venueHall: venueHall
      });
    }
  });
  
  console.log(`📊 Excel Map: ${excelMap.size}개 행사 (행사 장소 있음)\n`);
  
  // 5. 이벤트와 Excel 데이터 매칭 및 업데이트
  let successCount = 0;
  let notFoundCount = 0;
  
  for (const event of events) {
    const normalizedTitle = normalizeTitle(event.title);
    const excelEntry = excelMap.get(normalizedTitle);
    
    if (excelEntry) {
      const normalizedVenueHall = normalizeVenueHall(excelEntry.venueHall);
      
      console.log(`\n✅ 매칭 성공: ${event.title}`);
      console.log(`   Excel 제목: ${excelEntry.originalTitle}`);
      console.log(`   Excel 행사 장소: ${excelEntry.venueHall}`);
      console.log(`   정규화된 venue_hall: ${normalizedVenueHall}`);
      
      // 데이터베이스 업데이트
      const { error: updateError } = await supabase
        .from('events')
        .update({ venue_hall: normalizedVenueHall })
        .eq('id', event.id);
      
      if (updateError) {
        console.error(`   ❌ 업데이트 실패:`, updateError);
      } else {
        console.log(`   ✅ 업데이트 성공`);
        successCount++;
      }
    } else {
      console.log(`\n❌ 매칭 실패: ${event.title}`);
      console.log(`   정규화된 제목: ${normalizedTitle}`);
      notFoundCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 6. 임시 파일 삭제
  fs.unlinkSync(filePath);
  console.log('\n✅ 임시 파일 삭제 완료');
  
  // 7. 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 결과:');
  console.log(`  ✅ 업데이트 성공: ${successCount}개`);
  console.log(`  ❌ 매칭 실패: ${notFoundCount}개`);
  console.log(`  📊 성공률: ${(successCount / events.length * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

updateVenueHallFromExcel()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  });
