import type { Attempt, ResilientOptions } from '../../type/resilience.type.js';
/**
 * Apply timeout, retry and a circuit breaker in one fixed order:
 *
 *   total timeout › retry › breaker › attempt timeout › work
 *
 * Retry sits outside the breaker so an opened circuit stops the remaining
 * retries; the attempt timeout sits inside it so a hung call counts as a
 * failure. `CircuitOpenError` is never retried. Every layer is optional.
 */
export declare function resilient<T>(work: (context: Attempt) => Promise<T>, options?: ResilientOptions<T>): Promise<T>;
//# sourceMappingURL=resilient.d.ts.map