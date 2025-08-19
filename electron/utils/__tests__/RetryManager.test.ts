import { RetryManager } from '../RetryManager';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 10,
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const error = new Error('Fatal error');
      const mockFn = jest.fn().mockRejectedValue(error);
      
      await expect(
        retryManager.executeWithRetry(mockFn, {
          retryableErrors: () => false,
        })
      ).rejects.toThrow('Fatal error');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('timeout'));
      
      await expect(
        retryManager.executeWithRetry(mockFn, {
          maxRetries: 2,
          initialDelay: 10,
        })
      ).rejects.toThrow('Operation failed after 2 retries');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback on each retry', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await retryManager.executeWithRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({
        message: 'timeout',
      }));
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes before timeout', async () => {
      const mockFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 50))
      );
      
      const result = await retryManager.withTimeout(mockFn, 100);
      
      expect(result).toBe('success');
    });

    it('should reject if operation exceeds timeout', async () => {
      const mockFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 200))
      );
      
      await expect(
        retryManager.withTimeout(mockFn, 50, 'Custom timeout error')
      ).rejects.toThrow('Custom timeout error');
    });
  });

  describe('executeMultipleWithRetry', () => {
    it('should execute multiple operations with concurrency limit', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
        jest.fn().mockResolvedValue('result4'),
      ];
      
      const results = await retryManager.executeMultipleWithRetry(
        operations,
        { concurrency: 2 }
      );
      
      expect(results).toHaveLength(4);
      expect(results).toContain('result1');
      expect(results).toContain('result2');
      expect(results).toContain('result3');
      expect(results).toContain('result4');
      operations.forEach(op => expect(op).toHaveBeenCalledTimes(1));
    });

    it('should retry failed operations in batch execution', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3'),
      ];
      
      const results = await retryManager.executeMultipleWithRetry(
        operations,
        { 
          concurrency: 2,
          maxRetries: 2,
          initialDelay: 10,
        }
      );
      
      expect(results).toHaveLength(3);
      expect(operations[1]).toHaveBeenCalledTimes(2); // One failure, one success
    });
  });
});