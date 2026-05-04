/**
 * Unit tests for DuplicateDetector
 */

import { DuplicateDetector } from '../duplicate';
import { NormalizedEventData, Region, Venue, Category } from '../../types/event';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    detector = new DuplicateDetector();
  });

  const createEvent = (overrides?: Partial<NormalizedEventData>): NormalizedEventData => ({
    title: '서울 모터쇼 2026',
    posterUrl: null,
    region: '서울' as Region,
    venue: '코엑스' as Venue,
    startDate: '2026-04-15',
    endDate: '2026-04-25',
    dayString: '(수)',
    category: '전시' as Category,
    industry: 'IT/전자',
    ...overrides
  });

  describe('checkDuplicate', () => {
    it('should detect exact duplicate', async () => {
      const event = createEvent();
      const existingEvents = [{ id: 'existing-1', ...event }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(true);
      expect(result.existingEventId).toBe('existing-1');
      expect(result.hasChanges).toBe(false);
    });

    it('should detect duplicate with case-insensitive title', async () => {
      const event = createEvent();
      const existingEvents = [{ id: 'existing-1', ...event }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(true);
    });

    it('should detect duplicate with normalized whitespace', async () => {
      const event = createEvent({ title: '서울  모터쇼  2026' });
      const existingEvents = [{ id: 'existing-1', ...createEvent() }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(true);
    });

    it('should detect duplicate within 7 days', async () => {
      const event = createEvent();
      const existingEvents = [{ id: 'existing-1', ...createEvent({ startDate: '2026-04-20' }) }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(true);
    });

    it('should not detect duplicate when date difference is more than 7 days', async () => {
      const event = createEvent();
      const existingEvents = [{ id: 'existing-1', ...createEvent({ startDate: '2026-05-01' }) }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(false);
    });

    it('should not detect duplicate when venue is different', async () => {
      const event = createEvent();
      const existingEvents = [{ id: 'existing-1', ...createEvent({ venue: '세텍' as Venue }) }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(false);
    });

    it('should detect changes in duplicate event', async () => {
      const event = createEvent({
        posterUrl: 'https://example.com/new-poster.jpg',
        description: '새로운 설명'
      });
      const existingEvents = [{ id: 'existing-1', ...createEvent() }];

      const result = await detector.checkDuplicate(event, existingEvents);

      expect(result.isDuplicate).toBe(true);
      expect(result.hasChanges).toBe(true);
      expect(result.changes).toBeDefined();
      expect(result.changes?.posterUrl).toBe('https://example.com/new-poster.jpg');
      expect(result.changes?.description).toBe('새로운 설명');
    });
  });

  describe('mergeEventData', () => {
    it('should preserve existing data and add new information', () => {
      const existingEvent = createEvent();
      const newEvent = createEvent({
        posterUrl: 'https://example.com/poster.jpg',
        description: '새로운 설명'
      });

      const merged = detector.mergeEventData(existingEvent, newEvent);

      expect(merged.title).toBe('서울 모터쇼 2026');
      expect(merged.posterUrl).toBe('https://example.com/poster.jpg');
      expect(merged.description).toBe('새로운 설명');
    });

    it('should not overwrite existing data with empty values', () => {
      const existingEvent = createEvent({
        posterUrl: 'https://example.com/poster.jpg',
        description: '기존 설명'
      });
      const newEvent = createEvent({
        posterUrl: null,
        description: ''
      });

      const merged = detector.mergeEventData(existingEvent, newEvent);

      expect(merged.posterUrl).toBe('https://example.com/poster.jpg');
      expect(merged.description).toBe('기존 설명');
    });

    it('should prefer longer string values', () => {
      const existingEvent = createEvent({ description: '짧은 설명' });
      const newEvent = createEvent({ description: '훨씬 더 길고 자세한 설명입니다' });

      const merged = detector.mergeEventData(existingEvent, newEvent);

      expect(merged.description).toBe('훨씬 더 길고 자세한 설명입니다');
    });
  });
});
