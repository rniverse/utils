import { describe, expect, test } from 'bun:test';
import { sleep } from '@utils/generic';
import { type RetryContext, retry } from '@utils/resilience';

const fixed = { strategy: 'fixed', min: 0, max: 0 } as const;

describe('retry', () => {
	test('default attempts: 1 calls work once, never retries', async () => {
		let calls = 0;
		await expect(
			retry(async () => {
				calls++;
				throw new Error('boom');
			}),
		).rejects.toThrow('boom');
		expect(calls).toBe(1);
	});

	test('retries errors up to attempts, then rethrows the last one unchanged', async () => {
		let calls = 0;
		const errors: Error[] = [];
		const caught = await retry(
			async () => {
				calls++;
				const error = new Error(`boom ${calls}`);
				errors.push(error);
				throw error;
			},
			{ attempts: 3, backoff: fixed },
		).catch((e) => e);
		expect(calls).toBe(3);
		expect(caught).toBe(errors[2]);
	});

	test('stops at the first success', async () => {
		let calls = 0;
		const out = await retry(
			async () => {
				calls++;
				if (calls < 3) throw new Error('nope');
				return calls;
			},
			{ attempts: 5, backoff: fixed },
		);
		expect(out).toBe(3);
	});

	test('retries a returned value when retryable says so, returns the last one', async () => {
		let calls = 0;
		const out = await retry(
			async () => {
				calls++;
				return { ok: false, n: calls };
			},
			{
				attempts: 3,
				backoff: fixed,
				retryable: (result) => result.ok && result.data.ok === false,
			},
		);
		expect(out).toEqual({ ok: false, n: 3 });
	});

	test('retryable false returns the outcome unchanged', async () => {
		const error = new Error('fatal');
		let calls = 0;
		const caught = await retry(
			async () => {
				calls++;
				throw error;
			},
			{ attempts: 5, backoff: fixed, retryable: () => false },
		).catch((e) => e);
		expect(caught).toBe(error);
		expect(calls).toBe(1);
	});

	test('retryable may be async', async () => {
		let calls = 0;
		await retry(
			async () => {
				calls++;
				if (calls < 2) throw new Error('x');
			},
			{
				attempts: 3,
				backoff: fixed,
				retryable: async (result) => {
					await sleep(1);
					return !result.ok;
				},
			},
		);
		expect(calls).toBe(2);
	});

	test('retryable is not called after the final attempt', async () => {
		const seen: number[] = [];
		await retry(
			async () => {
				throw new Error('x');
			},
			{
				attempts: 3,
				backoff: fixed,
				retryable: (_result, { attempt }) => {
					seen.push(attempt);
					return true;
				},
			},
		).catch(() => {});
		expect(seen).toEqual([1, 2]);
	});

	test('context carries attempt, attempts, delay, elapsed', async () => {
		const contexts: RetryContext[] = [];
		await retry(
			async () => {
				throw new Error('x');
			},
			{
				attempts: 3,
				backoff: { strategy: 'fixed', min: 5, max: 5 },
				retryable: (_result, context) => {
					contexts.push(context);
					return true;
				},
			},
		).catch(() => {});
		expect(contexts.map((c) => [c.attempt, c.attempts, c.delay])).toEqual([
			[1, 3, 5],
			[2, 3, 5],
		]);
		expect(contexts[1]?.elapsed).toBeGreaterThanOrEqual(4);
	});

	test('one delay value is used for predicate, hook, and wait (jitter)', async () => {
		const predicate: number[] = [];
		const hook: number[] = [];
		await retry(
			async () => {
				throw new Error('x');
			},
			{
				attempts: 4,
				backoff: { strategy: 'jitter', min: 1, max: 40 },
				retryable: (_result, { delay }) => {
					predicate.push(delay);
					return true;
				},
				on: { retry: ({ delay }) => hook.push(delay) },
			},
		).catch(() => {});
		expect(hook).toEqual(predicate);
	});

	test('on.retry fires before each retry with the result, not on giving up', async () => {
		const events: Array<{ attempt: number; ok: boolean }> = [];
		await retry(
			async () => {
				throw new Error('x');
			},
			{
				attempts: 3,
				backoff: fixed,
				on: {
					retry: ({ attempt, result }) =>
						events.push({ attempt, ok: result.ok }),
				},
			},
		).catch(() => {});
		expect(events).toEqual([
			{ attempt: 1, ok: false },
			{ attempt: 2, ok: false },
		]);
	});

	test('fixed waits min; exponential doubles from min; both clamp to max', async () => {
		const delays = async (strategy: 'fixed' | 'exponential') => {
			const seen: number[] = [];
			await retry(
				async () => {
					throw new Error('x');
				},
				{
					attempts: 6,
					backoff: { strategy, min: 1, max: 8 },
					on: { retry: ({ delay }) => seen.push(delay) },
				},
			).catch(() => {});
			return seen;
		};
		expect(await delays('fixed')).toEqual([1, 1, 1, 1, 1]);
		expect(await delays('exponential')).toEqual([1, 2, 4, 8, 8]);
	});

	test('jitter stays between min and the exponential value, within max', async () => {
		const seen: number[] = [];
		await retry(
			async () => {
				throw new Error('x');
			},
			{
				attempts: 8,
				backoff: { strategy: 'jitter', min: 1, max: 10 },
				on: { retry: ({ delay }) => seen.push(delay) },
			},
		).catch(() => {});
		seen.forEach((delay, i) => {
			const exponential = Math.min(10, 2 ** i);
			expect(delay).toBeGreaterThanOrEqual(1);
			expect(delay).toBeLessThanOrEqual(exponential);
		});
		expect(seen[0]).toBe(1); // first jitter range is [min, min]
	});

	test('min > max fails early with RangeError', async () => {
		let called = false;
		await expect(
			retry(
				async () => {
					called = true;
				},
				{ backoff: { min: 10, max: 5 } },
			),
		).rejects.toBeInstanceOf(RangeError);
		expect(called).toBe(false);
	});

	test('negative min/max fails early with RangeError', async () => {
		await expect(
			retry(async () => 1, { backoff: { min: -1 } }),
		).rejects.toBeInstanceOf(RangeError);
		await expect(
			retry(async () => 1, { backoff: { min: 0, max: -5 } }),
		).rejects.toBeInstanceOf(RangeError);
	});

	test('attempts < 1 becomes one attempt; NaN is a RangeError', async () => {
		let calls = 0;
		await retry(
			async () => {
				calls++;
				throw new Error('x');
			},
			{ attempts: 0 },
		).catch(() => {});
		expect(calls).toBe(1);
		await expect(
			retry(async () => 1, { attempts: Number.NaN }),
		).rejects.toBeInstanceOf(RangeError);
	});

	test('retryable throwing stops retry and propagates that error', async () => {
		const predicateError = new Error('predicate broke');
		let calls = 0;
		const caught = await retry(
			async () => {
				calls++;
				throw new Error('work');
			},
			{
				attempts: 5,
				backoff: fixed,
				retryable: () => {
					throw predicateError;
				},
			},
		).catch((e) => e);
		expect(caught).toBe(predicateError);
		expect(calls).toBe(1);
	});

	test('caller abort mid-wait stops immediately and is never retried', async () => {
		const controller = new AbortController();
		const reason = new Error('caller');
		let calls = 0;
		const started = Date.now();
		const pending = retry(
			async () => {
				calls++;
				throw new Error('x');
			},
			{
				attempts: 5,
				backoff: { strategy: 'fixed', min: 5_000, max: 5_000 },
				signal: controller.signal,
			},
		);
		setTimeout(() => controller.abort(reason), 10);
		await expect(pending).rejects.toBe(reason);
		expect(calls).toBe(1);
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	test('caller abort during work never reaches retryable', async () => {
		const controller = new AbortController();
		const reason = new Error('caller');
		let predicateCalls = 0;
		const pending = retry(({ signal }) => sleep(5_000, { signal }), {
			attempts: 5,
			backoff: fixed,
			signal: controller.signal,
			retryable: () => {
				predicateCalls++;
				return true;
			},
		});
		setTimeout(() => controller.abort(reason), 10);
		await expect(pending).rejects.toBe(reason);
		expect(predicateCalls).toBe(0);
	});

	test('each attempt gets a fresh signal; the caller abort aborts the live one', async () => {
		const controller = new AbortController();
		const signals: AbortSignal[] = [];
		const pending = retry(
			async ({ attempt, signal }) => {
				signals.push(signal);
				if (attempt === 1) throw new Error('first');
				return sleep(5_000, { signal });
			},
			{ attempts: 2, backoff: fixed, signal: controller.signal },
		);
		await sleep(10);
		controller.abort(new Error('stop'));
		await pending.catch(() => {});
		expect(signals).toHaveLength(2);
		expect(signals[0]).not.toBe(signals[1]);
		expect(signals[1]?.aborted).toBe(true);
	});
});
