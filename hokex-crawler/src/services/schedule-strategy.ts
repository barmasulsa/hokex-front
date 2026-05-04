/**
 * ScheduleStrategy - Extract posters from COEX schedule page
 * Implements caching and fuzzy matching for event identification
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SchedulePageEvent {
  title: string;
  posterUrl: string;
  startDate?: string;
  endDate?: string;
  hall?: string;
}

export interface ScrapingResult {
  posterUrl: string | null;
  venueEventPageUrl?: string;  // 전시장 행사 소개 페이지 URL
  description?: string;
  admissionFee?: string;
  organizer?: string;
  contact?: string;
  operatingHours?: string;
  venueHall?: string;
  exhibitItems?: string;
  exhibitProducts?: string;
  successfulStrategy?: 'direct' | 'schedule' | 'search';
  attemptedStrategies: string[];
  errors: Record<string, string>;
}

export interface EventIdentifier {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  targetLink?: string;
}

export class ScheduleStrategy {
  private cachedScheduleData: Map<string, SchedulePageEvent> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly COEX_SCHEDULE_URL = 'https://www.coex.co.kr/event/full-schedules/';

  /**
   * Scrape poster from COEX schedule page
   * Uses cached schedule data if available and fresh
   */
  async scrape(event: EventIdentifier): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      posterUrl: null,
      attemptedStrategies: ['schedule'],
      errors: {}
    };

    try {
      // Fetch schedule page (with caching)
      const scheduleData = await this.fetchSchedulePage();

      // Find matching event
      const match = this.findMatchingEvent(event.title, scheduleData);

      if (!match) {
        result.errors.schedule = 'No matching event found in schedule page';
        return result;
      }

      // Extract venue hall if available
      if (match.hall) {
        result.venueHall = match.hall;
      }

      result.posterUrl = match.posterUrl;
      result.successfulStrategy = 'schedule';
      
      // Generate COEX event page URL
      const slug = this.titleToSlug(event.title);
      result.venueEventPageUrl = `https://www.coex.co.kr/exhibitions/${slug}/`;

      console.log(`✅ Found poster via schedule page: ${event.title}`);
      return result;

    } catch (error: any) {
      result.errors.schedule = error.message || 'Unknown error';
      console.error(`❌ Schedule strategy failed for ${event.title}:`, error.message);
      return result;
    }
  }

  /**
   * Convert event title to URL slug
   * Example: "바이오코리아 2026" -> "바이오코리아-2026"
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
   * Fetch and parse the COEX schedule page
   * Caches results for 1 hour to minimize requests
   * Fetches all pages if pagination exists
   */
  private async fetchSchedulePage(): Promise<Map<string, SchedulePageEvent>> {
    // Check if cache is still valid
    const now = Date.now();
    if (this.cachedScheduleData && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      console.log('📦 Using cached schedule data');
      return this.cachedScheduleData;
    }

    console.log('🔄 Fetching fresh schedule page...');

    try {
      const scheduleData = new Map<string, SchedulePageEvent>();
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        // Fetch full year schedule (2026-01-01 to 2026-12-31)
        // Remove search_dept to get ALL categories (not just dept 33 = medical/healthcare)
        const params = {
          search_keyword: '',
          search_type: '',
          search_start_date: '2026.01.01',
          search_end_date: '2026.12.31',
          search_dept: '', // Empty = all departments/categories
          list_type: 'LIST',
          var_page: currentPage.toString()
        };

        const response = await axios.get(this.COEX_SCHEDULE_URL, {
          params,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Parse event cards on this page
        let eventsOnPage = 0;
        $('.BlogEventItem').each((_, elem) => {
          try {
            // Extract poster URL
            const posterUrl = $(elem).find('img').first().attr('src');
            if (!posterUrl) return;

            // Extract title (handle duplicates in HTML)
            const titleText = $(elem).find('.BlogEventItemCont-tit').first().text().trim();
            // Remove duplicate text (e.g., "제416회 웨덱스 웨딩박람회제416회 웨덱스 웨딩박람회")
            const title = this.removeDuplicateText(titleText);

            // Extract dates
            const dateText = $(elem).find('.BlogEventItemCont-date').first().text().trim();
            const dateMatch = dateText.match(/(\d{4}\.\d{2}\.\d{2})\s*-\s*(\d{4}\.\d{2}\.\d{2})/);
            const startDate = dateMatch ? dateMatch[1] : undefined;
            const endDate = dateMatch ? dateMatch[2] : undefined;

            // Extract hall
            const hallText = $(elem).find('.BlogEventItemCont-place').first().text().trim();
            const hall = this.removeDuplicateText(hallText);

            const event: SchedulePageEvent = {
              title,
              posterUrl,
              startDate,
              endDate,
              hall
            };

            // Store with normalized title as key
            const normalizedTitle = this.normalizeTitle(title);
            scheduleData.set(normalizedTitle, event);
            eventsOnPage++;

          } catch (error) {
            console.warn('Failed to parse event card:', error);
          }
        });

        console.log(`   Page ${currentPage}: ${eventsOnPage} events`);

        // Check if there's a next page
        const nextPageLink = $('.PagingList-item.NextButton a').attr('href');
        const hasNextButton = nextPageLink && !nextPageLink.includes('javascript:void');

        if (hasNextButton && eventsOnPage > 0) {
          currentPage++;
          // Small delay between page requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          hasMorePages = false;
        }
      }

      console.log(`✅ Parsed ${scheduleData.size} events from ${currentPage} page(s)`);

      // Update cache
      this.cachedScheduleData = scheduleData;
      this.cacheTimestamp = now;

      return scheduleData;

    } catch (error: any) {
      throw new Error(`Failed to fetch schedule page: ${error.message}`);
    }
  }

  /**
   * Remove duplicate text that appears twice in a row
   * Example: "제416회 웨덱스 웨딩박람회제416회 웨덱스 웨딩박람회" -> "제416회 웨덱스 웨딩박람회"
   */
  private removeDuplicateText(text: string): string {
    const half = Math.floor(text.length / 2);
    const firstHalf = text.substring(0, half);
    const secondHalf = text.substring(half);

    if (firstHalf === secondHalf) {
      return firstHalf;
    }

    return text;
  }

  /**
   * Match event title with schedule page entries
   * Uses fuzzy matching to handle title variations
   */
  private findMatchingEvent(
    eventTitle: string,
    scheduleData: Map<string, SchedulePageEvent>
  ): SchedulePageEvent | null {
    const normalizedTarget = this.normalizeTitle(eventTitle);

    // Try exact match first
    if (scheduleData.has(normalizedTarget)) {
      return scheduleData.get(normalizedTarget)!;
    }

    // Try fuzzy matching
    let bestMatch: SchedulePageEvent | null = null;
    let bestScore = 0;

    for (const [normalizedTitle, event] of scheduleData.entries()) {
      const score = this.calculateSimilarity(normalizedTarget, normalizedTitle);

      if (score > bestScore && score > 0.7) { // 70% similarity threshold
        bestScore = score;
        bestMatch = event;
      }
    }

    return bestMatch;
  }

  /**
   * Normalize title for matching
   * Removes special characters, extra spaces, converts to lowercase
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/[()[\]{}]/g, '') // Remove brackets
      .replace(/&amp;/g, '') // Remove &amp;
      .replace(/·/g, '') // Remove middle dot
      .replace(/\//g, '') // Remove slashes
      .replace(/-/g, '') // Remove hyphens
      .replace(/,/g, '') // Remove commas
      .trim();
  }

  /**
   * Calculate similarity score between two titles
   * Returns value between 0 and 1
   * Uses simple character-based similarity
   */
  private calculateSimilarity(title1: string, title2: string): number {
    if (title1 === title2) return 1.0;

    // Check if one contains the other
    if (title1.includes(title2) || title2.includes(title1)) {
      const shorter = Math.min(title1.length, title2.length);
      const longer = Math.max(title1.length, title2.length);
      return shorter / longer;
    }

    // Calculate character overlap
    const chars1 = new Set(title1.split(''));
    const chars2 = new Set(title2.split(''));

    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
  }
}
