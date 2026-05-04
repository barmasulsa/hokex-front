/**
 * Integration tests for BatchProcessor database operations
 * Tests Task 8: Database operations with transaction support
 * Requirements: 3.4, 3.5, 3.6, 4.5, 6.1, 6.2, 6.3, 6.4
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BatchProcessor } from '../batch-processor';
import { EventIdentifier, ScrapingResult } from '../fallback-mechanism';
import * as dotenv from 'dotenv';

dotenv.config();

describe('BatchProcessor Database Operations', () => {
  let processor: BatchProcessor;
  let database: SupabaseClient;
  let testEventId: string;

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials for testing');
    }

    database = createClient(supabaseUrl, supabaseKey);
    processor = new BatchProcessor(supabaseUrl, supabaseKey);

    // Create a test event
    const { data, error } = await database
      .from('events')
      .insert({
        title: 'Test Event for Database Operations',
        region: 'Seoul',
        venue: 'COEX',
        start_date: '2026-12-01',
        end_date: '2026-12-03',
        day_string: '2026.12.01 - 2026.12.03',
        category: 'Exhibition',
        industry: 'Technology',
        status: 'approved',
        crawl_source: 'TEST'
      })
      .select()
      .single();

    if (error) throw error;
    testEventId = data.id;
  });

  afterAll(async () => {
    // Clean up test event
    if (testEventId) {
      await database.from('events').delete().eq('id', testEventId);
    }
  });

  describe('updateDatabase - Requirement 3.4, 3.5, 3.6', () => {
    it('should update event with poster URL and scraping metadata', async () => {
      const result: ScrapingResult = {
        posterUrl: 'https://example.com/poster.jpg',
        successfulStrategy: 'direct',
        attemptedStrategies: ['direct'],
        errors: {}
      };

      // Access private method via type assertion for testing
      await (processor as any).updateDatabase(testEventId, result);

      // Verify update
      const { data, error } = await database
        .from('events')
        .select('*')
        .eq('id', testEventId)
        .single();

      expect(error).toBeNull();
      expect(data.poster_url).toBe('https://example.com/poster.jpg');
      expect(data.successful_scrape_strategy).toBe('direct');
      expect(data.last_scrape_attempt).toBeTruthy();
      expect(data.last_scrape_success).toBeTruthy();
      expect(data.scrape_attempt_count).toBeGreaterThan(0);
    });

    it('should update additional fields when provided (Requirement 3.5)', async () => {
      const result: ScrapingResult = {
        posterUrl: 'https://example.com/poster2.jpg',
        description: 'Test event description',
        admissionFee: 'Free',
        organizer: 'Test Organizer',
        contact: 'test@example.com',
        operatingHours: '09:00 - 18:00',
        venueHall: 'Hall A',
        exhibitItems: 'Technology products',
        exhibitProducts: 'Software, Hardware',
        successfulStrategy: 'schedule',
        attemptedStrategies: ['direct', 'schedule'],
        errors: { direct: 'Not found' }
      };

      await (processor as any).updateDatabase(testEventId, result);

      // Verify all fields updated
      const { data, error } = await database
        .from('events')
        .select('*')
        .eq('id', testEventId)
        .single();

      expect(error).toBeNull();
      expect(data.description).toBe('Test event description');
      expect(data.admission_fee).toBe('Free');
      expect(data.organizer).toBe('Test Organizer');
      expect(data.contact).toBe('test@example.com');
      expect(data.operating_hours).toBe('09:00 - 18:00');
      expect(data.venue_hall).toBe('Hall A');
      expect(data.exhibit_items).toBe('Technology products');
      expect(data.exhibit_products).toBe('Software, Hardware');
    });

    it('should handle partial updates (only update provided fields)', async () => {
      // First update with some fields
      const result1: ScrapingResult = {
        posterUrl: 'https://example.com/poster3.jpg',
        description: 'Initial description',
        successfulStrategy: 'direct',
        attemptedStrategies: ['direct'],
        errors: {}
      };

      await (processor as any).updateDatabase(testEventId, result1);

      // Second update with different fields (should not overwrite description)
      const result2: ScrapingResult = {
        posterUrl: 'https://example.com/poster4.jpg',
        admissionFee: '10,000 KRW',
        successfulStrategy: 'schedule',
        attemptedStrategies: ['direct', 'schedule'],
        errors: { direct: 'Not found' }
      };

      await (processor as any).updateDatabase(testEventId, result2);

      // Verify description is preserved and admission_fee is added
      const { data, error } = await database
        .from('events')
        .select('*')
        .eq('id', testEventId)
        .single();

      expect(error).toBeNull();
      expect(data.description).toBe('Initial description'); // Preserved
      expect(data.admission_fee).toBe('10,000 KRW'); // Added
    });

    it('should increment scrape_attempt_count on each update', async () => {
      // Get current count
      const { data: before } = await database
        .from('events')
        .select('scrape_attempt_count')
        .eq('id', testEventId)
        .single();

      const countBefore = before?.scrape_attempt_count || 0;

      // Update
      const result: ScrapingResult = {
        posterUrl: null,
        successfulStrategy: undefined,
        attemptedStrategies: ['direct', 'schedule', 'search'],
        errors: { direct: 'Not found', schedule: 'Not found', search: 'Not found' }
      };

      await (processor as any).updateDatabase(testEventId, result);

      // Verify count incremented
      const { data: after } = await database
        .from('events')
        .select('scrape_attempt_count')
        .eq('id', testEventId)
        .single();

      expect(after?.scrape_attempt_count).toBe(countBefore + 1);
    });

    it('should update last_scrape_attempt even on failure', async () => {
      const result: ScrapingResult = {
        posterUrl: null,
        successfulStrategy: undefined,
        attemptedStrategies: ['direct', 'schedule', 'search'],
        errors: { direct: 'Not found', schedule: 'Not found', search: 'Not found' }
      };

      await (processor as any).updateDatabase(testEventId, result);

      const { data } = await database
        .from('events')
        .select('last_scrape_attempt, last_scrape_success')
        .eq('id', testEventId)
        .single();

      expect(data?.last_scrape_attempt).toBeTruthy();
      // last_scrape_success should not be updated on failure
    });
  });

  describe('logFailure - Requirement 4.5, 6.1, 6.2, 6.3, 6.4', () => {
    it('should create failure log entry with all required fields', async () => {
      const event: EventIdentifier = {
        id: testEventId,
        title: 'Test Event for Database Operations',
        startDate: '2026-12-01',
        endDate: '2026-12-03'
      };

      const result: ScrapingResult = {
        posterUrl: null,
        successfulStrategy: undefined,
        attemptedStrategies: ['direct', 'schedule', 'search'],
        errors: {
          direct: 'Event page not found (404)',
          schedule: 'No matching event in schedule',
          search: 'No search results found'
        }
      };

      await (processor as any).logFailure(event, result);

      // Verify failure log created
      const { data, error } = await database
        .from('scraping_failures')
        .select('*')
        .eq('event_id', testEventId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(data.event_id).toBe(testEventId);
      expect(data.event_title).toBe('Test Event for Database Operations');
      expect(data.attempted_strategies).toEqual(['direct', 'schedule', 'search']);
      expect(data.errors).toEqual({
        direct: 'Event page not found (404)',
        schedule: 'No matching event in schedule',
        search: 'No search results found'
      });
      expect(data.timestamp).toBeTruthy();
      expect(data.resolved).toBe(false);

      // Clean up
      await database.from('scraping_failures').delete().eq('id', data.id);
    });

    it('should set resolved to false by default', async () => {
      const event: EventIdentifier = {
        id: testEventId,
        title: 'Test Event for Database Operations',
        startDate: '2026-12-01',
        endDate: '2026-12-03'
      };

      const result: ScrapingResult = {
        posterUrl: null,
        successfulStrategy: undefined,
        attemptedStrategies: ['direct'],
        errors: { direct: 'Test error' }
      };

      await (processor as any).logFailure(event, result);

      const { data } = await database
        .from('scraping_failures')
        .select('resolved')
        .eq('event_id', testEventId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      expect(data?.resolved).toBe(false);

      // Clean up
      await database
        .from('scraping_failures')
        .delete()
        .eq('event_id', testEventId);
    });
  });

  describe('Error handling and rollback', () => {
    it('should throw error on database update failure', async () => {
      const result: ScrapingResult = {
        posterUrl: 'https://example.com/poster.jpg',
        successfulStrategy: 'direct',
        attemptedStrategies: ['direct'],
        errors: {}
      };

      // Try to update non-existent event
      await expect(
        (processor as any).updateDatabase('00000000-0000-0000-0000-000000000000', result)
      ).rejects.toThrow();
    });

    it('should not block on failure logging errors', async () => {
      const event: EventIdentifier = {
        id: '00000000-0000-0000-0000-000000000000', // Non-existent event
        title: 'Non-existent Event',
        startDate: '2026-12-01',
        endDate: '2026-12-03'
      };

      const result: ScrapingResult = {
        posterUrl: null,
        successfulStrategy: undefined,
        attemptedStrategies: ['direct'],
        errors: { direct: 'Test error' }
      };

      // Should not throw - failure logging should not block main process
      await expect(
        (processor as any).logFailure(event, result)
      ).resolves.not.toThrow();
    });
  });
});
