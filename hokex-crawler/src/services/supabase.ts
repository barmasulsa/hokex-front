/**
 * Supabase Service
 * Handles database operations for event data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NormalizedEventData, EventRecord } from '../types/event';
import * as dotenv from 'dotenv';

dotenv.config();

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save or update event in database
   * 
   * @param event - Normalized event data
   * @param crawlSource - Source identifier (e.g., "COEX")
   * @returns Saved event record
   */
  async saveEvent(event: NormalizedEventData, crawlSource: string): Promise<EventRecord | null> {
    try {
      // Check if event already exists (by title, venue, start_date)
      const { data: existing, error: searchError } = await this.client
        .from('events')
        .select('*')
        .eq('title', event.title)
        .eq('venue', event.venue)
        .eq('start_date', event.startDate)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw searchError;
      }

      const now = new Date().toISOString();

      if (existing) {
        // Update existing event
        const { data, error } = await this.client
          .from('events')
          .update({
            poster_url: event.posterUrl,
            end_date: event.endDate,
            day_string: event.dayString,
            category: event.category,
            industry: event.industry,
            target_link: event.targetLink,
            description: event.description,
            organizer: event.organizer,
            supervisor: event.supervisor,
            admission_fee: event.admissionFee,
            exhibit_items: event.exhibitItems,
            exhibit_products: event.exhibitProducts,
            operating_hours: event.operatingHours,
            contact: event.contact,
            address: event.address,
            venue_hall: event.venueHall,
            last_crawled_at: now,
            updated_at: now
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as EventRecord;
      } else {
        // Insert new event
        const { data, error } = await this.client
          .from('events')
          .insert({
            title: event.title,
            poster_url: event.posterUrl,
            region: event.region,
            venue: event.venue,
            start_date: event.startDate,
            end_date: event.endDate,
            day_string: event.dayString,
            category: event.category,
            industry: event.industry,
            target_link: event.targetLink,
            description: event.description,
            organizer: event.organizer,
            supervisor: event.supervisor,
            admission_fee: event.admissionFee,
            exhibit_items: event.exhibitItems,
            exhibit_products: event.exhibitProducts,
            operating_hours: event.operatingHours,
            contact: event.contact,
            address: event.address,
            venue_hall: event.venueHall,
            status: 'approved',
            crawl_source: crawlSource,
            last_crawled_at: now
          })
          .select()
          .single();

        if (error) throw error;
        return data as EventRecord;
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      return null;
    }
  }

  /**
   * Batch save events
   * 
   * @param events - Array of normalized events
   * @param crawlSource - Source identifier
   * @returns Number of successfully saved events
   */
  async saveEvents(events: NormalizedEventData[], crawlSource: string): Promise<number> {
    let successCount = 0;

    for (const event of events) {
      const result = await this.saveEvent(event, crawlSource);
      if (result) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * Get all events from a specific venue
   * 
   * @param venue - Venue name
   * @returns Array of event records
   */
  async getEventsByVenue(venue: string): Promise<EventRecord[]> {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('venue', venue)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }

    return data as EventRecord[];
  }

  /**
   * Delete old events (older than specified date)
   * 
   * @param beforeDate - ISO date string
   * @returns Number of deleted events
   */
  async deleteOldEvents(beforeDate: string): Promise<number> {
    const { data, error } = await this.client
      .from('events')
      .delete()
      .lt('end_date', beforeDate)
      .select();

    if (error) {
      console.error('Failed to delete old events:', error);
      return 0;
    }

    return data?.length || 0;
  }
}
