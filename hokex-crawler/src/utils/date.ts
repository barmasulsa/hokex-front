/**
 * Date utility functions
 * Implements Requirements 2.3: ISO 8601 date conversion
 */

/**
 * Convert various date formats to ISO 8601 (YYYY-MM-DD)
 * 
 * @param dateInput - Date string or Date object
 * @returns ISO 8601 formatted date string (YYYY-MM-DD)
 */
export function convertToISO8601(dateInput: string | Date): string {
  let date: Date;

  if (typeof dateInput === 'string') {
    // Try parsing various formats
    date = parseDate(dateInput);
  } else {
    date = dateInput;
  }

  // Format as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse date string in various formats
 */
function parseDate(dateString: string): Date {
  // Remove whitespace
  const cleaned = dateString.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }

  // Try Korean format (YYYY.MM.DD or YYYY/MM/DD)
  if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split(/[./]/);
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
  }

  // Try Korean format with year (YYYY년 MM월 DD일)
  const koreanMatch = cleaned.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    return new Date(
      parseInt(koreanMatch[1]),
      parseInt(koreanMatch[2]) - 1,
      parseInt(koreanMatch[3])
    );
  }

  // Fallback to Date constructor
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  return date;
}

/**
 * Validate if a string is in ISO 8601 format (YYYY-MM-DD)
 */
export function isValidISO8601(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Check if date1 is before or equal to date2
 */
export function isDateBeforeOrEqual(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return d1.getTime() <= d2.getTime();
}

/**
 * Generate day string in Korean format (e.g., "(월)", "(화)")
 */
export function generateDayString(date: Date): string {
  const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
  return days[date.getDay()];
}

/**
 * Check if date is within N years from now
 */
export function isWithinYears(date: Date | string, years: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const maxDate = new Date(now.getFullYear() + years, now.getMonth(), now.getDate());

  return d.getTime() <= maxDate.getTime();
}

/**
 * Calculate difference in days between two dates
 */
export function daysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
