import type { Attempt, RetryOptions } from '../../type/resilience.type.js';
/**
 * Call `work`; on an outcome `retryable` accepts, wait and call again, up to
 * `attempts` in total. Returns or rethrows the last outcome unchanged. A caller
 * abort stops immediately (mid-wait included) and never reaches `retryable`.
 */
export declare function retry<T>(work: (context: Attempt) => Promise<T>, options?: RetryOptions<T>): Promise<T>;
//# sourceMappingURL=retry.d.ts.map