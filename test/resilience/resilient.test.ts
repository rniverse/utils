import { describe, expect, test } from 'bun:test';
import { sleep } from '@utils/generic';
import {
	CircuitBreaker,
	CircuitOpenError,
	resilient,
	TimeoutError,
} from '@utils/resilience';

const fixed = { strategy: 'fixed', min: 0, max: 0 } as const;

describe('resilient', () => {
	test('with no options it just runs work', async () => {
		expect(await resilient(async () => 'ok')).toBe('ok');
	});

	test('CircuitOpenError is never retried', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 60_000 });
		await breaker
			.run(async () => Promise.reject(new Error('down')))
			.catch(() => {});

		let calls = 0;
		let retries = 0;
		const error = await resilient(
			async () => {
				calls++;
				return 'unreachable';
			},
			{
				breaker,
				retry: {
					attempts: 5,
					backoff: fixed,
					on: { retry: () => retries++ },
				},
			},
		).catch((e) => e);
		expect(error).toBeInstanceOf(CircuitOpenError);
		expect(calls).toBe(0);
		expect(retries).toBe(0);
	});

	test('once the breaker opens mid-retry, remaining attempts fail fast', async () => {
		const breaker = new CircuitBreaker({ threshold: 2, cooldown: 60_000 });
		let calls = 0;
		let retries = 0;
		const error = await resilient(
			async () => {
				calls++;
				throw new Error('down');
			},
			{
				breaker,
				retry: {
					attempts: 5,
					backoff: fixed,
					on: { retry: () => retries++ },
				},
			},
		).catch((e) => e);
		expect(calls).toBe(2);
		expect(retries).toBe(2); // after failures 1 and 2; not after the CircuitOpenError
		expect(error).toBeInstanceOf(CircuitOpenError);
	});

	test('attempt timeout sits inside the breaker: a hung attempt is counted', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 60_000 });
		const error = await resilient(() => new Promise(() => {}), {
			breaker,
			timeout: { attempt: 20 },
		}).catch((e) => e);
		expect(error).toBeInstanceOf(TimeoutError);
		expect(breaker.state).toBe('open');
	});

	test('a TimeoutError from the attempt timeout goes through retryable', async () => {
		let calls = 0;
		const out = await resilient(
			async ({ signal }) => {
				calls++;
				if (calls === 1) await sleep(5_000, { signal });
				return 'second try';
			},
			{ timeout: { attempt: 20 }, retry: { attempts: 2, backoff: fixed } },
		);
		expect(out).toBe('second try');
		expect(calls).toBe(2);
	});

	test('total timeout includes retry delays', async () => {
		const started = Date.now();
		const error = await resilient(
			async () => {
				throw new Error('x');
			},
			{
				timeout: { total: 50 },
				retry: {
					attempts: 10,
					backoff: { strategy: 'fixed', min: 1_000, max: 1_000 },
				},
			},
		).catch((e) => e);
		expect(error).toBeInstanceOf(TimeoutError);
		expect(Date.now() - started).toBeLessThan(500);
	});

	test('total timeout bounds a never-settling retryable', async () => {
		const error = await resilient(
			async () => {
				throw new Error('x');
			},
			{
				timeout: { total: 30 },
				retry: { attempts: 3, retryable: () => new Promise(() => {}) },
			},
		).catch((e) => e);
		expect(error).toBeInstanceOf(TimeoutError);
	});

	test('total timeout bounds a never-settling trips', async () => {
		const breaker = new CircuitBreaker({ trips: () => new Promise(() => {}) });
		const error = await resilient(async () => 'x', {
			breaker,
			timeout: { total: 30 },
		}).catch((e) => e);
		expect(error).toBeInstanceOf(TimeoutError);
	});

	test('original application errors come out unchanged', async () => {
		class DomainError extends Error {}
		const error = new DomainError('x');
		const caught = await resilient(
			async () => {
				throw error;
			},
			{
				timeout: { total: 1_000, attempt: 500 },
				retry: { attempts: 2, backoff: fixed },
				breaker: new CircuitBreaker(),
			},
		).catch((e) => e);
		expect(caught).toBe(error);
	});

	test('caller abort stops everything and is not counted by the breaker', async () => {
		const breaker = new CircuitBreaker({ threshold: 1 });
		const controller = new AbortController();
		const reason = new Error('caller');
		const pending = resilient(({ signal }) => sleep(5_000, { signal }), {
			breaker,
			retry: { attempts: 3, backoff: fixed },
			signal: controller.signal,
		});
		setTimeout(() => controller.abort(reason), 10);
		await expect(pending).rejects.toBe(reason);
		expect(breaker.state).toBe('closed');
	});

	test('negative timeouts reject with RangeError', async () => {
		await expect(
			resilient(async () => 1, { timeout: { total: -1 } }),
		).rejects.toBeInstanceOf(RangeError);
		await expect(
			resilient(async () => 1, { timeout: { attempt: -1 } }),
		).rejects.toBeInstanceOf(RangeError);
	});
});
