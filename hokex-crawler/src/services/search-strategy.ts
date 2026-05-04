/**
 * SearchStrategy - Search for events on COEX website
 * Since COEX search is JavaScript-based, this strategy uses the schedule page
 * with more aggressive fuzzy matching as a fallback
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface ScrapingResult {
  posterUrl: string | null;
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

export class SearchStrategy {
  private readonly COEX_SCHEDULE_URL = 'https://www.coex.co.kr/event/full-schedules/';

  /**
   * Search for event on COEX website and scrape poster
   * Uses aggressive fuzzy matching on schedule page as fallback
   */
  async scrape(event: EventIdentifier): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      posterUrl: null,
      attemptedStrategies: ['search'],
      errors: {}
    };

    try {
      // Since COEX search is JavaScript-based, we'll use the schedule page
      // with more aggressive matching
      const searchResults = await this.searchCoex(event.title);

      if (searchResults.length === 0) {
        result.errors.search = 'No search results found';
        return result;
      }

      // Select best match
      const bestMatch = this.selectBestMatch(event, searchResults);

      if (!bestMatch) {
        result.errors.search = 'No suitable match in search results';
        return result;
      }

      // Extract poster from the matched page
      const posterResult = await this.extractPosterFromPage(bestMatch.url);

      if (posterResult.posterUrl) {
        result.posterUrl = posterResult.posterUrl;
        result.successfulStrategy = 'search';
        console.log(`✅ Found poster via search: ${event.title}`);
      } else {
        result.errors.search = 'Poster not found on matched page';
      }

      return result;

    } catch (error: any) {
      result.errors.search = error.message || 'Unknown error';
      console.error(`❌ Search strategy failed for ${event.title}:`, error.message);
      return result;
    }
  }

  /**
   * Submit search query to COEX (uses schedule page with aggressive matching)
   * Returns list of matching results
   */
  private async searchCoex(_query: string): Promise<SearchResult[]> {
    try {
      // Fetch full year schedule
      const params = {
        search_keyword: '',
        search_type: '',
        search_start_date: '2026.01.01',
        search_end_date: '2026.12.31',
        search_dept: '33',
        list_type: 'LIST'
      };

      const response = await axios.get(this.COEX_SCHEDULE_URL, {
        params,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      // Parse all events from schedule page
      $('.BlogEventItem').each((_, elem) => {
        try {
          const title = $(elem).find('.BlogEventItemCont-tit').first().text().trim();
          const link = $(elem).find('a').first().attr('href') || '';
          const snippet = $(elem).find('.BlogEventItemCont-date').first().text().trim();

          if (title && link) {
            results.push({
              title: this.removeDuplicateText(title),
              url: link,
              snippet
            });
          }
        } catch (error) {
          // Skip invalid entries
        }
      });

      return results;

    } catch (error: any) {
      throw new Error(`Failed to search COEX: ${error.message}`);
    }
  }

  /**
   * Remove duplicate text that appears twice in a row
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
   * Select best matching result from search results
   * Uses title similarity and date matching
   */
  private selectBestMatch(
    event: EventIdentifier,
    results: SearchResult[]
  ): SearchResult | null {
    let bestMatch: SearchResult | null = null;
    let bestScore = 0;

    const normalizedTarget = this.normalizeTitle(event.title);

    for (const result of results) {
      const normalizedResult = this.normalizeTitle(result.title);
      const score = this.calculateSimilarity(normalizedTarget, normalizedResult);

      // More aggressive threshold for search (60% vs 70% for schedule)
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = result;
      }
    }

    return bestMatch;
  }

  /**
   * Extract poster from search result page
   */
  private async extractPosterFromPage(url: string): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      posterUrl: null,
      attemptedStrategies: [],
      errors: {}
    };

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Try multiple strategies to find poster
      const strategies = [
        () => $('meta[property="og:image"]').attr('content'),
        () => $('.exhibition-image img').first().attr('src'),
        () => $('.event-poster img').first().attr('src'),
        () => $('.poster-image img').first().attr('src'),
        () => $('.main-image img').first().attr('src'),
        () => $('#main-image').attr('src'),
        () => $('img[class*="poster"]').first().attr('src'),
        () => $('img[class*="main"]').first().attr('src'),
      ];

      for (const strategy of strategies) {
        const imageUrl = strategy();
        if (imageUrl && this.isValidImageUrl(imageUrl)) {
          result.posterUrl = this.toAbsoluteUrl(imageUrl, url);
          break;
        }
      }

      return result;

    } catch (error: any) {
      result.errors.extraction = error.message;
      return result;
    }
  }

  /**
   * Normalize title for matching
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()[\]{}]/g, '')
      .replace(/&amp;/g, '')
      .replace(/·/g, '')
      .replace(/\//g, '')
      .replace(/-/g, '')
      .replace(/,/g, '')
      .trim();
  }

  /**
   * Calculate similarity score between two titles
   */
  private calculateSimilarity(title1: string, title2: string): number {
    if (title1 === title2) return 1.0;

    if (title1.includes(title2) || title2.includes(title1)) {
      const shorter = Math.min(title1.length, title2.length);
      const longer = Math.max(title1.length, title2.length);
      return shorter / longer;
    }

    const chars1 = new Set(title1.split(''));
    const chars2 = new Set(title2.split(''));

    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
  }

  /**
   * Check if URL is a valid image URL
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
   * Convert relative URL to absolute URL
   */
  private toAbsoluteUrl(imageUrl: string, baseUrl: string): string {
    try {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      if (imageUrl.startsWith('//')) {
        const protocol = new URL(baseUrl).protocol;
        return `${protocol}${imageUrl}`;
      }

      if (imageUrl.startsWith('/')) {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}${imageUrl}`;
      }

      const url = new URL(baseUrl);
      const pathParts = url.pathname.split('/');
      pathParts.pop();
      return `${url.protocol}//${url.host}${pathParts.join('/')}/${imageUrl}`;

    } catch (error) {
      return imageUrl;
    }
  }
}
