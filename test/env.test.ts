import { afterEach, describe, expect, test } from 'bun:test';
import { environment } from '@utils/env';

const KEY = 'ENV_UTIL_TEST_VALUE';

describe('environment', () => {
	afterEach(() => {
		delete process.env[KEY];
	});

	describe('get', () => {
		test('returns the value when set', () => {
			process.env[KEY] = 'hello';
			expect(environment.get(KEY)).toBe('hello');
		});

		test('trims surrounding whitespace', () => {
			process.env[KEY] = '  hello  ';
			expect(environment.get(KEY)).toBe('hello');
		});

		test('treats blank / whitespace-only as unset', () => {
			process.env[KEY] = '   ';
			expect(environment.get(KEY)).toBeUndefined();
			expect(environment.get(KEY, 'fallback')).toBe('fallback');
		});

		test('returns fallback when unset', () => {
			expect(environment.get(KEY)).toBeUndefined();
			expect(environment.get(KEY, 'fallback')).toBe('fallback');
		});
	});

	describe('required', () => {
		test('returns the value when set', () => {
			process.env[KEY] = 'hello';
			expect(environment.required(KEY)).toBe('hello');
		});

		test('returns fallback when unset', () => {
			expect(environment.required(KEY, 'fallback')).toBe('fallback');
		});

		test('throws when unset and no fallback', () => {
			expect(() => environment.required(KEY)).toThrow(
				`Missing required environment variable: ${KEY}`,
			);
		});

		test('throws when blank and no fallback', () => {
			process.env[KEY] = '   ';
			expect(() => environment.required(KEY)).toThrow();
		});
	});
});
