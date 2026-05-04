import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugSetecPage() {
  const response = await axios.get('https://www.setec.or.kr/front/schedule/list.do', {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = response.data;
  
  // HTML 저장
  fs.writeFileSync('setec-page.html', html);
  console.log('✅ HTML 저장 완료: setec-page.html');
  
  const $ = cheerio.load(html);
  
  // 다양한 셀렉터 시도
  console.log('\n=== 셀렉터 테스트 ===');
  console.log('li 개수:', $('li').length);
  console.log('.schedule_list 개수:', $('.schedule_list').length);
  console.log('.schedule_list li 개수:', $('.schedule_list li').length);
  console.log('strong 개수:', $('strong').length);
  
  // 첫 번째 li 내용 출력
  console.log('\n=== 첫 번째 li 내용 ===');
  const firstLi = $('li').first();
  console.log(firstLi.html());
}

debugSetecPage();
