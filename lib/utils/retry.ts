// lib/utils/retry.ts

export type RetryOutcome<T> =
	| { ok: true; value: T }
	| { ok: false; error: unknown };

export type RetryOptions<T> = {
	/** Total attempts, including the first. Default 3. */
	attempts?: number;
	/**
	 * Milliseconds to wait before retry N (1-based: the wait before attempt 2 is
	 * `delay(1)`). A number is used as-is for every retry. Default: linear
	 * backoff `n => 1000 * n`.
	 */
	delay?: number | ((attempt: number) => number);
	/**
	 * Whether to retry given the last outcome. Default: retry only when `fn`
	 * threw (`o => !o.ok`). Return `true` for a returned-but-unacceptable value
	 * to keep going (e.g. a `{ ok: false }` health result).
	 */
	retryIf?: (outcome: RetryOutcome<T>, attempt: number) => boolean;
	/** Called after each failed attempt that will be retried. */
	onRetry?: (
		outcome: RetryOutcome<T>,
		attempt: number,
		delayMs: number,
	) => void;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn`, retrying on a thrown error (or a caller-defined bad result) with
 * backoff.
 *
 * On exhaustion the last returned value is passed through as-is; a final thrown
 * error is re-thrown. So a `fn` that returns `{ ok: false, error }` rather than
 * throwing will have that object returned after the last attempt.
 */
export async function retry<T>(
	fn: () => T | Promise<T>,
	options: RetryOptions<T> = {},
): Promise<T> {
	const attempts = Math.max(1, options.attempts ?? 3);
	const delayFor =
		typeof options.delay === 'function'
			? options.delay
			: (n: number) => (options.delay as number | undefined) ?? 1000 * n;
	const retryIf = options.retryIf ?? ((o: RetryOutcome<T>) => !o.ok);

	let outcome: RetryOutcome<T> = {
		ok: false,
		error: new Error('retry: fn never ran'),
	};

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			outcome = { ok: true, value: await fn() };
		} catch (error) {
			outcome = { ok: false, error };
		}

		const last = attempt === attempts;
		if (last || !retryIf(outcome, attempt)) break;

		const delayMs = Math.max(0, delayFor(attempt));
		options.onRetry?.(outcome, attempt, delayMs);
		if (delayMs > 0) await wait(delayMs);
	}

	if (outcome.ok) return outcome.value;
	throw outcome.error;
}
