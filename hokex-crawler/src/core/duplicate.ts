/**
 * Duplicate Detector
 * Implements Requirements 3.1, 3.2, 3.3, 3.6: Duplicate detection and change tracking
 * 
 * Feature: event-data-crawler, Property 9: 중복 이벤트 판단 대칭성
 * Feature: event-data-crawler, Property 10: 데이터 변경사항 감지
 * Feature: event-data-crawler, Property 12: 문자열 정규화 동등성
 */

import { NormalizedEventData } from '../types/event';
import { daysDifference } from '../utils/date';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEventId?: string;
  hasChanges: boolean;
  changes?: Partial<NormalizedEventData>;
}

/**
 * Duplicate Detector class
 * Detects duplicate events and tracks changes in existing events
 */
export class DuplicateDetector {
  /**
   * Check if an event is a duplicate of existing events
   * 
   * Duplicate criteria:
   * - Title is identical (case-insensitive, normalized whitespace)
   * - Venue is identical
   * - Start date is within 7 days
   * 
   * @param event - Event to check for duplicates
   * @param existingEvents - List of existing events to compare against
   * @returns DuplicateCheckResult with duplicate status and changes
   */
  async checkDuplicate(
    event: NormalizedEventData,
    existingEvents: Array<NormalizedEventData & { id: string }>
  ): Promise<DuplicateCheckResult> {
    // Normalize the event title for comparison
    const normalizedTitle = this.normalizeString(event.title);
    const eventStartDate = new Date(event.startDate);

    // Find potential duplicates
    for (const existing of existingEvents) {
      const existingNormalizedTitle = this.normalizeString(existing.title);
      
      // Check title match (case-insensitive, normalized whitespace)
      const titleMatch = normalizedTitle === existingNormalizedTitle;
      
      // Check venue match
      const venueMatch = event.venue === existing.venue;
      
      // Check start date within 7 days
      const existingStartDate = new Date(existing.startDate);
      const dateDiff = Math.abs(daysDifference(eventStartDate, existingStartDate));
      const dateWithin7Days = dateDiff <= 7;

      // If all criteria match, it's a duplicate
      if (titleMatch && venueMatch && dateWithin7Days) {
        // Detect changes between new and existing event
        const changes = this.detectChanges(event, existing);
        const hasChanges = Object.keys(changes).length > 0;

        return {
          isDuplicate: true,
          existingEventId: existing.id,
          hasChanges,
          changes: hasChanges ? changes : undefined
        };
      }
    }

    // No duplicate found
    return {
      isDuplicate: false,
      hasChanges: false
    };
  }

  /**
   * Normalize string for comparison
   * - Convert to lowercase
   * - Normalize whitespace (trim and collapse multiple spaces)
   * 
   * Feature: event-data-crawler, Property 12: 문자열 정규화 동등성
   * 
   * @param str - String to normalize
   * @returns Normalized string
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
  }

  /**
   * Detect changes between new event and existing event
   * Returns only fields that are different
   * 
   * Feature: event-data-crawler, Property 10: 데이터 변경사항 감지
   * 
   * @param newEvent - New event data
   * @param existingEvent - Existing event data
   * @returns Partial object with only changed fields
   */
  private detectChanges(
    newEvent: NormalizedEventData,
    existingEvent: NormalizedEventData
  ): Partial<NormalizedEventData> {
    const changes: Partial<NormalizedEventData> = {};

    // Compare all fields
    const fieldsToCompare: (keyof NormalizedEventData)[] = [
      'title',
      'posterUrl',
      'region',
      'venue',
      'startDate',
      'endDate',
      'dayString',
      'category',
      'industry',
      'targetLink',
      'description',
      'organizer',
      'admissionFee',
      'operatingHours',
      'contact',
      'address'
    ];

    for (const field of fieldsToCompare) {
      const newValue = newEvent[field];
      const existingValue = existingEvent[field];

      // Compare values (handle null/undefined)
      if (this.isDifferent(newValue, existingValue)) {
        changes[field] = newValue as any;
      }
    }

    return changes;
  }

  /**
   * Check if two values are different
   * Handles null, undefined, and string comparison
   * 
   * @param value1 - First value
   * @param value2 - Second value
   * @returns True if values are different
   */
  private isDifferent(value1: any, value2: any): boolean {
    // Handle null/undefined cases
    if (value1 === null && value2 === null) return false;
    if (value1 === undefined && value2 === undefined) return false;
    if (value1 === null && value2 === undefined) return false;
    if (value1 === undefined && value2 === null) return false;
    
    // If one is null/undefined and the other is not
    if ((value1 === null || value1 === undefined) && value2 !== null && value2 !== undefined) return true;
    if ((value2 === null || value2 === undefined) && value1 !== null && value1 !== undefined) return true;

    // String comparison (case-sensitive for actual values, not for duplicate detection)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.trim() !== value2.trim();
    }

    // Direct comparison for other types
    return value1 !== value2;
  }

  /**
   * Merge changes into existing event data
   * Preserves existing data but updates fields with new information
   * 
   * Feature: event-data-crawler, Property 11: 데이터 병합 보존성
   * 
   * @param existingEvent - Existing event data
   * @param newEvent - New event data with potential updates
   * @returns Merged event data
   */
  mergeEventData(
    existingEvent: NormalizedEventData,
    newEvent: NormalizedEventData
  ): NormalizedEventData {
    const merged: any = { ...existingEvent };

    // Update fields only if new data has additional information
    const fieldsToMerge: (keyof NormalizedEventData)[] = [
      'posterUrl',
      'endDate',
      'dayString',
      'category',
      'industry',
      'targetLink',
      'description',
      'organizer',
      'admissionFee',
      'operatingHours',
      'contact',
      'address'
    ];

    for (const field of fieldsToMerge) {
      const newValue = newEvent[field];
      const existingValue = existingEvent[field];

      // Update if new value has information and existing doesn't, or if new value is different
      if (newValue !== null && newValue !== undefined && newValue !== '') {
        if (existingValue === null || existingValue === undefined || existingValue === '') {
          merged[field] = newValue;
        } else if (this.isDifferent(newValue, existingValue)) {
          // Prefer new value if it's more detailed (longer string)
          if (typeof newValue === 'string' && typeof existingValue === 'string') {
            merged[field] = newValue.length > existingValue.length ? newValue : existingValue;
          } else {
            merged[field] = newValue;
          }
        }
      }
    }

    return merged as NormalizedEventData;
  }
}
