/**
 * FallbackMechanism - Orchestrates multiple scraping strategies
 * Attempts strategies in order: direct -> schedule -> search
 * Short-circuits on first success
 */

import { PosterScraper } from './poster-scraper';
import { ScheduleStrategy } from './schedule-strategy';
import { SearchStrategy } from './search-strategy';

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

export class FallbackMechanism {
  private directStrategy: PosterScraper;
  private scheduleStrategy: ScheduleStrategy;
  private searchStrategy: SearchStrategy;

  constructor() {
    this.directStrategy = new PosterScraper();
    this.scheduleStrategy = new ScheduleStrategy();
    this.searchStrategy = new SearchStrategy();
  }

  /**
   * Attempt to scrape poster using all available strategies
   * Returns on first success or after all strategies fail
   */
  async scrapeWithFallback(event: EventIdentifier): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      posterUrl: null,
      attemptedStrategies: [],
      errors: {}
    };

    console.log(`\n🔄 Scraping poster for: ${event.title}`);

    // Strategy 1: Direct event page (existing method)
    try {
      console.log('  1️⃣  Trying direct method...');
      result.attemptedStrategies.push('direct');

      let directResult;

      // If target_link exists, try that first
      if (event.targetLink) {
        console.log(`Trying target link: ${event.targetLink}`);
        directResult = await this.directStrategy.scrapePostUrl(event.targetLink, event.title, 'COEX');
      } else {
        // Otherwise try COEX event page
        directResult = await this.directStrategy.scrapeCoexEventPage(event.title);
      }

      if (directResult.posterUrl) {
        result.posterUrl = directResult.posterUrl;
        result.venueEventPageUrl = directResult.venueEventPageUrl;  // 전시장 행사 페이지 URL
        result.description = directResult.description;
        result.admissionFee = directResult.admissionFee;
        result.organizer = directResult.organizer;
        result.contact = directResult.contact;
        result.operatingHours = directResult.operatingHours;
        result.venueHall = directResult.venueHall;
        result.exhibitItems = directResult.exhibitItems;
        result.exhibitProducts = directResult.exhibitProducts;
        result.successfulStrategy = 'direct';

        console.log(`  ✅ Direct method succeeded`);
        return result;
      }

      // Capture error details from DirectStrategy
      if (directResult.errorCategory && directResult.errorMessage) {
        result.errors.direct = `[${directResult.errorCategory}] ${directResult.errorMessage}`;
      } else {
        result.errors.direct = 'Poster not found on direct page';
      }
      console.log(`  ❌ Direct method failed: ${result.errors.direct}`);

    } catch (error: any) {
      result.errors.direct = error.message || 'Unknown error';
      console.log(`  ❌ Direct method error: ${error.message}`);
    }

    // Strategy 2: Schedule page
    try {
      console.log('  2️⃣  Trying schedule page method...');
      result.attemptedStrategies.push('schedule');

      const scheduleResult = await this.scheduleStrategy.scrape(event);

      if (scheduleResult.posterUrl) {
        result.posterUrl = scheduleResult.posterUrl;
        result.venueEventPageUrl = scheduleResult.venueEventPageUrl;  // 전시장 행사 페이지 URL
        result.venueHall = scheduleResult.venueHall || result.venueHall;
        result.successfulStrategy = 'schedule';

        console.log(`  ✅ Schedule method succeeded`);
        return result;
      }

      result.errors.schedule = scheduleResult.errors.schedule || 'Poster not found on schedule page';
      console.log(`  ❌ Schedule method failed`);

    } catch (error: any) {
      result.errors.schedule = error.message || 'Unknown error';
      console.log(`  ❌ Schedule method error: ${error.message}`);
    }

    // Strategy 3: Search API
    try {
      console.log('  3️⃣  Trying search method...');
      result.attemptedStrategies.push('search');

      const searchResult = await this.searchStrategy.scrape(event);

      if (searchResult.posterUrl) {
        result.posterUrl = searchResult.posterUrl;
        result.venueEventPageUrl = searchResult.venueEventPageUrl;  // 전시장 행사 페이지 URL
        result.successfulStrategy = 'search';

        console.log(`  ✅ Search method succeeded`);
        return result;
      }

      result.errors.search = searchResult.errors.search || 'Poster not found via search';
      console.log(`  ❌ Search method failed`);

    } catch (error: any) {
      result.errors.search = error.message || 'Unknown error';
      console.log(`  ❌ Search method error: ${error.message}`);
    }

    // All strategies failed
    console.log(`  ❌ All strategies failed for: ${event.title}`);
    return result;
  }
}
