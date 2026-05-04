/**
 * BatchProcessor - Manages batch processing with rate limiting
 * Processes events in batches of 10 with delays between requests
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FallbackMechanism, EventIdentifier, ScrapingResult } from './fallback-mechanism';

export interface BatchConfig {
  batchSize: number;
  delayBetweenRequests: [number, number]; // min, max in ms
  delayBetweenBatches: number; // ms
  maxRetries: number;
  retryBackoffMultiplier: number;
}

export interface ProcessingStats {
  totalEvents: number;
  processedEvents: number;
  successfulScrapes: number;
  failedScrapes: number;
  successRate: number;
  strategyStats: Record<string, number>;
  startTime: Date;
  endTime?: Date;
}

export class BatchProcessor {
  private config: BatchConfig = {
    batchSize: 10,
    delayBetweenRequests: [1000, 2000],
    delayBetweenBatches: 5000,
    maxRetries: 3,
    retryBackoffMultiplier: 2
  };

  private fallbackMechanism: FallbackMechanism;
  private database: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.fallbackMechanism = new FallbackMechanism();
    this.database = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Process events in batches with rate limiting
   */
  async processBatch(events: EventIdentifier[]): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      totalEvents: events.length,
      processedEvents: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      successRate: 0,
      strategyStats: {
        direct: 0,
        schedule: 0,
        search: 0
      },
      startTime: new Date()
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Batch Processing Started`);
    console.log(`  Total Events: ${events.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Divide into batches
    const batches: EventIdentifier[][] = [];
    for (let i = 0; i < events.length; i += this.config.batchSize) {
      batches.push(events.slice(i, i + this.config.batchSize));
    }

    console.log(`📦 Divided into ${batches.length} batches\n`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      console.log(`\n📦 Processing Batch ${batchIndex + 1}/${batches.length} (${batch.length} events)...`);

      for (const event of batch) {
        try {
          // Process event with retry logic
          const result = await this.processEvent(event);

          // Update database
          await this.updateDatabase(event.id, result);

          // Update stats
          stats.processedEvents++;
          if (result.posterUrl) {
            stats.successfulScrapes++;
            if (result.successfulStrategy) {
              stats.strategyStats[result.successfulStrategy]++;
            }
          } else {
            stats.failedScrapes++;
            // Log failure
            await this.logFailure(event, result);
          }

          // Display progress
          this.displayProgress(stats);

          // Delay between requests
          await this.randomDelay(
            this.config.delayBetweenRequests[0],
            this.config.delayBetweenRequests[1]
          );

        } catch (error: any) {
          console.error(`❌ Failed to process event ${event.title}:`, error.message);
          stats.processedEvents++;
          stats.failedScrapes++;
        }
      }

      // Delay between batches (except after last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`\n⏸️  Waiting ${this.config.delayBetweenBatches / 1000}s before next batch...`);
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    // Calculate final stats
    stats.endTime = new Date();
    stats.successRate = stats.totalEvents > 0
      ? (stats.successfulScrapes / stats.totalEvents) * 100
      : 0;

    this.displayFinalStats(stats);

    return stats;
  }

  /**
   * Process single event with retry logic
   */
  private async processEvent(
    event: EventIdentifier,
    retryCount: number = 0
  ): Promise<ScrapingResult> {
    try {
      const result = await this.fallbackMechanism.scrapeWithFallback(event);
      return result;
    } catch (error: any) {
      if (this.isRetryableError(error) && retryCount < this.config.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount);
        console.log(`  ⏳ Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        await this.delay(delay);
        return this.processEvent(event, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Update database with scraping result
   * Uses database function with transaction support to ensure data consistency
   * Falls back to direct update if function is not available
   * Requirements: 3.4, 3.5, 3.6
   * 
   * @param eventId - Event ID to update
   * @param result - Scraping result with poster URL and additional fields
   */
  private async updateDatabase(eventId: string, result: ScrapingResult): Promise<void> {
    try {
      // Try using database function for transaction support first
      const { error: rpcError } = await this.database.rpc('update_event_scraping_result', {
        p_event_id: eventId,
        p_poster_url: result.posterUrl || null,
        p_venue_event_page_url: result.venueEventPageUrl || null,  // 전시장 행사 페이지 URL
        p_description: result.description || null,
        p_admission_fee: result.admissionFee || null,
        p_organizer: result.organizer || null,
        p_contact: result.contact || null,
        p_operating_hours: result.operatingHours || null,
        p_venue_hall: result.venueHall || null,
        p_exhibit_items: result.exhibitItems || null,
        p_exhibit_products: result.exhibitProducts || null,
        p_successful_strategy: result.successfulStrategy || null,
        p_scrape_success: result.posterUrl !== null
      });

      if (rpcError) {
        // If function doesn't exist, fall back to direct update
        if (rpcError.message?.includes('function') || rpcError.code === '42883') {
          console.warn('⚠️  Database function not found, using fallback update method');
          await this.updateDatabaseFallback(eventId, result);
        } else {
          throw rpcError;
        }
      }

    } catch (error: any) {
      console.error(`❌ Database update error:`, error.message);
      throw error; // Re-throw to allow caller to handle rollback
    }
  }

  /**
   * Fallback method for updating database without transaction function
   * Used when update_event_scraping_result function is not available
   */
  private async updateDatabaseFallback(eventId: string, result: ScrapingResult): Promise<void> {
    // First, get current scrape_attempt_count
    const { data: currentEvent } = await this.database
      .from('events')
      .select('scrape_attempt_count')
      .eq('id', eventId)
      .single();

    const currentCount = currentEvent?.scrape_attempt_count || 0;

    // Build update data object
    const updateData: any = {
      last_scrape_attempt: new Date().toISOString(),
      scrape_attempt_count: currentCount + 1
    };

    // Update poster URL and success metadata if scraping succeeded
    if (result.posterUrl) {
      updateData.poster_url = result.posterUrl;
      updateData.last_scrape_success = new Date().toISOString();
      updateData.successful_scrape_strategy = result.successfulStrategy;
    }

    // Update venue event page URL if available
    if (result.venueEventPageUrl) {
      updateData.venue_event_page_url = result.venueEventPageUrl;
    }

    // Update additional fields only if they have values (Requirements 3.5)
    if (result.description) updateData.description = result.description;
    if (result.admissionFee) updateData.admission_fee = result.admissionFee;
    if (result.organizer) updateData.organizer = result.organizer;
    if (result.contact) updateData.contact = result.contact;
    if (result.operatingHours) updateData.operating_hours = result.operatingHours;
    if (result.venueHall) updateData.venue_hall = result.venueHall;
    if (result.exhibitItems) updateData.exhibit_items = result.exhibitItems;
    if (result.exhibitProducts) updateData.exhibit_products = result.exhibitProducts;

    // Perform update
    const { error } = await this.database
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      throw error;
    }
  }

  /**
   * Log failure to database
   * Inserts failure record into scraping_failures table
   * Requirements: 4.5, 6.1, 6.2, 6.3, 6.4
   * 
   * @param event - Event identifier with id and title
   * @param result - Scraping result containing attempted strategies and errors
   */
  private async logFailure(event: EventIdentifier, result: ScrapingResult): Promise<void> {
    try {
      const { error } = await this.database
        .from('scraping_failures')
        .insert({
          event_id: event.id,
          event_title: event.title,
          attempted_strategies: result.attemptedStrategies,
          errors: result.errors,
          timestamp: new Date().toISOString(),
          resolved: false
        });

      if (error) {
        console.error(`❌ Failed to log failure:`, error.message);
        throw error;
      }

    } catch (error: any) {
      console.error(`❌ Failure logging error:`, error.message);
      // Don't re-throw - failure logging should not block the main process
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
    return retryableErrors.some(code => error.code === code || error.message?.includes(code));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    return 1000 * Math.pow(this.config.retryBackoffMultiplier, retryCount);
  }

  /**
   * Random delay between min and max
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.delay(delay);
  }

  /**
   * Simple delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Display progress information
   */
  private displayProgress(stats: ProcessingStats): void {
    const progress = stats.totalEvents > 0
      ? ((stats.processedEvents / stats.totalEvents) * 100).toFixed(1)
      : 0;

    process.stdout.write(
      `\r  Progress: ${stats.processedEvents}/${stats.totalEvents} (${progress}%) | ` +
      `✅ ${stats.successfulScrapes} | ❌ ${stats.failedScrapes}`
    );
  }

  /**
   * Display final statistics
   */
  private displayFinalStats(stats: ProcessingStats): void {
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Final Statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 Total Events: ${stats.totalEvents}`);
    console.log(`✅ Successful: ${stats.successfulScrapes}`);
    console.log(`❌ Failed: ${stats.failedScrapes}`);
    console.log(`📈 Success Rate: ${stats.successRate.toFixed(1)}%\n`);

    console.log('📊 Strategy Breakdown:');
    console.log(`   Direct: ${stats.strategyStats.direct}`);
    console.log(`   Schedule: ${stats.strategyStats.schedule}`);
    console.log(`   Search: ${stats.strategyStats.search}\n`);

    const duration = stats.endTime
      ? (stats.endTime.getTime() - stats.startTime.getTime()) / 1000
      : 0;
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s\n`);

    if (stats.successRate < 95) {
      console.log('⚠️  WARNING: Success rate is below 95% target!\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}
