import { describe, expect, test } from 'bun:test';
import { retry } from '@utils/retry';

describe('retry', () => {
	test('returns immediately on success', async () => {
		let calls = 0;
		const out = await retry(() => {
			calls++;
			return 'ok';
		});
		expect(out).toBe('ok');
		expect(calls).toBe(1);
	});

	test('retries a throwing fn up to `attempts` then rethrows', async () => {
		let calls = 0;
		await expect(
			retry(
				() => {
					calls++;
					throw new Error(`boom ${calls}`);
				},
				{ attempts: 3, delay: 0 },
			),
		).rejects.toThrow('boom 3');
		expect(calls).toBe(3);
	});

	test('recovers when a later attempt succeeds', async () => {
		let calls = 0;
		const out = await retry(
			() => {
				calls++;
				if (calls < 3) throw new Error('nope');
				return calls;
			},
			{ attempts: 5, delay: 0 },
		);
		expect(out).toBe(3);
	});

	test('retryIf keeps going on a bad returned value, returns the last one', async () => {
		let calls = 0;
		const out = await retry(
			() => {
				calls++;
				return { ok: false as const, n: calls };
			},
			{
				attempts: 3,
				delay: 0,
				retryIf: (o) => o.ok && o.value.ok === false,
			},
		);
		expect(out).toEqual({ ok: false, n: 3 });
		expect(calls).toBe(3);
	});

	test('onRetry sees each failed attempt with its delay', async () => {
		const seen: Array<[number, number]> = [];
		await retry(
			() => {
				throw new Error('x');
			},
			{
				attempts: 3,
				delay: (n) => n * 10,
				onRetry: (_o, attempt, delayMs) => seen.push([attempt, delayMs]),
			},
		).catch(() => {});
		expect(seen).toEqual([
			[1, 10],
			[2, 20],
		]);
	});

	test('stops early when retryIf returns false', async () => {
		let calls = 0;
		await expect(
			retry(
				() => {
					calls++;
					throw Object.assign(new Error('fatal'), { fatal: true });
				},
				{
					attempts: 5,
					delay: 0,
					retryIf: (o) => !o.ok && !(o.error as any).fatal,
				},
			),
		).rejects.toThrow('fatal');
		expect(calls).toBe(1);
	});
});
