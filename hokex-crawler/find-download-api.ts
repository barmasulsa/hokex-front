/**
 * COEX 다운로드 API 찾기
 * 브라우저로 페이지 접속해서 네트워크 요청 모니터링
 */

import puppeteer from 'puppeteer';

async function findDownloadApi() {
  console.log('🔍 COEX 다운로드 API 찾는 중...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const pages = await browser.pages();
    const page = pages[0];
    
    // 모든 네트워크 요청 모니터링
    const requests: any[] = [];
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      // Excel 파일 응답 감지
      if (
        contentType.includes('application/vnd.ms-excel') ||
        contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        url.includes('.xls') ||
        url.includes('.xlsx') ||
        url.includes('download') ||
        url.includes('excel')
      ) {
        console.log('\n🎯 Excel 다운로드 API 발견!');
        console.log(`URL: ${url}`);
        console.log(`Method: ${response.request().method()}`);
        console.log(`Status: ${response.status()}`);
        console.log(`Content-Type: ${contentType}`);
        console.log(`Headers:`, response.headers());
        
        // 요청 정보 찾기
        const matchingRequest = requests.find(r => r.url === url);
        if (matchingRequest) {
          console.log(`\n📤 Request Details:`);
          console.log(`Method: ${matchingRequest.method}`);
          console.log(`Headers:`, matchingRequest.headers);
          if (matchingRequest.postData) {
            console.log(`POST Data:`, matchingRequest.postData);
          }
        }
      }
    });
    
    console.log('📱 브라우저 열림 - COEX 페이지로 이동 중...\n');
    
    await page.goto('https://www.coex.co.kr/event/full-schedules/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ 페이지 로드 완료');
    console.log('👆 이제 수동으로 "일정 다운로드" 버튼을 클릭해주세요!\n');
    console.log('⏳ API 호출을 감지하는 중... (60초 대기)\n');
    
    // 60초 대기 (사용자가 버튼 클릭할 시간)
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('\n📋 모든 요청 목록:');
    requests
      .filter(r => 
        r.url.includes('coex') && 
        (r.url.includes('download') || r.url.includes('excel') || r.url.includes('schedule'))
      )
      .forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.method} ${r.url}`);
      });
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ 에러:', error);
    await browser.close();
  }
}

findDownloadApi();
