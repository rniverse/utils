import { describe, expect, test } from 'bun:test';
import { sleep } from '@utils/generic';
import { TimeoutError, timeout } from '@utils/resilience';

describe('timeout', () => {
	test('returns the value when work finishes in time', async () => {
		await expect(timeout(async () => 'done', 100)).resolves.toBe('done');
	});

	test('rejects with TimeoutError carrying ms, and aborts the work signal', async () => {
		let seen: AbortSignal | undefined;
		const pending = timeout((signal) => {
			seen = signal;
			return sleep(5_000, { signal });
		}, 20);
		const error = await pending.catch((e) => e);
		expect(error).toBeInstanceOf(TimeoutError);
		expect(error.ms).toBe(20);
		expect(seen?.aborted).toBe(true);
		expect(seen?.reason).toBe(error);
	});

	test('bounds the wait even when work ignores the signal', async () => {
		const started = Date.now();
		await expect(
			timeout(() => new Promise(() => {}), 20),
		).rejects.toBeInstanceOf(TimeoutError);
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	test('propagates caller cancellation with the caller reason', async () => {
		const controller = new AbortController();
		const reason = new Error('caller gave up');
		let seen: AbortSignal | undefined;
		const pending = timeout(
			(signal) => {
				seen = signal;
				return sleep(5_000, { signal });
			},
			5_000,
			{ signal: controller.signal },
		);
		setTimeout(() => controller.abort(reason), 10);
		await expect(pending).rejects.toBe(reason);
		expect(seen?.aborted).toBe(true);
	});

	test('rejects immediately when the caller signal is already aborted', async () => {
		const reason = new Error('already');
		let called = false;
		await expect(
			timeout(
				async () => {
					called = true;
				},
				100,
				{ signal: AbortSignal.abort(reason) },
			),
		).rejects.toBe(reason);
		expect(called).toBe(false);
	});

	test('clears its timer once work settles (no late rejection)', async () => {
		const result = await timeout(async () => 'fast', 30);
		await sleep(50); // past the limit — nothing should fire or reject now
		expect(result).toBe('fast');
	});

	test('0 and Infinity run untimed', async () => {
		const slow = () => sleep(30).then(() => 'late');
		await expect(timeout(slow, 0)).resolves.toBe('late');
		await expect(timeout(slow, Number.POSITIVE_INFINITY)).resolves.toBe('late');
	});

	test('a synchronous throw in work becomes a rejection', async () => {
		const boom = new Error('sync');
		await expect(
			timeout(() => {
				throw boom;
			}, 100),
		).rejects.toBe(boom);
	});

	test('the work error comes out unchanged', async () => {
		class DomainError extends Error {}
		const error = new DomainError('x');
		const caught = await timeout(async () => {
			throw error;
		}, 100).catch((e) => e);
		expect(caught).toBe(error);
	});

	test('negative ms rejects with RangeError', async () => {
		await expect(timeout(async () => 1, -1)).rejects.toBeInstanceOf(RangeError);
	});
});
