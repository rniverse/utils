import { describe, expect, test } from 'bun:test';
import { sleep } from '@utils/generic';
import { lazy } from '@utils/lazy';

/** A load whose settling the test controls. */
function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: unknown) => void = () => {};
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** load() that hands out the given deferreds' promises in order. */
function sequence<T>(...loads: Array<{ promise: Promise<T> }>) {
	return () => {
		const next = loads.shift();
		if (!next) throw new Error('no more loads queued');
		return next.promise;
	};
}

describe('lazy', () => {
	test('concurrent get()s share one load() call', async () => {
		let calls = 0;
		const value = lazy(async () => {
			calls++;
			await sleep(10);
			return 'v';
		});
		const results = await Promise.all([value.get(), value.get(), value.get()]);
		expect(results).toEqual(['v', 'v', 'v']);
		expect(calls).toBe(1);
	});

	test('a successful load is cached', async () => {
		let calls = 0;
		const value = lazy(async () => ++calls);
		await value.get();
		expect(await value.get()).toBe(1);
		expect(calls).toBe(1);
	});

	test('a failed load is not cached; the next get() loads again', async () => {
		let calls = 0;
		const value = lazy(async () => {
			calls++;
			if (calls === 1) throw new Error('first fails');
			return 'second';
		});
		await expect(value.get()).rejects.toThrow('first fails');
		expect(await value.get()).toBe('second');
		expect(calls).toBe(2);
	});

	test('a synchronous throw in load() behaves like a rejected load', async () => {
		let calls = 0;
		const value = lazy((() => {
			calls++;
			throw new Error('sync');
		}) as () => Promise<never>);
		await expect(value.get()).rejects.toThrow('sync');
		await expect(value.get()).rejects.toThrow('sync');
		expect(calls).toBe(2); // not cached
	});

	test('reset() forces a fresh load', async () => {
		let calls = 0;
		const value = lazy(async () => ++calls);
		await value.get();
		value.reset();
		expect(await value.get()).toBe(2);
	});

	test('reset during A, then B: A settling after B does not overwrite B', async () => {
		const a = deferred<string>();
		const b = deferred<string>();
		const value = lazy(sequence(a, b));

		const first = value.get();
		value.reset();
		const second = value.get();
		b.resolve('B');
		await second;
		a.resolve('A');
		await first;
		expect(await value.get()).toBe('B');
	});

	test('reset during A, then B: A settling before B does not overwrite B', async () => {
		const a = deferred<string>();
		const b = deferred<string>();
		const value = lazy(sequence(a, b));

		const first = value.get();
		value.reset();
		const second = value.get();
		a.resolve('A');
		await first;
		b.resolve('B');
		await second;
		expect(await value.get()).toBe('B');
	});

	test('reset during A, then B: A failing does not clear B (no third load)', async () => {
		const a = deferred<string>();
		const b = deferred<string>();
		let calls = 0;
		const load = sequence(a, b);
		const value = lazy(() => {
			calls++;
			return load();
		});

		const first = value.get();
		value.reset();
		const second = value.get();
		a.reject(new Error('A failed'));
		await first.catch(() => {});
		const third = value.get(); // must share B, not start a third load
		b.resolve('B');
		expect(await second).toBe('B');
		expect(await third).toBe('B');
		expect(calls).toBe(2);
	});

	test('callers of A still get A outcome after reset()', async () => {
		const a = deferred<string>();
		const b = deferred<string>();
		const value = lazy(sequence(a, b));

		const first = value.get();
		value.reset();
		value.get();
		a.resolve('A');
		b.resolve('B');
		expect(await first).toBe('A');
	});

	test('errors come out unchanged', async () => {
		class DomainError extends Error {}
		const error = new DomainError('x');
		const value = lazy(async () => {
			throw error;
		});
		expect(await value.get().catch((e) => e)).toBe(error);
	});
});
