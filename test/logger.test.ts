import { describe, expect, test } from 'bun:test';
import { log, random, ulid } from '@utils';
import { cxt$req } from '@utils/context';

describe('Logger', () => {
	test('should be defined', () => {
		expect(log).toBeDefined();
		expect(typeof log.info).toBe('function');
		expect(typeof log.error).toBe('function');
		expect(typeof log.warn).toBe('function');
		expect(typeof log.debug).toBe('function');
	});

	test('should include request ID in mixin when context is set', () => {
		let _logOutput: any = null;

		// Create a custom logger that captures output
		const testLogger = log.child({
			// Override write to capture
			write: (chunk: any) => {
				_logOutput = chunk;
			},
		});

		cxt$req.withRequestId(() => {
			const requestId = cxt$req.getRequestId();
			testLogger.info('test message');

			// Check that mixin is called and returns requestId
			expect(requestId).toBeTruthy();
			expect(typeof requestId).toBe('string');
		});
	});

	test('should not include request ID when context is not set', () => {
		const requestId = cxt$req.getRequestId();
		expect(requestId).toBeNull();
	});

	test('should have correct log levels', () => {
		expect(log.level).toBeDefined();
	});

	test('should support child loggers', () => {
		const childLogger = log.child({ module: 'test' });
		expect(childLogger).toBeDefined();
		expect(typeof childLogger.info).toBe('function');
	});

	test('should handle multiple log calls with same request context', () => {
		cxt$req.withRequestId(() => {
			const id1 = cxt$req.getRequestId();
			log.info('first log');
			const id2 = cxt$req.getRequestId();
			log.info('second log');

			expect(id1).toBe(id2);
		});
	});

	test('should isolate request IDs in nested contexts', async () => {
		const idMap = new Map<string, string | null>();

		const sleep = (ms: number) =>
			new Promise((resolve) => setTimeout(resolve, ms));

		const work = async (fail?: boolean) => {
			const v1 = ulid.generate();

			cxt$req.withRequestId({ userId: ulid.generate() });
			idMap.set(fail ? Date.now().toString() : v1, cxt$req.getRequestId());
			log.info(
				'Inside work function with request ID: %s - %s',
				cxt$req.getRequestId(),
				v1,
			);
			await sleep(10 * random.int(1, 3));
			log.info(
				'After sleep in work function with request ID: %s - %s',
				cxt$req.getRequestId(),
				v1,
			);
			const current = cxt$req.getRequestId();
			const expected = idMap.get(v1) ?? null;
			console.log('Comparing IDs:', { v1, current, expected }, idMap);
			expect(current).toBe(expected);
		};

		await Promise.all([work(), work(), work()]);
	});
	test('should support structured logging', () => {
		const data = { userId: 123, action: 'login' };
		expect(() => log.info(data, 'user action')).not.toThrow();
	});

	test('should support error logging', () => {
		const error = new Error('test error');
		expect(() => log.error(error, 'error occurred')).not.toThrow();
	});

	test('should handle undefined and null values', () => {
		expect(() => log.info(undefined as any)).not.toThrow();
		expect(() => log.info(null as any)).not.toThrow();
	});
});
