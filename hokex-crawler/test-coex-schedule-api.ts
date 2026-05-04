/**
 * COEX 일정 페이지 API 테스트
 * 기간 필터를 적용해서 1월~4월 행사 포스터 가져오기
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testCoexScheduleAPI() {
  console.log('=== COEX 일정 API 테스트 ===\n');

  try {
    // 방법 1: POST 요청으로 필터 적용 시도
    console.log('📥 방법 1: POST 요청 시도...\n');
    
    const postResponse = await axios.post('https://www.coex.co.kr/wp-admin/admin-ajax.php', 
      new URLSearchParams({
        action: 'get_exhibitions',
        start_date: '2026-01-01',
        end_date: '2026-04-30',
      }), 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.coex.co.kr/event/full-schedules/'
        },
        timeout: 30000
      }
    );

    console.log('응답 타입:', typeof postResponse.data);
    console.log('응답 길이:', JSON.stringify(postResponse.data).length);
    console.log('응답 샘플:', JSON.stringify(postResponse.data).substring(0, 200));

  } catch (error: any) {
    console.log('❌ POST 요청 실패:', error.message);
  }

  try {
    // 방법 2: GET 요청에 쿼리 파라미터 추가
    console.log('\n📥 방법 2: GET 요청 with 쿼리 파라미터...\n');
    
    const getResponse = await axios.get('https://www.coex.co.kr/event/full-schedules/', {
      params: {
        start_date: '2026-01-01',
        end_date: '2026-04-30',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(getResponse.data);
    const eventCount = $('.BlogEventItem').length;
    console.log(`발견된 행사 수: ${eventCount}개`);

    if (eventCount > 0) {
      console.log('\n처음 3개 행사:');
      $('.BlogEventItem').slice(0, 3).each((_, card) => {
        const title = $(card).find('.BlogEventItemCont-tit').first().text().trim();
        const date = $(card).find('.BlogEventItemCont-date').first().text().trim();
        console.log(`  - ${title}`);
        console.log(`    날짜: ${date}`);
      });
    }

  } catch (error: any) {
    console.log('❌ GET 요청 실패:', error.message);
  }

  try {
    // 방법 3: 다른 AJAX 액션 시도
    console.log('\n📥 방법 3: 다른 AJAX 액션 시도...\n');
    
    const actions = [
      'load_exhibitions',
      'filter_exhibitions', 
      'search_exhibitions',
      'get_schedule',
    ];

    for (const action of actions) {
      try {
        const response = await axios.post('https://www.coex.co.kr/wp-admin/admin-ajax.php',
          new URLSearchParams({
            action: action,
            start_date: '2026-01-01',
            end_date: '2026-04-30',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
          }
        );

        if (response.data && response.data !== '0' && response.data !== '') {
          console.log(`✅ ${action}: 응답 있음`);
          console.log(`   응답 샘플: ${JSON.stringify(response.data).substring(0, 100)}`);
        }
      } catch (error) {
        // 무시
      }
    }

  } catch (error: any) {
    console.log('❌ AJAX 액션 테스트 실패:', error.message);
  }
}

testCoexScheduleAPI();
