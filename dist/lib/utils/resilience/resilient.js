import { CircuitOpenError, nonNegative } from './errors.js';
import { retry } from './retry.js';
import { timeout } from './timeout.js';
/**
 * Apply timeout, retry and a circuit breaker in one fixed order:
 *
 *   total timeout › retry › breaker › attempt timeout › work
 *
 * Retry sits outside the breaker so an opened circuit stops the remaining
 * retries; the attempt timeout sits inside it so a hung call counts as a
 * failure. `CircuitOpenError` is never retried. Every layer is optional.
 */
export async function resilient(work, options = {}) {
    const { timeout: limits = {}, breaker, signal } = options;
    const total = nonNegative(limits.total ?? 0, 'resilient: timeout.total');
    const perAttempt = nonNegative(limits.attempt ?? 0, 'resilient: timeout.attempt');
    const retryOptions = options.retry ?? {};
    const retryable = retryOptions.retryable ?? ((result) => !result.ok);
    const run = (outer) => retry(({ attempt, signal: attemptSignal }) => {
        const call = () => timeout((inner) => work({ attempt, signal: inner }), perAttempt, {
            signal: attemptSignal,
        });
        return breaker ? breaker.run(call, { signal: attemptSignal }) : call();
    }, {
        ...retryOptions,
        signal: outer,
        // An open circuit is refusing on purpose — retrying it only burns
        // the budget. Checked before the caller's predicate is consulted.
        retryable: (result, context) => !(!result.ok && result.error instanceof CircuitOpenError) &&
            retryable(result, context),
    });
    return total > 0 ? timeout(run, total, { signal }) : run(signal);
}
//# sourceMappingURL=resilient.js.map