import { describe, expect, test } from 'bun:test';
import { sleep } from '@utils/generic';
import {
	CircuitBreaker,
	CircuitOpenError,
	TimeoutError,
} from '@utils/resilience';

const fail = async () => {
	throw new Error('down');
};
const pass = async () => 'up';

async function trip(breaker: CircuitBreaker, times: number) {
	for (let i = 0; i < times; i++) await breaker.run(fail).catch(() => {});
}

describe('CircuitBreaker', () => {
	test('stays closed below threshold; a non-counted outcome resets the count', async () => {
		const breaker = new CircuitBreaker({ threshold: 3, cooldown: 1_000 });
		await trip(breaker, 2);
		await breaker.run(pass);
		await trip(breaker, 2);
		expect(breaker.state).toBe('closed');
	});

	test('opens at threshold consecutive failures and stops calling the dependency', async () => {
		const breaker = new CircuitBreaker({ threshold: 3, cooldown: 1_000 });
		await trip(breaker, 3);
		expect(breaker.state).toBe('open');

		let called = false;
		const error = await breaker
			.run(async () => {
				called = true;
			})
			.catch((e) => e);
		expect(error).toBeInstanceOf(CircuitOpenError);
		expect(error.remaining).toBeGreaterThan(0);
		expect(error.remaining).toBeLessThanOrEqual(1_000);
		expect(called).toBe(false);
	});

	test('passes the work outcome through unchanged', async () => {
		const breaker = new CircuitBreaker();
		const error = new Error('domain');
		expect(await breaker.run(pass)).toBe('up');
		expect(
			await breaker
				.run(async () => {
					throw error;
				})
				.catch((e) => e),
		).toBe(error);
	});

	test('half-open after cooldown; a successful trial closes', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 20 });
		await trip(breaker, 1);
		await sleep(30);
		expect(breaker.state).toBe('half-open');
		await breaker.run(pass);
		expect(breaker.state).toBe('closed');
	});

	test('a failed trial reopens with a fresh cooldown', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 20 });
		await trip(breaker, 1);
		await sleep(30);
		await breaker.run(fail).catch(() => {});
		expect(breaker.state).toBe('open');
		const error = await breaker.run(pass).catch((e) => e);
		expect(error.remaining).toBeGreaterThan(10);
	});

	test('half-open lets exactly one trial through; concurrent callers fail immediately', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 20 });
		await trip(breaker, 1);
		await sleep(30);

		let calls = 0;
		const slow = async () => {
			calls++;
			await sleep(30);
			return 'ok';
		};
		const results = await Promise.allSettled([
			breaker.run(slow),
			breaker.run(slow),
			breaker.run(slow),
		]);
		expect(calls).toBe(1);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		for (const r of results.filter((r) => r.status === 'rejected')) {
			expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
				CircuitOpenError,
			);
		}
	});

	test('a trial outliving cooldown expires, reopens, and its late outcome is ignored', async () => {
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 20 });
		await trip(breaker, 1);
		await sleep(30);

		let finish: (value: string) => void = () => {};
		const stuck = breaker.run(
			() =>
				new Promise<string>((resolve) => {
					finish = resolve;
				}),
		);
		await sleep(30); // trial now older than cooldown
		const error = await breaker.run(pass).catch((e) => e);
		expect(error).toBeInstanceOf(CircuitOpenError); // expired → reopened
		expect(breaker.state).toBe('open');

		finish('late success');
		await stuck;
		expect(breaker.state).toBe('open'); // late success didn't close it
	});

	test('an async trips keeps the trial slot held until it resolves', async () => {
		let release: (failed: boolean) => void = () => {};
		const breaker = new CircuitBreaker({
			threshold: 1,
			cooldown: 20,
			trips: (result) =>
				result.ok
					? new Promise<boolean>((resolve) => {
							release = resolve;
						})
					: true,
		});
		await trip(breaker, 1);
		await sleep(30);

		const trial = breaker.run(pass);
		await sleep(5);
		expect(await breaker.run(pass).catch((e) => e)).toBeInstanceOf(
			CircuitOpenError,
		);
		release(false);
		await trial;
		expect(breaker.state).toBe('closed');
	});

	test('a never-settling trips in half-open is freed by the stuck-trial expiry', async () => {
		let first = true;
		const breaker = new CircuitBreaker({
			threshold: 1,
			cooldown: 20,
			trips: (result) => {
				if (!result.ok) return true;
				if (first) {
					first = false;
					return new Promise<boolean>(() => {}); // never settles
				}
				return false;
			},
		});
		await trip(breaker, 1);
		await sleep(30);
		breaker.run(pass); // hangs in trips forever
		await sleep(30); // expiry reopens
		await breaker.run(pass).catch(() => {});
		await sleep(30); // next cooldown
		await breaker.run(pass);
		expect(breaker.state).toBe('closed');
	});

	test('caller abort never trips it and never calls trips', async () => {
		let tripsCalls = 0;
		const breaker = new CircuitBreaker({
			threshold: 1,
			trips: (result) => {
				tripsCalls++;
				return !result.ok;
			},
		});
		const controller = new AbortController();
		const pending = breaker.run(
			() => sleep(5_000, { signal: controller.signal }),
			{
				signal: controller.signal,
			},
		);
		controller.abort(new Error('caller'));
		await pending.catch(() => {});
		expect(tripsCalls).toBe(0);
		expect(breaker.state).toBe('closed');
	});

	test('TimeoutError trips it under the default trips', async () => {
		const breaker = new CircuitBreaker({ threshold: 1 });
		await breaker
			.run(async () => {
				throw new TimeoutError(10);
			})
			.catch(() => {});
		expect(breaker.state).toBe('open');
	});

	test('a returned { ok: false } trips it via trips', async () => {
		const breaker = new CircuitBreaker({
			threshold: 1,
			trips: (result) =>
				!result.ok || (result.data as { ok: boolean }).ok === false,
		});
		const out = await breaker.run(async () => ({ ok: false }));
		expect(out).toEqual({ ok: false }); // returned unchanged
		expect(breaker.state).toBe('open');
	});

	test('trips can exclude errors that are not the dependency fault', async () => {
		class ClientError extends Error {}
		const breaker = new CircuitBreaker({
			threshold: 1,
			trips: (result) => !result.ok && !(result.error instanceof ClientError),
		});
		await breaker
			.run(async () => {
				throw new ClientError('4xx');
			})
			.catch(() => {});
		expect(breaker.state).toBe('closed');
	});

	test('hooks fire with one event object', async () => {
		const events: string[] = [];
		const breaker = new CircuitBreaker({
			threshold: 2,
			cooldown: 20,
			on: {
				open: ({ failures, cooldown }) =>
					events.push(`open:${failures}:${cooldown}`),
				trial: ({ since }) => events.push(`trial:${since >= 20}`),
				close: ({ since }) => events.push(`close:${since >= 20}`),
			},
		});
		await trip(breaker, 2);
		await sleep(30);
		await breaker.run(pass);
		expect(events).toEqual(['open:2:20', 'trial:true', 'close:true']);
	});

	test('reset() closes it', async () => {
		const breaker = new CircuitBreaker({ threshold: 1 });
		await trip(breaker, 1);
		breaker.reset();
		expect(breaker.state).toBe('closed');
		expect(await breaker.run(pass)).toBe('up');
	});

	test('no timers: an idle open breaker does not keep the process busy', async () => {
		// State is derived from timestamps; opening schedules nothing.
		const before = process.getActiveResourcesInfo().length;
		const breaker = new CircuitBreaker({ threshold: 1, cooldown: 60_000 });
		await trip(breaker, 1);
		expect(process.getActiveResourcesInfo().length).toBe(before);
	});

	test('invalid options throw RangeError', () => {
		expect(() => new CircuitBreaker({ cooldown: -1 })).toThrow(RangeError);
		expect(() => new CircuitBreaker({ threshold: 0 })).toThrow(RangeError);
		expect(() => new CircuitBreaker({ threshold: 1.5 })).toThrow(RangeError);
	});
});
