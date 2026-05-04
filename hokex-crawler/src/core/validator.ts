/**
 * Data Validator
 * Implements Requirements 2.6: Data quality validation
 * 
 * Feature: event-data-crawler, Property 20: 데이터 검증 규칙 종합
 */

import { NormalizedEventData } from '../types/event';
import { isValidISO8601, isDateBeforeOrEqual, isWithinYears } from '../utils/date';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Data Validator class
 * Validates normalized event data according to HOKEX standards
 */
export class DataValidator {
  /**
   * Validate event data
   * 
   * Validation rules:
   * - Required fields: title, venue, startDate, endDate
   * - Date order: startDate ≤ endDate
   * - Title length: 5-200 characters
   * - Date format: YYYY-MM-DD (ISO 8601)
   * - URL format: valid URL (if posterUrl exists)
   * - End date: within 2 years from now
   * 
   * @param event - Normalized event data to validate
   * @returns ValidationResult with isValid flag and error list
   */
  validate(event: NormalizedEventData): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Check required fields
    this.validateRequiredFields(event, errors);

    // 2. Validate title length
    this.validateTitleLength(event, errors);

    // 3. Validate date format
    this.validateDateFormat(event, errors);

    // 4. Validate date order (only if dates are valid)
    if (errors.filter(e => e.field === 'date_format').length === 0) {
      this.validateDateOrder(event, errors);
    }

    // 5. Validate end date within 2 years (only if dates are valid)
    if (errors.filter(e => e.field === 'date_format' || e.field === 'date_order').length === 0) {
      this.validateEndDateRange(event, errors);
    }

    // 6. Validate poster URL format (if exists)
    this.validatePosterUrl(event, errors);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate required fields exist
   */
  private validateRequiredFields(event: NormalizedEventData, errors: ValidationError[]): void {
    const requiredFields: (keyof NormalizedEventData)[] = ['title', 'venue', 'startDate', 'endDate'];

    for (const field of requiredFields) {
      const value = event[field];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: 'required',
          message: `필수 필드가 누락되었습니다: ${field}`,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate title length (5-200 characters)
   */
  private validateTitleLength(event: NormalizedEventData, errors: ValidationError[]): void {
    if (!event.title) return; // Already caught by required fields check

    const titleLength = event.title.trim().length;
    if (titleLength < 5) {
      errors.push({
        field: 'title_length',
        message: `제목이 너무 짧습니다 (최소 5자): ${titleLength}자`,
        severity: 'error'
      });
    } else if (titleLength > 200) {
      errors.push({
        field: 'title_length',
        message: `제목이 너무 깁니다 (최대 200자): ${titleLength}자`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private validateDateFormat(event: NormalizedEventData, errors: ValidationError[]): void {
    if (event.startDate && !isValidISO8601(event.startDate)) {
      errors.push({
        field: 'date_format',
        message: `시작일 형식이 올바르지 않습니다 (YYYY-MM-DD 형식 필요): ${event.startDate}`,
        severity: 'error'
      });
    }

    if (event.endDate && !isValidISO8601(event.endDate)) {
      errors.push({
        field: 'date_format',
        message: `종료일 형식이 올바르지 않습니다 (YYYY-MM-DD 형식 필요): ${event.endDate}`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate date order (startDate ≤ endDate)
   */
  private validateDateOrder(event: NormalizedEventData, errors: ValidationError[]): void {
    if (!event.startDate || !event.endDate) return;

    if (!isDateBeforeOrEqual(event.startDate, event.endDate)) {
      errors.push({
        field: 'date_order',
        message: `시작일이 종료일보다 늦습니다: ${event.startDate} > ${event.endDate}`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate end date is within 2 years from now
   */
  private validateEndDateRange(event: NormalizedEventData, errors: ValidationError[]): void {
    if (!event.endDate) return;

    const endDate = new Date(event.endDate);
    if (!isWithinYears(endDate, 2)) {
      errors.push({
        field: 'end_date_range',
        message: `종료일이 현재로부터 2년을 초과합니다: ${event.endDate}`,
        severity: 'warning'
      });
    }
  }

  /**
   * Validate poster URL format (if exists)
   */
  private validatePosterUrl(event: NormalizedEventData, errors: ValidationError[]): void {
    // posterUrl is nullable, so null is valid
    if (event.posterUrl === null || event.posterUrl === undefined) {
      return;
    }

    // Empty string is not valid
    if (event.posterUrl === '') {
      errors.push({
        field: 'poster_url',
        message: '포스터 URL이 빈 문자열입니다',
        severity: 'warning'
      });
      return;
    }

    // Validate URL format
    try {
      const url = new URL(event.posterUrl);
      
      // Check protocol (http or https)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push({
          field: 'poster_url',
          message: `포스터 URL 프로토콜이 올바르지 않습니다: ${url.protocol}`,
          severity: 'warning'
        });
      }
    } catch (error) {
      errors.push({
        field: 'poster_url',
        message: `포스터 URL 형식이 올바르지 않습니다: ${event.posterUrl}`,
        severity: 'warning'
      });
    }
  }
}
