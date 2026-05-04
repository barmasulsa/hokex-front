/**
 * Poster Image Scraper
 * 행사 웹사이트에서 포스터 이미지 URL 추출
 */

import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { ErrorCategory } from '../types/error-category';

export interface ScrapingResult {
  posterUrl: string | null;
  venueEventPageUrl?: string;  // 전시장 행사 소개 페이지 URL
  description?: string;
  admissionFee?: string;
  exhibitItems?: string;
  exhibitProducts?: string;
  organizer?: string;
  supervisor?: string;
  contact?: string;
  operatingHours?: string;
  venueHall?: string;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
}

export class PosterScraper {
  /**
   * COEX 행사 상세 페이지에서 포스터 및 상세 정보 추출
   * 
   * @param eventTitle - 행사명
   * @returns 포스터 이미지 URL 및 상세 정보 또는 null
   */
  async scrapeCoexEventPage(eventTitle: string): Promise<ScrapingResult> {
    try {
      // 행사명을 URL 슬러그로 변환
      const slug = this.titleToSlug(eventTitle);
      const coexUrl = `https://www.coex.co.kr/exhibitions/${slug}/`;
      
      console.log(`Trying COEX page: ${coexUrl}`);
      
      const response = await axios.get(coexUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 포스터 찾기
      const strategies = [
        () => $('meta[property="og:image"]').attr('content'),
        () => $('.exhibition-image img').first().attr('src'),
        () => $('.event-poster img').first().attr('src'),
        () => $('.poster-image img').first().attr('src'),
        () => $('.main-image img').first().attr('src'),
        () => $('#main-image').attr('src'),
      ];

      let posterUrl: string | null = null;
      for (const strategy of strategies) {
        const imageUrl = strategy();
        if (imageUrl) {
          const absoluteUrl = this.toAbsoluteUrl(imageUrl, coexUrl);
          if (this.isValidImageUrl(absoluteUrl)) {
            posterUrl = absoluteUrl;
            break;
          }
        }
      }

      // 상세 정보 추출
      const description = this.extractCoexField($, '행사 소개', '행사소개');
      const admissionFee = this.extractCoexField($, '입장료');
      const exhibitItems = this.extractCoexField($, '전시품목', '행사품목'); // 전시품목 (품목/내용)
      const exhibitProducts = this.extractCoexField($, '전시제품'); // 전시제품
      const organizer = this.extractCoexField($, '주최');
      const supervisor = this.extractCoexField($, '주관'); // 주관 (기관/단체)
      const rawContact = this.extractCoexField($, '담당자');
      const contact = rawContact ? this.formatContactField(rawContact) : undefined;  // 줄바꿈 포맷팅
      const operatingHours = this.extractCoexOperatingHours($);
      const venueHall = this.extractCoexVenueHall($);

      if (posterUrl) {
        console.log(`Found poster on COEX page: ${posterUrl}`);
      }

      return {
        posterUrl,
        venueEventPageUrl: coexUrl,  // COEX 행사 페이지 URL 저장
        description,
        admissionFee,
        exhibitItems,
        exhibitProducts,
        organizer,
        supervisor,
        contact,
        operatingHours,
        venueHall
      };
    } catch (error: any) {
      // Categorize errors for better tracking
      if (error instanceof AxiosError) {
        // Network timeout
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: 'Request timeout'
          };
        }
        
        // 404 Not Found
        if (error.response?.status === 404) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NOT_FOUND,
            errorMessage: 'Event page not found (404)'
          };
        }
        
