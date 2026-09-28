import type { Attempt, ResilientOptions } from '../../type/resilience.type';
import { CircuitOpenError, nonNegative } from './errors';
import { retry } from './retry';
import { timeout } from './timeout';

/**
 * Apply timeout, retry and a circuit breaker in one fixed order:
 *
 *   total timeout › retry › breaker › attempt timeout › work
 *
 * Retry sits outside the breaker so an opened circuit stops the remaining
 * retries; the attempt timeout sits inside it so a hung call counts as a
 * failure. `CircuitOpenError` is never retried. Every layer is optional.
 */
export async function resilient<T>(
	work: (context: Attempt) => Promise<T>,
	options: ResilientOptions<T> = {},
): Promise<T> {
	const { timeout: limits = {}, breaker, signal } = options;
	const total = nonNegative(limits.total ?? 0, 'resilient: timeout.total');
	const perAttempt = nonNegative(
		limits.attempt ?? 0,
		'resilient: timeout.attempt',
	);
	const retryOptions = options.retry ?? {};
	const retryable = retryOptions.retryable ?? ((result) => !result.ok);

	const run = (outer: AbortSignal | undefined) =>
		retry<T>(
			({ attempt, signal: attemptSignal }) => {
				const call = () =>
					timeout((inner) => work({ attempt, signal: inner }), perAttempt, {
						signal: attemptSignal,
					});
				return breaker ? breaker.run(call, { signal: attemptSignal }) : call();
			},
			{
				...retryOptions,
				signal: outer,
				// An open circuit is refusing on purpose — retrying it only burns
				// the budget. Checked before the caller's predicate is consulted.
				retryable: (result, context) =>
					!(!result.ok && result.error instanceof CircuitOpenError) &&
					retryable(result, context),
			},
		);

	return total > 0 ? timeout(run, total, { signal }) : run(signal);
}
