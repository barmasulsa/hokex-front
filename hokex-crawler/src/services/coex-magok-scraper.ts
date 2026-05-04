/**
 * COEX Magok 웹사이트 자동 크롤러
 * https://coexmagok.co.kr/event-schedule/list/ 에서 행사 데이터 추출
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CoexMagokEventListItem {
  title: string;
  startDate: string;
  endDate: string;
  category?: string;
  venueHall?: string;
  detailUrl?: string;
}

export class CoexMagokScraper {
  private baseUrl = 'https://coexmagok.co.kr';
  private scheduleUrl = 'https://coexmagok.co.kr/event-schedule/list/';

  /**
   * COEX Magok 전체 일정 페이지에서 행사 목록 크롤링
   */
  async scrapeEventList(): Promise<CoexMagokEventListItem[]> {
    try {
      console.log(`\n🔍 COEX Magok 일정 페이지 크롤링 시작: ${this.scheduleUrl}\n`);

      const response = await axios.get(this.scheduleUrl, {
        params: {
          search_start_date: '2026.01.01',
          search_end_date: '2026.12.31',
          list_type: 'LIST'
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const events: CoexMagokEventListItem[] = [];

      // 행사 항목 찾기
      $('li .BlogEventItem').each((index, element) => {
        try {
          const $item = $(element);
          
          // 전체 텍스트 추출
          const fullText = $item.text().trim();
          
          // 카테고리 추출 (Exhibition, Convention, Event)
          const categoryMatch = fullText.match(/(Exhibition|Convention|Event)/);
          const category = categoryMatch ? categoryMatch[1] : undefined;
          
          // 행사명 추출 - 카테고리 다음 줄
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
          let title = '';
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/Exhibition|Convention|Event/) && i + 1 < lines.length) {
              // 다음 줄이 날짜가 아니면 행사명
              if (!lines[i + 1].match(/\d{4}\.\d{2}\.\d{2}/)) {
                title = lines[i + 1];
                break;
              }
            }
          }
          
          // 날짜 파싱: "2026.01.10 - 2026.01.11"
          const dateMatch = fullText.match(/(\d{4})\.(\d{2})\.(\d{2})\s*-\s*(\d{4})\.(\d{2})\.(\d{2})/);
          
          // 장소 파싱: "1F 전시장", "B2 스퀘어볼룸" 등
          const venueMatch = fullText.match(/(\d+F|B\d+)\s+([^\n]+)/);
          
          if (title && dateMatch) {
            const startDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
            const endDate = `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`;
            const venueHall = venueMatch ? `${venueMatch[1]} ${venueMatch[2].trim()}` : '1F 전시장';

            events.push({
              title: title.trim(),
              startDate,
              endDate,
              category: category || 'Exhibition',
              venueHall,
              detailUrl: $item.find('a').attr('href') || undefined
            });

            console.log(`${events.length}. ${title}`);
            console.log(`   날짜: ${startDate} ~ ${endDate}`);
            if (category) console.log(`   카테고리: ${category}`);
            if (venueHall) console.log(`   장소: ${venueHall}`);
            console.log();
          }
        } catch (error) {
          console.warn(`항목 파싱 실패 (${index}):`, error);
        }
      });

      console.log(`\n✅ 총 ${events.length}개 행사 발견\n`);
      return events;

    } catch (error) {
      console.error('❌ COEX Magok 일정 페이지 크롤링 실패:', error);
      throw error;
    }
  }
}
