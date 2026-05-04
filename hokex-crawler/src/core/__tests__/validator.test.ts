/**
 * Unit tests for DataValidator
 */

import { DataValidator } from '../validator';
import { NormalizedEventData } from '../../types/event';

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('validate - required fields', () => {
    it('should pass validation for valid event data', () => {
      const event: NormalizedEventData = {
        title: '서울 모터쇼 2026',
        posterUrl: 'https://example.com/poster.jpg',
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when title is missing', () => {
      const event: NormalizedEventData = {
        title: '',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'required')).toBe(true);
    });

    it('should fail validation when venue is missing', () => {
      const event: any = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'required')).toBe(true);
    });
  });

  describe('validate - title length', () => {
    it('should fail validation when title is too short', () => {
      const event: NormalizedEventData = {
        title: '짧음',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title_length')).toBe(true);
    });

    it('should fail validation when title is too long', () => {
      const event: NormalizedEventData = {
        title: 'A'.repeat(201),
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'title_length')).toBe(true);
    });

    it('should pass validation with title at minimum length', () => {
      const event: NormalizedEventData = {
        title: '12345',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - date format', () => {
    it('should fail validation with invalid date format', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026/04/15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date_format')).toBe(true);
    });

    it('should pass validation with correct ISO 8601 format', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - date order', () => {
    it('should fail validation when start date is after end date', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-25',
        endDate: '2026-04-15',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date_order')).toBe(true);
    });

    it('should pass validation when start date equals end date', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-15',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - poster URL', () => {
    it('should pass validation when posterUrl is null', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
    });

    it('should add warning for invalid URL format', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: 'not-a-valid-url',
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.errors.some(e => e.field === 'poster_url' && e.severity === 'warning')).toBe(true);
    });

    it('should pass validation with valid URL', () => {
      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: 'https://example.com/poster.jpg',
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: '2026-04-25',
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validate - end date range', () => {
    it('should add warning when end date is more than 2 years in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 3);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const event: NormalizedEventData = {
        title: '테스트 행사',
        posterUrl: null,
        region: '서울',
        venue: '코엑스',
        startDate: '2026-04-15',
        endDate: futureDateStr,
        dayString: '(수)',
        category: '전시',
        industry: 'IT/전자'
      };

      const result = validator.validate(event);

      expect(result.errors.some(e => e.field === 'end_date_range' && e.severity === 'warning')).toBe(true);
    });
  });
});
