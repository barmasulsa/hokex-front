/**
 * Retry utility with exponential backoff
 * Implements Requirements 5.2: Exponential backoff retry strategy
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retries a function with exponential backoff
 * Delay formula: 2^attempt * baseDelayMs
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    onRetry
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }

      // Calculate delay: 2^attempt * baseDelayMs
      const delayMs = Math.pow(2, attempt) * baseDelayMs;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * Formula: 2^attempt seconds
 * 
 * @param attempt - Retry attempt number (0-indexed)
 * @returns Delay in seconds
 */
export function calculateBackoffDelay(attempt: number): number {
  return Math.pow(2, attempt);
}
