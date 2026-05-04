/**
 * Error categories for scraping operations
 * Used to classify and track different types of failures
 */

export enum ErrorCategory {
  NETWORK_ERROR = 'network_error',           // HTTP request failures, timeouts
  PARSE_ERROR = 'parse_error',               // HTML parsing failures
  NOT_FOUND = 'not_found',                   // Event page or poster not found (404)
  INVALID_URL = 'invalid_url',               // Malformed URLs
  VALIDATION_ERROR = 'validation_error',     // Data validation failures
  DATABASE_ERROR = 'database_error',         // Database operation failures
  RATE_LIMIT_ERROR = 'rate_limit_error',     // Server rate limiting (429)
  UNKNOWN_ERROR = 'unknown_error'            // Uncategorized errors
}