        // 429 Rate Limit
        if (error.response?.status === 429) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.RATE_LIMIT_ERROR,
            errorMessage: 'Rate limited by server (429)'
          };
        }
        
        // Other network errors (connection refused, DNS, etc.)
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: `Network error: ${error.code}`
          };
        }
        
        // Other HTTP errors
        if (error.response) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: `HTTP ${error.response.status}: ${error.message}`
          };
        }
      }
      
      // Unknown errors
      return {
        posterUrl: null,
        errorCategory: ErrorCategory.UNKNOWN_ERROR,
        errorMessage: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * COEX 페이지에서 특정 필드 추출
   */
  private extractCoexField($: cheerio.CheerioAPI, ...labels: string[]): string | undefined {
    for (const label of labels) {
      // 방법 1: COEX 특정 구조 - EventDetailBoxBodyTitle/EventDetailBoxBodyText
      const titleElements = $('.EventDetailBoxBodyTitle').filter(function() {
        return $(this).text().trim() === label;
      });
      
      if (titleElements.length > 0) {
        // 같은 부모(.EventDetailBoxBody-item) 내에서 EventDetailBoxBodyText 찾기
        const parent = titleElements.first().parent();
        const textElement = parent.find('.EventDetailBoxBodyText-txt').first();
        if (textElement.length > 0) {
          const value = textElement.text().trim();
          if (value && value !== label) {
            return value;
          }
        }
      }

      // 방법 2: dt/dd 구조 찾기
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

      // 방법 3: th/td 구조 찾기 (테이블)
      const thElement = $('th').filter(function() {
        return $(this).text().trim().includes(label);
      });
      
      if (thElement.length > 0) {
        const tdElement = thElement.next('td');
        if (tdElement.length > 0) {
          const value = tdElement.text().trim();
          if (value && value !== label) {
            return value;
          }
        }
      }

      // 방법 4: 메타 태그에서 추출 (행사 소개의 경우)
      if (label.includes('소개')) {
        const ogDescription = $('meta[property="og:description"]').attr('content');
        if (ogDescription && ogDescription.length > 20) {
          return ogDescription.trim();
        }

        const metaDescription = $('meta[name="description"]').attr('content');
        if (metaDescription && metaDescription.length > 20) {
          return metaDescription.trim();
        }
      }
    }
    return undefined;
  }

  /**
   * Contact 필드 포맷팅
   * "이름 Email: email@example.com Tel: 02-1234-5678" 형식을
   * "이름\nEmail: email@example.com\nTel: 02-1234-5678" 형식으로 변환
   */
  private formatContactField(contact: string): string {
    // "담당자:" 다음에 오는 이름과 나머지를 분리
    const contactMatch = contact.match(/^(.+?)\s+(Email:|Tel:|Fax:)/i);
    if (contactMatch) {
      const name = contactMatch[1].trim();
      const rest = contact.substring(contactMatch[1].length).trim();
      
      // 이름을 첫 줄에, 나머지를 각각 새 줄에
      return name + '\n' + rest
        .replace(/\s+(Email:)/g, '\n$1')
        .replace(/\s+(Tel:)/g, '\n$1')
        .replace(/\s+(Fax:)/g, '\n$1')
        .trim();
    }
    
    // 패턴이 없으면 기존 방식 사용
    return contact
      .replace(/\s+(Email:)/g, '\n$1')
      .replace(/\s+(Tel:)/g, '\n$1')
      .replace(/\s+(Fax:)/g, '\n$1')
      .trim();
  }

  /**
   * COEX 페이지에서 관람 시간 추출
   */
  private extractCoexOperatingHours($: cheerio.CheerioAPI): string | undefined {
    // SingleScheduleTitle로 "관람 시간" 찾기
    const titleElement = $('.SingleScheduleTitle').filter(function() {
      return $(this).text().trim().includes('관람 시간');
    }).first();
    
    if (titleElement.length > 0) {
      // 같은 부모(.SingleSchedule-item) 내에서 dt/dd 찾기
      const parent = titleElement.parent();
      const timeItems: string[] = [];
      
      parent.find('.EventTimeItem').each((_, elem) => {
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
   * COEX 페이지에서 행사 장소 (홀 정보) 추출
   * COEX 페이지 구조에서 "관람 장소" 레이블의 값을 그대로 가져온 후 정규화
   */
  private extractCoexVenueHall($: cheerio.CheerioAPI): string | undefined {
    let venueHall: string | undefined;
    
    // 방법 1: SingleScheduleTitle 구조 (가장 일반적)
    const scheduleTitle = $('.SingleScheduleTitle').filter(function() {
      return $(this).text().trim() === '관람 장소';
    }).first();
    
    if (scheduleTitle.length > 0) {
      // 다음 div 요소에서 장소 정보 추출
      const nextDiv = scheduleTitle.next('div');
      if (nextDiv.length > 0) {
        const venueText = nextDiv.text().trim();
        // "주차정보" 같은 불필요한 텍스트 제거
        const lines = venueText.split('\n').map(line => line.trim()).filter(line => line && !line.includes('주차'));
        if (lines.length > 0) {
          venueHall = lines[0]; // 첫 번째 줄만 반환 (장소 정보)
        }
      }
    }
    
    // 방법 2: COEX EventDetailBoxBodyTitle 구조
    if (!venueHall) {
      const labels = ['관람 장소', '장소', '전시장', '개최장소'];
      
      for (const label of labels) {
        const titleElements = $('.EventDetailBoxBodyTitle').filter(function() {
          return $(this).text().trim() === label;
        });
        
        if (titleElements.length > 0) {
          const parent = titleElements.first().parent();
          const textElement = parent.find('.EventDetailBoxBodyText-txt').first();
          if (textElement.length > 0) {
            const value = textElement.text().trim();
            if (value && value !== label) {
              venueHall = value;
              break;
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
              venueHall = value;
              break;
            }
          }
        }

        // th/td 구조 (테이블)
        const thElement = $('th').filter(function() {
          return $(this).text().trim().includes(label);
        });
        
        if (thElement.length > 0) {
          const tdElement = thElement.next('td');
          if (tdElement.length > 0) {
            const value = tdElement.text().trim();
            if (value && value !== label) {
              venueHall = value;
              break;
            }
          }
        }
      }
    }
    
    // 정규화: Hall과 번호 사이에 공백 추가
    if (venueHall) {
      venueHall = this.normalizeVenueHall(venueHall);
    }
    
    return venueHall;
  }

  /**
   * venue_hall 텍스트 정규화
   * "HallA" → "Hall A", "HallB1" → "Hall B1", "컨퍼런스룸E" → "컨퍼런스룸 E"
   * "HallAHall B1" → "Hall A, Hall B1"
   * "Hall B컨퍼런스룸 E" → "Hall B, 컨퍼런스룸 E"
   */
  private normalizeVenueHall(venueHall: string): string {
    let normalized = venueHall;
    
    // 1단계: Hall/홀/전시장/컨퍼런스룸 뒤에 공백 추가
    normalized = normalized
      // Hall + 알파벳/숫자 (예: HallA → Hall A, HallB1 → Hall B1)
      .replace(/Hall\s*([A-D]\d*)/gi, 'Hall $1')
      // 홀 + 알파벳/숫자 (예: 홀A → 홀 A)
      .replace(/홀\s*([A-D가-힣]\d*)/g, '홀 $1')
      // 전시장 + 알파벳/숫자 (예: 전시장A → 전시장 A)
      .replace(/전시장\s*([A-D가-힣0-9]+)/g, '전시장 $1')
      // 컨퍼런스룸 + 알파벳/숫자 (예: 컨퍼런스룸E → 컨퍼런스룸 E)
      .replace(/컨퍼런스룸\s*([A-Z가-힣0-9]+)/gi, '컨퍼런스룸 $1')
      // Conference Room + 알파벳/숫자
      .replace(/Conference\s*Room\s*([A-Z]\d*)/gi, 'Conference Room $1');
    
    // 2단계: 연속된 장소 패턴을 쉼표로 구분
    // "Hall AHall B" → "Hall A, Hall B"
    // "Hall B컨퍼런스룸 E" → "Hall B, 컨퍼런스룸 E"
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
    
    // 3단계: 중복 공백 및 쉼표 정리
    normalized = normalized
      .replace(/\s+/g, ' ')  // 중복 공백 제거
      .replace(/,\s*,/g, ',')  // 중복 쉼표 제거
      .replace(/,\s+/g, ', ')  // 쉼표 뒤 공백 정규화
      .trim();
    
    return normalized;
  }

  /**
   * 행사명을 URL 슬러그로 변환
   * 예: "바이오코리아 2026" -> "바이오코리아-2026"
   */
  private titleToSlug(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, '-')  // 공백을 하이픈으로
      .replace(/[()]/g, '')  // 괄호 제거
      .replace(/&amp;/g, '')  // &amp; 제거
      .replace(/·/g, '-')    // 중점을 하이픈으로
      .replace(/\//g, '-')   // 슬래시를 하이픈으로
      .replace(/-+/g, '-')   // 연속된 하이픈을 하나로
      .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
  }
  /**
   * 웹페이지에서 포스터 이미지 URL 추출
   * COEX 행사인 경우 COEX 상세 페이지도 시도
   * 
   * @param url - 행사 웹사이트 URL
   * @param eventTitle - 행사명 (COEX 페이지 크롤링용)
   * @param venueCode - 전시장 코드 (COEX인지 확인용)
   * @returns 포스터 이미지 URL 및 상세 정보
   */
  async scrapePostUrl(url: string, eventTitle?: string, venueCode?: string): Promise<ScrapingResult> {
    // COEX 행사인 경우 COEX 상세 페이지 먼저 시도
    if (venueCode === 'COEX' && eventTitle) {
      const coexData = await this.scrapeCoexEventPage(eventTitle);
      if (coexData.posterUrl) {
        return coexData;
      }
    }

    // 원래 URL에서 크롤링 시도
    try {
      console.log(`Scraping poster from: ${url}`);

      // URL 유효성 검사
      if (!url || !url.startsWith('http')) {
        console.warn(`Invalid URL: ${url}`);
        return {
          posterUrl: null,
          errorCategory: ErrorCategory.INVALID_URL,
          errorMessage: 'Invalid or malformed URL'
        };
      }

      // 웹페이지 가져오기
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false // SSL 인증서 검증 우회
        })
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 포스터 이미지 찾기 전략
      const strategies = [
        // 1. og:image 메타 태그
        () => $('meta[property="og:image"]').attr('content'),
        
        // 2. twitter:image 메타 태그
        () => $('meta[name="twitter:image"]').attr('content'),
        
        // 3. 포스터 관련 클래스명을 가진 이미지
        () => $('img[class*="poster"]').first().attr('src'),
        () => $('img[class*="thumbnail"]').first().attr('src'),
        () => $('img[class*="main"]').first().attr('src'),
        
        // 4. 포스터 관련 ID를 가진 이미지
        () => $('img[id*="poster"]').first().attr('src'),
        () => $('img[id*="main"]').first().attr('src'),
        
        // 5. 가장 큰 이미지 찾기
        () => this.findLargestImage($),
      ];

      // 각 전략 시도
      let posterUrl: string | null = null;
      for (const strategy of strategies) {
        const imageUrl = strategy();
        if (imageUrl) {
          // 상대 URL을 절대 URL로 변환
          const absoluteUrl = this.toAbsoluteUrl(imageUrl, url);
          if (this.isValidImageUrl(absoluteUrl)) {
            posterUrl = absoluteUrl;
            console.log(`Found poster: ${absoluteUrl}`);
            break;
          }
        }
      }

      // Description 추출 (행사 자체 홈페이지에서)
      const description = this.extractDescription($);

      if (!posterUrl) {
        console.warn(`No poster found for: ${url}`);
      }

      return { posterUrl, description };

    } catch (error: any) {
      console.error(`Failed to scrape poster from ${url}:`, error);
      
      // Categorize errors for better tracking
      if (error instanceof AxiosError) {
        // Network timeout
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: 'Request timeout'
          };
        }
        
        // 404 Not Found
        if (error.response?.status === 404) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NOT_FOUND,
            errorMessage: 'Event page not found (404)'
          };
        }
        
        // 429 Rate Limit
        if (error.response?.status === 429) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.RATE_LIMIT_ERROR,
            errorMessage: 'Rate limited by server (429)'
          };
        }
        
        // Other network errors (connection refused, DNS, etc.)
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: `Network error: ${error.code}`
          };
        }
        
        // Other HTTP errors
        if (error.response) {
          return {
            posterUrl: null,
            errorCategory: ErrorCategory.NETWORK_ERROR,
            errorMessage: `HTTP ${error.response.status}: ${error.message}`
          };
        }
      }
      
      // Unknown errors
      return {
        posterUrl: null,
        errorCategory: ErrorCategory.UNKNOWN_ERROR,
        errorMessage: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 웹페이지에서 행사 소개/설명 추출
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // 1. 메타 태그에서 추출
    const ogDescription = $('meta[property="og:description"]').attr('content');
    if (ogDescription && ogDescription.length > 20) {
      return ogDescription.trim();
    }

    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription && metaDescription.length > 20) {
      return metaDescription.trim();
    }

    // 2. 일반적인 소개 섹션 키워드로 찾기
    const keywords = [
      '행사 소개', '행사소개', '전시회 소개', '전시회소개',
      '박람회 소개', '박람회소개', '학회 소개', '학회소개',
      '시상식 소개', '시상식소개', '대회 소개', '대회소개',
      'About', 'Introduction', 'Overview', '개요', '소개'
    ];

    for (const keyword of keywords) {
      // 제목으로 찾기
      const headings = $('h1, h2, h3, h4, h5, h6').filter(function() {
        return $(this).text().trim().includes(keyword);
      });

      if (headings.length > 0) {
        // 제목 다음의 텍스트 추출
        const heading = headings.first();
        let description = '';

        // 다음 형제 요소들에서 텍스트 추출
        let next = heading.next();
        let attempts = 0;
        while (next.length > 0 && attempts < 5) {
          const text = next.text().trim();
          if (text && text.length > 20 && !text.includes(keyword)) {
            description += text + ' ';
            if (description.length > 100) break;
          }
          next = next.next();
          attempts++;
        }

        if (description.trim().length > 20) {
          return description.trim().substring(0, 500); // 최대 500자
        }
      }

      // 클래스명이나 ID로 찾기
      const sections = $(`[class*="${keyword}"], [id*="${keyword}"]`);
      if (sections.length > 0) {
        const text = sections.first().text().trim();
        if (text.length > 20) {
          return text.substring(0, 500);
        }
      }
    }

    // 3. 본문에서 첫 번째 긴 문단 추출
    const paragraphs = $('p').filter(function() {
      const text = $(this).text().trim();
      return text.length > 50 && text.length < 1000;
    });

    if (paragraphs.length > 0) {
      const text = paragraphs.first().text().trim();
      return text.substring(0, 500);
    }

    return undefined;
  }

  /**
   * 가장 큰 이미지 찾기
   */
  private findLargestImage($: cheerio.CheerioAPI): string | null {
    let largestImg: string | null = null;
    let maxSize = 0;

    $('img').each((_, elem) => {
      const width = parseInt($(elem).attr('width') || '0');
      const height = parseInt($(elem).attr('height') || '0');
      const size = width * height;

      if (size > maxSize) {
        maxSize = size;
        largestImg = $(elem).attr('src') || null;
      }
    });

    return largestImg;
  }

  /**
   * 상대 URL을 절대 URL로 변환
   */
  private toAbsoluteUrl(imageUrl: string, baseUrl: string): string {
    try {
      // 이미 절대 URL인 경우
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // 프로토콜 상대 URL (//example.com/image.jpg)
      if (imageUrl.startsWith('//')) {
        const protocol = new URL(baseUrl).protocol;
        return `${protocol}${imageUrl}`;
      }

      // 절대 경로 (/image.jpg)
      if (imageUrl.startsWith('/')) {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}${imageUrl}`;
      }

      // 상대 경로 (image.jpg)
      const url = new URL(baseUrl);
      const pathParts = url.pathname.split('/');
      pathParts.pop(); // 마지막 부분 제거
      return `${url.protocol}//${url.host}${pathParts.join('/')}/${imageUrl}`;

    } catch (error) {
      console.error(`Failed to convert to absolute URL: ${imageUrl}`, error);
      return imageUrl;
    }
  }

  /**
   * 유효한 이미지 URL인지 확인
   */
  private isValidImageUrl(url: string): boolean {
    if (!url) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerUrl = url.toLowerCase();
    
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('image') ||
           lowerUrl.includes('img');
  }

  /**
   * 여러 URL에서 포스터 일괄 스크래핑
   */
  async scrapeMultiple(urls: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    for (const url of urls) {
      const result = await this.scrapePostUrl(url);
      results.set(url, result.posterUrl);
      
      // 서버 부하 방지를 위한 딜레이
      await this.delay(1000);
    }

    return results;
  }

  /**
   * 딜레이 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
