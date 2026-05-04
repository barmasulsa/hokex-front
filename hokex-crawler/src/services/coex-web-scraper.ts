/**
 * COEX 웹사이트 자동 크롤러
 * https://www.coex.co.kr/event/full-schedules/ 에서 행사 데이터 추출
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { NormalizedEventData } from '../types/event';

export interface CoexEventListItem {
  title: string;
  startDate: string;
  endDate: string;
  category?: string;
  detailUrl?: string;
}

export class CoexWebScraper {
  private baseUrl = 'https://www.coex.co.kr';
  private scheduleUrl = 'https://www.coex.co.kr/event/full-schedules/';

  /**
   * COEX 전체 일정 페이지에서 행사 목록 크롤링
   */
  async scrapeEventList(): Promise<CoexEventListItem[]> {
    try {
      console.log(`\n🔍 COEX 일정 페이지 크롤링 시작: ${this.scheduleUrl}\n`);

      const response = await axios.get(this.scheduleUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const events: CoexEventListItem[] = [];

      // COEX 일정 페이지의 행사 항목 찾기
      // 여러 가능한 선택자 시도
      const selectors = [
        '.event-item',
        '.schedule-item',
        '.exhibition-item',
        'tr[data-event]',
        'tbody tr',
        '.EventScheduleList-item',
        '.ScheduleItem'
      ];

      let foundItems = false;

      for (const selector of selectors) {
        const items = $(selector);
        
        if (items.length > 0) {
          console.log(`✅ 선택자 "${selector}"로 ${items.length}개 항목 발견\n`);
          foundItems = true;

          items.each((index, element) => {
            try {
              const $item = $(element);
              
              // 행사명 추출
              const title = this.extractText($item, [
                '.event-title',
                '.title',
                '.exhibition-name',
                'td:nth-child(1)',
                'td:first-child',
                '.EventScheduleList-title',
                'a'
              ]);

              // 날짜 추출
              const dateText = this.extractText($item, [
                '.event-date',
                '.date',
                '.period',
                'td:nth-child(2)',
                '.EventScheduleList-date'
              ]);

              // 카테고리 추출
              const category = this.extractText($item, [
                '.event-category',
                '.category',
                'td:nth-child(3)',
                '.EventScheduleList-category'
              ]);

              // 상세 페이지 링크 추출
              const detailPath = $item.find('a').first().attr('href');
              const detailUrl = detailPath ? this.toAbsoluteUrl(detailPath) : undefined;

              if (title && dateText) {
                const { startDate, endDate } = this.parseDateRange(dateText);
                
                if (startDate && endDate) {
                  events.push({
                    title: title.trim(),
                    startDate,
                    endDate,
                    category: category?.trim(),
                    detailUrl
                  });

                  console.log(`${index + 1}. ${title}`);
                  console.log(`   날짜: ${startDate} ~ ${endDate}`);
                  if (category) console.log(`   카테고리: ${category}`);
                  if (detailUrl) console.log(`   상세: ${detailUrl}`);
                  console.log();
                }
              }
            } catch (error) {
              console.warn(`항목 파싱 실패 (${index}):`, error);
            }
          });

          break; // 성공한 선택자를 찾으면 중단
        }
      }

      if (!foundItems) {
        console.warn('⚠️  행사 항목을 찾을 수 없습니다. 페이지 구조가 변경되었을 수 있습니다.');
        console.log('\n페이지 HTML 샘플:');
        console.log($('body').html()?.substring(0, 500));
      }

      console.log(`\n✅ 총 ${events.length}개 행사 발견\n`);
      return events;

    } catch (error) {
      console.error('❌ COEX 일정 페이지 크롤링 실패:', error);
      throw error;
    }
  }

  /**
   * 여러 선택자로 텍스트 추출 시도
   */
  private extractText($element: cheerio.Cheerio<any>, selectors: string[]): string | null {
    for (const selector of selectors) {
      const text = $element.find(selector).first().text().trim();
      if (text) return text;
    }
    
    // 선택자로 찾지 못하면 요소 자체의 텍스트 반환
    const directText = $element.text().trim();
    return directText || null;
  }

  /**
   * 날짜 범위 파싱
   * 예: "2026.05.01 ~ 2026.05.03", "2026-05-01(목) ~ 2026-05-03(토)"
   */
  private parseDateRange(dateText: string): { startDate: string | null; endDate: string | null } {
    try {
      // 날짜 패턴 매칭
      const patterns = [
        // 2026.05.01 ~ 2026.05.03
        /(\d{4})\.(\d{1,2})\.(\d{1,2})\s*~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})/,
        // 2026-05-01 ~ 2026-05-03
        /(\d{4})-(\d{1,2})-(\d{1,2})\s*~\s*(\d{4})-(\d{1,2})-(\d{1,2})/,
        // 2026.05.01(목) ~ 2026.05.03(토)
        /(\d{4})\.(\d{1,2})\.(\d{1,2})\([^)]+\)\s*~\s*(\d{4})\.(\d{1,2})\.(\d{1,2})\([^)]+\)/,
      ];

      for (const pattern of patterns) {
        const match = dateText.match(pattern);
        if (match) {
          const [, y1, m1, d1, y2, m2, d2] = match;
          const startDate = `${y1}-${m1.padStart(2, '0')}-${d1.padStart(2, '0')}`;
          const endDate = `${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`;
          return { startDate, endDate };
        }
      }

      // 단일 날짜 패턴
      const singlePattern = /(\d{4})[-.](\d{1,2})[-.](\d{1,2})/;
      const singleMatch = dateText.match(singlePattern);
      if (singleMatch) {
        const [, y, m, d] = singleMatch;
        const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        return { startDate: date, endDate: date };
      }

      console.warn(`날짜 파싱 실패: ${dateText}`);
      return { startDate: null, endDate: null };

    } catch (error) {
      console.error(`날짜 파싱 에러: ${dateText}`, error);
      return { startDate: null, endDate: null };
    }
  }

  /**
   * 상대 URL을 절대 URL로 변환
   */
  private toAbsoluteUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('//')) {
      return `https:${path}`;
    }
    if (path.startsWith('/')) {
      return `${this.baseUrl}${path}`;
    }
    return `${this.baseUrl}/${path}`;
  }

  /**
   * 행사 상세 정보 크롤링
   */
  async scrapeEventDetail(url: string): Promise<{
    description?: string;
    admissionFee?: string;
    exhibitItems?: string;
    exhibitProducts?: string;
    organizer?: string;
    contact?: string;
    operatingHours?: string;
    venueHall?: string;
    posterUrl?: string;
  }> {
    try {
      console.log(`   상세 페이지 크롤링: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 포스터 이미지
      const posterUrl = this.extractPoster($);

      // 상세 정보 추출
      const description = this.extractField($, '행사 소개', '행사소개', '소개');
      const admissionFee = this.extractField($, '입장료');
      const exhibitItems = this.extractField($, '전시품목', '행사품목'); // 전시품목
      const exhibitProducts = this.extractField($, '전시제품'); // 전시제품
      const organizer = this.extractField($, '주최');
      const supervisor = this.extractField($, '주관'); // 주관 추가
      const contact = this.extractField($, '담당자', '문의');
      const operatingHours = this.extractOperatingHours($);
      const venueHall = this.extractVenueHall($);

      return {
        description,
        admissionFee,
        exhibitItems,
        exhibitProducts,
        organizer,
        supervisor,
        contact,
        operatingHours,
        venueHall,
        posterUrl
      };

    } catch (error) {
      console.warn(`   상세 정보 크롤링 실패: ${error}`);
      return {};
    }
  }

  /**
   * 포스터 이미지 추출
   */
  private extractPoster($: cheerio.CheerioAPI): string | undefined {
    const strategies = [
      () => $('meta[property="og:image"]').attr('content'),
      () => $('.exhibition-image img').first().attr('src'),
      () => $('.event-poster img').first().attr('src'),
      () => $('.poster-image img').first().attr('src'),
      () => $('.main-image img').first().attr('src'),
    ];

    for (const strategy of strategies) {
      const url = strategy();
      if (url) {
        return this.toAbsoluteUrl(url);
      }
    }

    return undefined;
  }

  /**
   * 필드 추출
   */
  private extractField($: cheerio.CheerioAPI, ...labels: string[]): string | undefined {
    for (const label of labels) {
      // EventDetailBoxBodyTitle/EventDetailBoxBodyText 구조
      const titleElements = $('.EventDetailBoxBodyTitle').filter(function() {
        return $(this).text().trim() === label;
      });
      
      if (titleElements.length > 0) {
        const parent = titleElements.first().parent();
        const textElement = parent.find('.EventDetailBoxBodyText-txt').first();
        if (textElement.length > 0) {
          const value = textElement.text().trim();
          if (value && value !== label) {
            return value;
          }
        }
      }

      // dt/dd 구조
      const dtElement = $('dt').filter(function() {
        return $(this).text().trim().includes(label);
      });
      
      if (dtElement.length > 0) {
        const ddElement = dtElement.next('dd');
        if (ddElement.length > 0) {
          const value = ddElement.text().trim();
          if (value && value !== label) {
            return value;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * 운영 시간 추출
   */
  private extractOperatingHours($: cheerio.CheerioAPI): string | undefined {
    const titleElement = $('.SingleScheduleTitle').filter(function() {
      return $(this).text().trim().includes('관람 시간');
    }).first();
    
    if (titleElement.length > 0) {
      const parent = titleElement.parent();
      const timeItems: string[] = [];
      
      parent.find('.EventTimeItem').each((i, elem) => {
        const dt = $(elem).find('dt').text().trim();
        const dd = $(elem).find('dd').text().trim();
        if (dt && dd) {
          timeItems.push(`${dt}\n${dd}`);
        }
      });
      
      if (timeItems.length > 0) {
        return timeItems.join('\n');
      }
    }
    
    return undefined;
  }

  /**
   * 행사 장소 (홀) 추출
   */
  private extractVenueHall($: cheerio.CheerioAPI): string | undefined {
    const bodyText = $('body').text();
    
    const hallPatterns = [
      /Hall\s*[A-D]/gi,
      /홀\s*[A-D가-힣]/g,
      /전시장\s*[A-D가-힣]/g,
      /[1-4]홀/g,
    ];
    
    for (const pattern of hallPatterns) {
      const match = bodyText.match(pattern);
      if (match && match[0]) {
        return match[0].trim().replace(/Hall([A-D])/i, 'Hall $1');
      }
    }
    
    return undefined;
  }
}
