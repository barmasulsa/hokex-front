/**
 * 2026년 1월~4월 코엑스 행사 크롤링 (엑셀 다운로드 방식)
 */

import * as fs from 'fs';
import { ExcelDownloader } from './src/services/excel-downloader';
import { ExcelParser } from './src/core/excel-parser';
import { DataNormalizer } from './src/core/normalizer';
import { DataValidator } from './src/core/validator';
import { SupabaseService } from './src/services/supabase';
import { PosterScraper } from './src/services/poster-scraper';
import { NormalizedEventData } from './src/types/event';

async function crawlJanApr2026() {
  console.log('=== 2026년 1월~4월 코엑스 행사 크롤링 시작 ===\n');

  const downloader = new ExcelDownloader();
  const excelParser = new ExcelParser();
  const normalizer = new DataNormalizer();
  const validator = new DataValidator();
  const supabase = new SupabaseService();
  const posterScraper = new PosterScraper();

  try {
    // 1단계: 엑셀 파일 다운로드 (2026.01.01 ~ 2026.04.30)
    console.log('📥 1월~4월 엑셀 파일 다운로드 중...\n');
    const filePath = await downloader.downloadCoexSchedule('2026.01.01', '2026.04.30');
    console.log(`✅ 파일 다운로드 완료: ${filePath}\n`);

    // 2단계: 엑셀 파일 파싱
    console.log('📄 엑셀 파일 파싱 중...\n');
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

    // 3단계: 데이터 정규화 및 검증
    console.log('🔍 데이터 정규화 및 검증 중...\n');
    const validEvents: NormalizedEventData[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawEvent of rawEvents) {
      try {
        const normalized = normalizer.normalize(rawEvent, 'COEX');
        const validationResult = validator.validate(normalized);
        
        if (validationResult.isValid) {
          validCount++;
          validEvents.push(normalized);
          console.log(`✅ ${normalized.title}`);
        } else {
          invalidCount++;
          console.log(`❌ ${rawEvent.title}`);
          validationResult.errors.forEach(err => {
            console.log(`   - ${err.message}`);
          });
        }
      } catch (error) {
        invalidCount++;
        console.log(`❌ ${rawEvent.title}`);
        console.log(`   - 에러: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`\n📈 검증 결과:`);
    console.log(`   유효: ${validCount}개`);
    console.log(`   무효: ${invalidCount}개`);
    console.log(`   전체: ${rawEvents.length}개\n`);

    // 4단계: 포스터 이미지 크롤링
    if (validEvents.length > 0) {
      console.log('🖼️  포스터 이미지 크롤링 중...\n');
      
      for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        
        if (event.targetLink) {
          console.log(`${i + 1}/${validEvents.length} ${event.title}`);
          const result = await posterScraper.scrapePostUrl(event.targetLink, event.title, 'COEX');
          
          // ⭐ 웹사이트 정보 우선 정책:
          // - 웹사이트에서 크롤링한 정보가 있으면 Excel 데이터를 덮어씁니다
          // - 웹사이트에 정보가 없으면 Excel 데이터를 그대로 유지합니다
          // - 이렇게 하면 웹사이트의 최신 정보를 항상 반영할 수 있습니다
          if (result.posterUrl) {
            event.posterUrl = result.posterUrl;
            console.log(`   ✅ 포스터: ${result.posterUrl.substring(0, 60)}...`);
          }
          if (result.description) event.description = result.description;
          if (result.admissionFee) event.admissionFee = result.admissionFee;
          if (result.exhibitItems) event.exhibitItems = result.exhibitItems;
          if (result.exhibitProducts) event.exhibitProducts = result.exhibitProducts;
          if (result.organizer) event.organizer = result.organizer;
          if (result.supervisor) event.supervisor = result.supervisor;
          if (result.contact) event.contact = result.contact;
          if (result.operatingHours) event.operatingHours = result.operatingHours;
          if (result.venueHall) event.venueHall = result.venueHall;
          
          if (!result.posterUrl) {
            console.log(`   ⚠️  포스터 없음`);
          }
        } else {
          console.log(`${i + 1}/${validEvents.length} ${event.title} - 관련 사이트 없음`);
        }
      }
      
      console.log(`\n✅ 포스터 크롤링 완료\n`);
    }

    // 5단계: Supabase에 저장
    if (validEvents.length > 0) {
      console.log('💾 Supabase에 저장 중...\n');
      const savedCount = await supabase.saveEvents(validEvents, 'COEX');
      
      console.log(`\n✅ ${savedCount}개 행사 저장 완료!\n`);
      
      // 월별 통계
      const byMonth: Record<string, number> = {};
      validEvents.forEach(event => {
        const month = event.startDate.slice(0, 7);
        byMonth[month] = (byMonth[month] || 0) + 1;
      });
      
      console.log('📊 월별 통계:');
      Object.entries(byMonth).sort().forEach(([month, count]) => {
        console.log(`   ${month}: ${count}개`);
      });
      
      // 파일 정리
      await downloader.cleanupOldFiles('Coex_Schedule_*.xls');
    } else {
      console.log('⚠️  저장할 유효한 데이터가 없습니다.\n');
    }

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
    process.exit(1);
  }
}

crawlJanApr2026();
