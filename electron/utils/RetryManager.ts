/**
 * RetryManager - Utility for handling retries with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryManager {
  private readonly defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: (error) => {
      // Default: retry on network errors and rate limits
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
      if (error.status === 429 || error.status === 503) return true;
      if (error.message?.includes('rate limit')) return true;
      if (error.message?.includes('timeout')) return true;
      return false;
    },
    onRetry: (attempt, error) => {
      console.log(`[RetryManager] Retry attempt ${attempt}: ${error.message}`);
    }
  };

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: any;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!config.retryableErrors(error)) {
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt === config.maxRetries) {
          throw new Error(
            `Operation failed after ${config.maxRetries} retries: ${error.message}`
          );
        }

        // Call retry callback
        config.onRetry(attempt, error);

        // Wait before next retry
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Execute multiple operations with retry logic
   */
  async executeMultipleWithRetry<T>(
    operations: Array<() => Promise<T>>,
    options?: RetryOptions & { concurrency?: number }
  ): Promise<T[]> {
    const concurrency = options?.concurrency || 3;
    const results: T[] = [];
    const queue = [...operations];

    const workers = Array(concurrency).fill(null).map(async () => {
      while (queue.length > 0) {
        const operation = queue.shift();
        if (operation) {
          const result = await this.executeWithRetry(operation, options);
          results.push(result);
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a timeout wrapper for async functions
   */
  withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutError?: string
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(timeoutError || `Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      )
    ]);
  }
}

// Export singleton instance
export const retryManager = new RetryManager();