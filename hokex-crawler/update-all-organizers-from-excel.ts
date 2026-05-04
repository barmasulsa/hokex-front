/**
 * Excel 파일에서 모든 행사의 주최/주관 정보 업데이트
 */

import * as fs from 'fs';
import { ExcelDownloader } from './src/services/excel-downloader';
import { ExcelParser } from './src/core/excel-parser';
import { SupabaseService } from './src/services/supabase';

async function updateAllOrganizersFromExcel() {
  console.log('=== Excel 파일에서 주최/주관 정보 업데이트 ===\n');

  const downloader = new ExcelDownloader();
  const excelParser = new ExcelParser();
  const supabase = new SupabaseService();

  try {
    // 1단계: 전체 기간 Excel 파일 다운로드 (2026.01.01 ~ 2026.12.31)
    console.log('📥 Excel 파일 다운로드 중...\n');
    const filePath = await downloader.downloadCoexSchedule('2026.01.01', '2026.12.31');
    console.log(`✅ 파일 다운로드 완료: ${filePath}\n`);

    // 2단계: Excel 파일 파싱
    console.log('📄 Excel 파일 파싱 중...\n');
    const fileBuffer = fs.readFileSync(filePath);
    
    const parseOptions = {
      columnMapping: {
        title: '행사명',
        startDate: '행사 시작일자',
        endDate: '행사 종료일자',
        category: '행사구분',
        industry: '행사분야',
        organizer: '주최',
        supervisor: '주관',
        admissionFee: '입장료',
        contact: '담당자/공연문의 정보',
        targetLink: '관련 사이트'
      },
      fileFormat: 'xls' as const
    };

    const rawEvents = excelParser.parseExcelFile(fileBuffer, parseOptions);
    console.log(`✅ ${rawEvents.length}개 행사 데이터 추출 완료\n`);

    // 3단계: 데이터베이스의 행사와 매칭하여 업데이트
    console.log('🔄 데이터베이스 업데이트 중...\n');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let noChangeCount = 0;

    for (let i = 0; i < rawEvents.length; i++) {
      const excelEvent = rawEvents[i];
      
      console.log(`\n[${i + 1}/${rawEvents.length}] ${excelEvent.title}`);
      console.log(`  Excel 주최: ${excelEvent.organizer || '없음'}`);
      console.log(`  Excel 주관: ${excelEvent.supervisor || '없음'}`);

      // 데이터베이스에서 행사 찾기 (제목과 시작일로 매칭)
      const { data: dbEvents, error: searchError } = await (supabase as any).client
        .from('events')
        .select('*')
        .eq('title', excelEvent.title)
        .eq('venue', '코엑스');

      if (searchError) {
        console.log(`  ❌ 검색 실패: ${searchError.message}`);
        continue;
      }

      if (!dbEvents || dbEvents.length === 0) {
        console.log(`  ⚠️  데이터베이스에 없음`);
        notFoundCount++;
        continue;
      }

      // 첫 번째 매칭 결과 사용
      const dbEvent = dbEvents[0];
      
      console.log(`  DB 주최: ${dbEvent.organizer || '없음'}`);
      console.log(`  DB 주관: ${dbEvent.supervisor || '없음'}`);

      // 변경사항 확인
      const needsUpdate = 
        (excelEvent.organizer && excelEvent.organizer !== dbEvent.organizer) ||
        (excelEvent.supervisor && excelEvent.supervisor !== dbEvent.supervisor);

      if (!needsUpdate) {
        console.log(`  ✓ 변경 없음`);
        noChangeCount++;
        continue;
      }

      // 업데이트 실행
      const updateData: any = {};
      if (excelEvent.organizer) updateData.organizer = excelEvent.organizer;
      if (excelEvent.supervisor) updateData.supervisor = excelEvent.supervisor;

      const { error: updateError } = await (supabase as any).client
        .from('events')
        .update(updateData)
        .eq('id', dbEvent.id);

      if (updateError) {
        console.log(`  ❌ 업데이트 실패: ${updateError.message}`);
      } else {
        console.log(`  ✅ 업데이트 완료`);
        updatedCount++;
      }
    }

    console.log(`\n\n📊 업데이트 결과:`);
    console.log(`  업데이트: ${updatedCount}개`);
    console.log(`  변경없음: ${noChangeCount}개`);
    console.log(`  DB에 없음: ${notFoundCount}개`);
    console.log(`  전체: ${rawEvents.length}개\n`);

  } catch (error) {
    console.error('❌ 업데이트 실패:', error);
    process.exit(1);
  }
}

updateAllOrganizersFromExcel();
