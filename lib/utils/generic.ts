import type { SleepOptions } from '../type/generic.type';

export type { SleepOptions } from '../type/generic.type';

export const safeParseInt = (
	value: unknown,
	fallback = 0,
	radix = 10,
): number => {
	const parsed = Number.parseInt(String(value ?? ''), radix);
	return Number.isNaN(parsed) ? fallback : parsed;
};

export const boundedParseInt = (
	value: unknown,
	{
		min,
		max,
		fallback = 0,
	}: {
		min?: number;
		max?: number;
		fallback?: number;
	},
): number => {
	const parsed = safeParseInt(value, fallback);

	if (min !== undefined && parsed < min) return min;
	if (max !== undefined && parsed > max) return max;

	return parsed;
};

// setTimeout's ceiling (2^31 − 1 ms, ~24.8 days). Past it, runtimes fire the
// timer immediately instead of late — so larger waits are rejected, not
// silently shortened.
export const MAX_TIMER_MS = 2_147_483_647;

/**
 * Wait `ms`, or until `signal` aborts (rejects with `signal.reason`). The
 * timer is always cleared. `0` resolves on the next tick; `Infinity` waits
 * until aborted. Negative, `NaN`, or over-`MAX_TIMER_MS` rejects with
 * `RangeError` — a negative wait is always a bug, never "no wait".
 */
export const sleep = (
	ms: number,
	options: SleepOptions = {},
): Promise<void> => {
	const { signal } = options;
	if (Number.isNaN(ms) || ms < 0) {
		return Promise.reject(new RangeError(`sleep: ms must be >= 0, got ${ms}`));
	}
	if (ms !== Number.POSITIVE_INFINITY && ms > MAX_TIMER_MS) {
		return Promise.reject(
			new RangeError(`sleep: ms must be <= ${MAX_TIMER_MS}, got ${ms}`),
		);
	}
	if (signal?.aborted) return Promise.reject(signal.reason);

	return new Promise((resolve, reject) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		signal?.addEventListener('abort', onAbort, { once: true });
		if (ms !== Number.POSITIVE_INFINITY) {
			timer = setTimeout(() => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, ms);
		}
	});
};

export const isBun = (): boolean =>
	typeof Bun !== 'undefined' && Boolean(process.versions.bun);
