import { describe, expect, test } from 'bun:test';
import {
	cxt$req,
	RequestContext,
	runWithContext,
	type TRequestContext,
} from '@utils/context';
import { uuid } from '@utils/id';

describe('RequestContext', () => {
	describe('run()', () => {
		test('stores and retrieves the context', () => {
			const store = { requestId: 'test-123', userId: 'user-456' };
			cxt$req.run(store, () => {
				expect(cxt$req.store()).toEqual(store);
				expect(cxt$req.requestId()).toBe('test-123');
				expect(cxt$req.userId()).toBe('user-456');
			});
		});

		test('no store outside a run()', () => {
			expect(cxt$req.store()).toBeUndefined();
			expect(cxt$req.requestId()).toBeUndefined();
			expect(cxt$req.userId()).toBeUndefined();
		});

		test('returns the callback result', () => {
			const out = cxt$req.run({ requestId: 'r' }, () => 42);
			expect(out).toBe(42);
		});
	});

	describe('get() / set() / patch()', () => {
		test('set() mutates the current store in place', () => {
			const store: TRequestContext = { requestId: 'r' };
			cxt$req.run(store, () => {
				cxt$req.set('userId', 'u-1');
				expect(cxt$req.get('userId')).toBe('u-1');
				// same object, not a replacement
				expect(cxt$req.store()).toBe(store);
				expect(store.userId).toBe('u-1');
			});
		});

		test('patch() merges fields in place', () => {
			cxt$req.run({ requestId: 'r' }, () => {
				cxt$req.patch({ userId: 'u-2', tenant: 'acme' });
				expect(cxt$req.get('userId')).toBe('u-2');
				expect(cxt$req.get('tenant')).toBe('acme');
			});
		});

		test('set() / patch() are no-ops outside a context', () => {
			expect(() => cxt$req.set('userId', 'x')).not.toThrow();
			expect(() => cxt$req.patch({ userId: 'x' })).not.toThrow();
			expect(cxt$req.userId()).toBeUndefined();
		});
	});

	describe('bindFetch()', () => {
		test('each call gets its own fresh store', async () => {
			const seen: Array<string | undefined> = [];
			const handler = async (label: string) => {
				await new Promise((r) => setTimeout(r, Math.random() * 10));
				cxt$req.set('userId', label);
				await new Promise((r) => setTimeout(r, Math.random() * 10));
				return {
					label,
					requestId: cxt$req.requestId(),
					userId: cxt$req.userId(),
				};
			};
			const wrapped = cxt$req.bindFetch(handler);

			const results = await Promise.all([
				wrapped('a'),
				wrapped('b'),
				wrapped('c'),
			]);

			for (const r of results) {
				expect(typeof r.requestId).toBe('string');
				expect(r.userId).toBe(r.label); // no cross-call bleed
				seen.push(r.requestId);
			}
			expect(new Set(seen).size).toBe(3); // distinct ids
		});

		test('seed derives store fields from the handler args', async () => {
			const wrapped = cxt$req.bindFetch(
				async (_req: { headers: Map<string, string> }) => cxt$req.store(),
				(req: { headers: Map<string, string> }) => {
					const id = req.headers.get('x-request-id');
					return id ? { requestId: id } : undefined;
				},
			);
			const store = await wrapped({
				headers: new Map([['x-request-id', 'inbound-1']]),
			});
			expect(store?.requestId).toBe('inbound-1');
		});
	});

	describe('concurrency', () => {
		test('run() keeps 25 interleaved tasks isolated', async () => {
			const tasks = Array.from({ length: 25 }, (_, i) =>
				cxt$req.run({ requestId: `req-${i}` }, async () => {
					await new Promise((r) => setTimeout(r, Math.random() * 15));
					cxt$req.set('userId', `user-${i}`);
					await new Promise((r) => setTimeout(r, Math.random() * 15));
					return `${cxt$req.requestId()}|${cxt$req.userId()}`;
				}),
			);
			const results = await Promise.all(tasks);
			results.forEach((r, i) => {
				expect(r).toBe(`req-${i}|user-${i}`);
			});
		});
	});

	describe('runWithContext()', () => {
		test('generates a requestId when none is given', () => {
			runWithContext(() => {
				expect(cxt$req.requestId()).toMatch(/^[0-9a-f-]{36}$/i);
			});
		});

		test('honours a supplied requestId', () => {
			runWithContext(
				() => {
					expect(cxt$req.requestId()).toBe('SERVER_LOG');
				},
				{ requestId: 'SERVER_LOG' },
			);
		});

		test('propagates the return value (incl. promises)', async () => {
			const out = await runWithContext(async () => {
				await new Promise((r) => setTimeout(r, 5));
				return cxt$req.requestId();
			});
			expect(typeof out).toBe('string');
		});
	});

	describe('isolated instances', () => {
		test('two RequestContext instances do not share a store', () => {
			const a = new RequestContext();
			const b = new RequestContext();
			a.run({ requestId: 'a-1' }, () => {
				expect(a.requestId()).toBe('a-1');
				expect(b.requestId()).toBeUndefined();
			});
		});

		test('generated ids are unique', () => {
			const ids = new Set<string>();
			for (let i = 0; i < 100; i++) {
				cxt$req.run({ requestId: uuid.generate() }, () => {
					ids.add(cxt$req.requestId() as string);
				});
			}
			expect(ids.size).toBe(100);
		});
	});
});
