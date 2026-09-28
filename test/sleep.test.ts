import { describe, expect, test } from 'bun:test';
import { MAX_TIMER_MS, sleep } from '@utils/generic';

describe('sleep', () => {
	test('resolves after roughly ms', async () => {
		const started = Date.now();
		await sleep(20);
		expect(Date.now() - started).toBeGreaterThanOrEqual(15);
	});

	test('0 resolves on the next tick', async () => {
		await expect(sleep(0)).resolves.toBeUndefined();
	});

	test('rejects with the signal reason when aborted mid-wait', async () => {
		const controller = new AbortController();
		const reason = new Error('stop');
		const started = Date.now();
		const pending = sleep(5_000, { signal: controller.signal });
		setTimeout(() => controller.abort(reason), 10);
		await expect(pending).rejects.toBe(reason);
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	test('rejects immediately when the signal is already aborted', async () => {
		const reason = new Error('already');
		await expect(
			sleep(5_000, { signal: AbortSignal.abort(reason) }),
		).rejects.toBe(reason);
	});

	test('Infinity waits until aborted', async () => {
		const controller = new AbortController();
		const pending = sleep(Number.POSITIVE_INFINITY, {
			signal: controller.signal,
		});
		let settled = false;
		pending.catch(() => {
			settled = true;
		});
		await sleep(20);
		expect(settled).toBe(false);
		controller.abort(new Error('done'));
		await expect(pending).rejects.toThrow('done');
	});

	test('negative or NaN ms rejects with RangeError', async () => {
		await expect(sleep(-1)).rejects.toBeInstanceOf(RangeError);
		await expect(sleep(Number.NaN)).rejects.toBeInstanceOf(RangeError);
	});

	test('ms above the timer ceiling rejects with RangeError', async () => {
		await expect(sleep(MAX_TIMER_MS + 1)).rejects.toBeInstanceOf(RangeError);
	});
});
