import { describe, expect, test } from 'bun:test';
import { _ } from '../lib/utils/lodash';

describe('lodash cleanup utility', () => {
	describe('Basic cleanup with nil values', () => {
		test('should remove null values from object', () => {
			const input = { a: 1, b: null, c: 3 };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({ a: 1, c: 3 });
		});

		test('should remove undefined values from object', () => {
			const input = { a: 1, b: undefined, c: 3 };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({ a: 1, c: 3 });
		});

		test('should remove both null and undefined values', () => {
			const input = { a: 1, b: null, c: undefined, d: 4 };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({ a: 1, d: 4 });
		});

		test('should keep falsy values that are not nil', () => {
			const input = { a: 0, b: false, c: '', d: null };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({ a: 0, b: false, c: '' });
		});
	});

	describe('Nested object cleanup', () => {
		test('should clean nested objects', () => {
			const input = {
				a: 1,
				b: { x: 2, y: null, z: 3 },
				c: null,
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				a: 1,
				b: { x: 2, z: 3 },
			});
		});

		test('should clean deeply nested objects', () => {
			const input = {
				level1: {
					level2: {
						level3: {
							value: 'keep',
							remove: null,
						},
						alsoRemove: undefined,
					},
					keep: 'this',
				},
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				level1: {
					level2: {
						level3: {
							value: 'keep',
						},
					},
					keep: 'this',
				},
			});
		});

		test('should handle empty nested objects after cleanup', () => {
			const input = {
				a: 1,
				b: { x: null, y: undefined },
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				a: 1,
				b: {},
			});
		});
	});

	describe('Array cleanup', () => {
		test('should recursively clean objects in arrays', () => {
			// Note: cleanup doesn't filter array elements, it only cleans objects within arrays
			const input = [{ a: 1, b: null }, { c: 2, d: undefined }, { e: 3 }];
			const result = _.cleanup(input) as any;
			expect(result).toEqual([{ a: 1 }, { c: 2 }, { e: 3 }]);
		});

		test('should recursively clean nested arrays and objects', () => {
			const input = [{ items: [{ x: 1, y: null }] }, { items: [{ z: 2 }] }];
			const result = _.cleanup(input) as any;
			expect(result).toEqual([{ items: [{ x: 1 }] }, { items: [{ z: 2 }] }]);
		});

		test('should clean objects containing arrays', () => {
			const input = {
				values: [{ x: 1, y: null }],
				data: [{ a: 1 }, { b: null, c: 2 }],
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				values: [{ x: 1 }],
				data: [{ a: 1 }, { c: 2 }],
			});
		});
	});

	describe('Custom clear function', () => {
		test('should use custom clear function to remove empty strings', () => {
			const input = { a: 'hello', b: '', c: 'world', d: '' };
			const result = _.cleanup(input, (v: any) => v === '') as any;
			expect(result).toEqual({ a: 'hello', c: 'world' });
		});

		test('should use custom clear function to remove zero values', () => {
			const input = { a: 1, b: 0, c: 2, d: 0 };
			const result = _.cleanup(input, (v: any) => v === 0) as any;
			expect(result).toEqual({ a: 1, c: 2 });
		});

		test('should use custom clear function to remove false values', () => {
			const input = { a: true, b: false, c: true, d: false };
			const result = _.cleanup(input, (v: any) => v === false) as any;
			expect(result).toEqual({ a: true, c: true });
		});

		test('should use custom clear function with complex logic', () => {
			const input = { a: 10, b: 20, c: 30, d: 5 };
			const result = _.cleanup(
				input,
				(v: any) => typeof v === 'number' && v < 15,
			) as any;
			expect(result).toEqual({ b: 20, c: 30 });
		});

		test('should apply custom clear function recursively', () => {
			// The cleanup function applies the clear function recursively to all nested levels
			const input = {
				empty: '',
				user: { name: 'John', email: '' },
				settings: { theme: 'dark', lang: '' },
			};
			const result = _.cleanup(input, (v: any) => v === '') as any;
			expect(result).toEqual({
				user: { name: 'John' },
				settings: { theme: 'dark' },
			});
		});

		test('should handle custom clear with nested objects', () => {
			// The cleanup recursively processes nested objects but applies the clear function at each level
			const input = {
				keep: 'value',
				remove: false, // Something the clear function targets
				nested: { a: 1, b: 2 },
			};
			const result = _.cleanup(input, (v: any) => v === false) as any;
			expect(result).toEqual({ keep: 'value', nested: { a: 1, b: 2 } });
		});
	});

	describe('Edge cases', () => {
		test('should handle null input', () => {
			const result = _.cleanup(null as any);
			expect(result).toBeNull();
		});

		test('should handle undefined input', () => {
			const result = _.cleanup(undefined as any);
			expect(result).toBeUndefined();
		});

		test('should handle empty object', () => {
			const result = _.cleanup({});
			expect(result).toEqual({});
		});

		test('should handle empty array', () => {
			const result = _.cleanup([]);
			expect(result).toEqual([]);
		});

		test('should handle primitives', () => {
			// Cleanup returns primitives as-is when passed non-object values
			const stringResult = _.cleanup('string' as any);
			const numberResult = _.cleanup(42 as any);
			const trueResult = _.cleanup(true as any);
			const falseResult = _.cleanup(false as any);

			expect(stringResult).toBe('string');
			expect(numberResult).toBe(42);
			expect(trueResult).toBe(true);
			expect(falseResult).toBe(false);
		});

		test('should not mutate original object', () => {
			const input = { a: 1, b: null, c: 3 };
			const original = { ...input };
			_.cleanup(input);
			expect(input).toEqual(original);
		});

		test('should handle objects with no nil values', () => {
			const input = { a: 1, b: 2, c: 3 };
			const result = _.cleanup(input);
			expect(result).toEqual({ a: 1, b: 2, c: 3 });
		});

		test('should handle all nil values', () => {
			const input = { a: null, b: undefined, c: null };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({});
		});
	});

	describe('Complex nested structures', () => {
		test('should handle mixed nested structures', () => {
			const input = {
				users: [
					{ id: 1, name: 'John', email: null },
					{ id: 2, name: null, email: 'jane@example.com' },
				],
				meta: {
					count: 2,
					page: null,
					filters: {
						active: true,
						deleted: undefined,
					},
				},
				settings: null,
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				users: [
					{ id: 1, name: 'John' },
					{ id: 2, email: 'jane@example.com' },
				],
				meta: {
					count: 2,
					filters: {
						active: true,
					},
				},
			});
		});

		test('should handle deeply nested arrays and objects', () => {
			const input = {
				data: [
					{
						items: [
							{ value: 1, label: null },
							{ value: 2, label: 'two' },
						],
					},
					{
						items: [{ value: null, label: 'three' }],
					},
				],
			};
			const result = _.cleanup(input) as any;
			expect(result).toEqual({
				data: [
					{
						items: [{ value: 1 }, { value: 2, label: 'two' }],
					},
					{
						items: [{ label: 'three' }],
					},
				],
			});
		});
	});

	describe('TypeScript type preservation', () => {
		test('should work with typed objects', () => {
			interface User {
				id: number;
				name: string;
				email?: string | null;
			}

			const input: User = { id: 1, name: 'John', email: null };
			const result = _.cleanup(input) as any;
			expect(result).toEqual({ id: 1, name: 'John' });
		});
	});
});
