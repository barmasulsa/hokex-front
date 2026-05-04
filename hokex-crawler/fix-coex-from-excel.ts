/**
 * 엑셀 파일에서 COEX 행사 정보 수정
 * - 주최사 이름과 전시품목 수정
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCoexFromExcel() {
  console.log('🔧 엑셀 파일에서 COEX 행사 정보 수정...\n');

  try {
    // 엑셀 파일 읽기
    const excelPath = 'coex_schedule_2026.xlsx';
    
    if (!fs.existsSync(excelPath)) {
      console.log('⚠️  엑셀 파일이 없습니다. 다운로드 중...');
      // 엑셀 다운로드 로직은 생략 (이미 파일이 있다고 가정)
      return;
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 엑셀 파일에서 ${data.length}개 행사 발견\n`);

    // 1. 코베 베이비페어 수정
    console.log('=== 1. 코베 베이비페어 수정 ===');
    const babyFairData = data.find((row: any) => 
      row['행사명'] && row['행사명'].includes('코베') && row['행사명'].includes('베이비')
    );

    if (babyFairData) {
      console.log(`엑셀 정보:`);
      console.log(`  행사명: ${(babyFairData as any)['행사명']}`);
      console.log(`  주최: ${(babyFairData as any)['주최']}`);
      console.log(`  전시품목: ${(babyFairData as any)['전시품목']}\n`);

      // 데이터베이스 업데이트
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('venue', '코엑스')
        .ilike('title', '%코베%베이비%');

      if (events && events.length > 0) {
        for (const event of events) {
          const { error } = await supabase
            .from('events')
            .update({
              organizer: (babyFairData as any)['주최'] || event.organizer,
              exhibit_items: (babyFairData as any)['전시품목'] || event.exhibit_items
            })
            .eq('id', event.id);

          if (error) {
            console.error(`  ❌ 업데이트 실패:`, error.message);
          } else {
            console.log(`  ✅ ${event.title} 업데이트 완료`);
          }
        }
      }
    } else {
      console.log('  ⚠️  엑셀에서 코베 베이비페어를 찾을 수 없습니다.\n');
    }

    // 2. 대한레이저피부모발학회 수정
    console.log('\n=== 2. 대한레이저피부모발학회 수정 ===');
    const laserFairData = data.find((row: any) => 
      row['행사명'] && row['행사명'].includes('레이저피부모발')
    );

    if (laserFairData) {
      console.log(`엑셀 정보:`);
      console.log(`  행사명: ${(laserFairData as any)['행사명']}`);
      console.log(`  주최: ${(laserFairData as any)['주최']}`);
      console.log(`  전시품목: ${(laserFairData as any)['전시품목']}\n`);

      // 데이터베이스 업데이트
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('venue', '코엑스')
        .ilike('title', '%레이저피부모발%')
        .single();

      if (event) {
        const { error } = await supabase
          .from('events')
          .update({
            organizer: (laserFairData as any)['주최'] || event.organizer,
            exhibit_items: (laserFairData as any)['전시품목'] || event.exhibit_items
          })
          .eq('id', event.id);

        if (error) {
          console.error(`  ❌ 업데이트 실패:`, error.message);
        } else {
          console.log(`  ✅ ${event.title} 업데이트 완료`);
        }
      }
    } else {
      console.log('  ⚠️  엑셀에서 대한레이저피부모발학회를 찾을 수 없습니다.\n');
    }

    console.log('\n✅ 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 실패:', error);
  }
}

fixCoexFromExcel();
