import { describe, expect, test } from 'bun:test';
import { _ } from '../lib/utils/lodash';

describe('lodash.templated', () => {
	describe('Hardcode functionality', () => {
		test('should return hardcoded string value', () => {
			const template = {
				name: { hardcode: 'John Doe' },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ name: 'John Doe' });
		});

		test('should return hardcoded number value', () => {
			const template = {
				age: { hardcode: 25 },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ age: 25 });
		});

		test('should return hardcoded boolean value', () => {
			const template = {
				isActive: { hardcode: true },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ isActive: true });
		});

		test('should return hardcoded null value', () => {
			const template = {
				value: { hardcode: null },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ value: null });
		});

		test('should prioritize hardcode over getters', () => {
			const template = {
				name: { hardcode: 'Hardcoded', getters: ['inputName'] },
			};
			const input = { inputName: 'FromInput' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Hardcoded' });
		});
	});

	describe('Getters functionality', () => {
		test('should retrieve value from first getter', () => {
			const template = {
				name: { getters: ['firstName'] },
			};
			const input = { firstName: 'Alice' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Alice' });
		});

		test('should fall back to second getter when first is nil', () => {
			const template = {
				name: { getters: ['firstName', 'fullName'] },
			};
			const input = { firstName: null, fullName: 'Bob Smith' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Bob Smith' });
		});

		test('should handle nested property paths in getters', () => {
			const template = {
				userName: { getters: ['user.profile.name'] },
			};
			const input = { user: { profile: { name: 'Charlie' } } };
			const result = _.templated(template, input);
			expect(result).toEqual({ userName: 'Charlie' });
		});

		test('should handle array access in getters', () => {
			const template = {
				firstUser: { getters: ['users[0].name'] },
			};
			const input = { users: [{ name: 'David' }, { name: 'Eve' }] };
			const result = _.templated(template, input);
			expect(result).toEqual({ firstUser: 'David' });
		});

		test('should return undefined when all getters fail', () => {
			const template = {
				name: { getters: ['firstName', 'lastName'] },
			};
			const input = { age: 30 };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: undefined });
		});

		test('should handle multiple getters with nil values', () => {
			const template = {
				value: { getters: ['a', 'b', 'c'] },
			};
			const input = { a: null, b: undefined, c: 42 };
			const result = _.templated(template, input);
			expect(result).toEqual({ value: 42 });
		});
	});

	describe('Now functionality', () => {
		test('should generate ISO timestamp when now is true', () => {
			const template = {
				timestamp: { now: true },
			};
			const result = _.templated(template, {});
			expect(result.timestamp).toBeDefined();
			expect(typeof result.timestamp).toBe('string');
			// Verify it's a valid ISO string
			const ts = result.timestamp as string;
			expect(new Date(ts).toISOString()).toBe(ts);
		});

		test('should not generate timestamp when now is false', () => {
			const template = {
				timestamp: { now: false },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ timestamp: undefined });
		});

		test('should prioritize hardcode over now', () => {
			const template = {
				timestamp: { hardcode: '2024-01-01', now: true },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ timestamp: '2024-01-01' });
		});

		test('should prioritize getters over now', () => {
			const template = {
				timestamp: { getters: ['createdAt'], now: true },
			};
			const input = { createdAt: '2023-12-01T00:00:00.000Z' };
			const result = _.templated(template, input);
			expect(result).toEqual({ timestamp: '2023-12-01T00:00:00.000Z' });
		});
	});

	describe('Default functionality', () => {
		test('should use default when no value is found', () => {
			const template = {
				name: { getters: ['firstName'], default: 'Unknown' },
			};
			const input = {};
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Unknown' });
		});

		test('should use default when getters return nil', () => {
			const template = {
				value: { getters: ['a'], default: 0 },
			};
			const input = { a: null };
			const result = _.templated(template, input);
			expect(result).toEqual({ value: 0 });
		});

		test('should not use default when getter finds value', () => {
			const template = {
				name: { getters: ['firstName'], default: 'Unknown' },
			};
			const input = { firstName: 'Frank' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Frank' });
		});

		test('should not use default when hardcode is provided', () => {
			const template = {
				name: { hardcode: 'Hardcoded', default: 'Default' },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ name: 'Hardcoded' });
		});

		test('should use default for now when now is false', () => {
			const template = {
				timestamp: { now: false, default: '1970-01-01' },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ timestamp: '1970-01-01' });
		});
	});

	describe('Complex template scenarios', () => {
		test('should handle multiple fields with different configs', () => {
			const template = {
				id: { hardcode: 123 },
				name: { getters: ['userName', 'fullName'] },
				createdAt: { now: true },
				status: { default: 'active' },
			};
			const input = { userName: 'George' };
			const result = _.templated(template, input);
			expect(result.id).toBe(123);
			expect(result.name).toBe('George');
			expect(result.createdAt).toBeDefined();
			expect(result.status).toBe('active');
		});

		test('should handle nested output paths', () => {
			const template = {
				'user.name': { getters: ['name'] },
				'user.age': { hardcode: 30 },
			};
			const input = { name: 'Helen' };
			const result = _.templated(template, input);
			expect(result).toEqual({
				user: {
					name: 'Helen',
					age: 30,
				},
			});
		});

		test('should handle empty template', () => {
			const template = {};
			const input = { name: 'Test' };
			const result = _.templated(template, input);
			expect(result).toEqual({});
		});

		test('should handle nil config values', () => {
			const template = {
				name: undefined as any,
			};
			const input = { name: 'Test' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: undefined });
		});

		test('should handle config with only default', () => {
			const template = {
				status: { default: 'pending' },
			};
			const result = _.templated(template, {});
			expect(result).toEqual({ status: 'pending' });
		});
	});

	describe('Edge cases', () => {
		test('should handle empty getters array', () => {
			const template = {
				name: { getters: [], default: 'Default' },
			};
			const input = { name: 'Test' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: 'Default' });
		});

		test('should treat 0 as valid value from getters', () => {
			const template = {
				count: { getters: ['value'] },
			};
			const input = { value: 0 };
			const result = _.templated(template, input);
			expect(result).toEqual({ count: 0 });
		});

		test('should treat false as valid value from getters', () => {
			const template = {
				isActive: { getters: ['active'] },
			};
			const input = { active: false };
			const result = _.templated(template, input);
			expect(result).toEqual({ isActive: false });
		});

		test('should treat empty string as valid value from getters', () => {
			const template = {
				name: { getters: ['value'], default: 'Default' },
			};
			const input = { value: '' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: '' });
		});

		test('should handle deeply nested input and output paths', () => {
			const template = {
				'result.data.user.name': { getters: ['input.nested.user.fullName'] },
			};
			const input = {
				input: {
					nested: {
						user: {
							fullName: 'Iris',
						},
					},
				},
			};
			const result = _.templated(template, input);
			expect(result).toEqual({
				result: {
					data: {
						user: {
							name: 'Iris',
						},
					},
				},
			});
		});

		test('should handle config with no operations', () => {
			const template = {
				name: {},
			};
			const input = { name: 'Test' };
			const result = _.templated(template, input);
			expect(result).toEqual({ name: undefined });
		});

		test('should handle multiple fields with priority order', () => {
			const template = {
				field1: { hardcode: 'A', getters: ['x'], now: true, default: 'D' },
				field2: { getters: ['y'], now: true, default: 'D' },
				field3: { now: true, default: 'D' },
				field4: { default: 'D' },
			};
			const input = { y: 'Y' };
			const result = _.templated(template, input);
			expect(result.field1).toBe('A'); // hardcode wins
			expect(result.field2).toBe('Y'); // getter wins over now
			expect(typeof result.field3).toBe('string'); // now generates timestamp
			expect(result.field4).toBe('D'); // default only
		});

		test('', () => {
			const input = {
				iss: 'https://accounts.google.com',
				azp: '265480003227-q6fk8dte11t078adofchdq1kub77jgai.apps.googleusercontent.com',
				aud: '265480003227-q6fk8dte11t078adofchdq1kub77jgai.apps.googleusercontent.com',
				sub: '117822063253329467524',
				email: 'r.ravikiranjonnapalli@gmail.com',
				email_verified: true,
				at_hash: 'XK5SoYUfQKoZpmsn38YZug',
				name: 'R Ravikiran Jonnapalli',
				picture:
					'https://lh3.googleusercontent.com/a/ACg8ocK_QY55U53giEAEVVbzynK6i7sYVvqYwL_hvG2snjau45eLK-q-=s96-c',
				given_name: 'R Ravikiran',
				family_name: 'Jonnapalli',
				iat: 1762259273,
				exp: 1762262873,
			};

			const template = {
				firstname: { getters: ['given_name'] },
				lastname: { getters: ['family_name'] },
				email: { getters: ['email'] },
				avatar: { getters: ['picture'] },
				provider_id: { getters: ['sub'] },
				fullname: { getters: ['name'] },
			};
			const result = _.templated(template, input);
			expect(result).toEqual({
				firstname: 'R Ravikiran',
				lastname: 'Jonnapalli',
				email: 'r.ravikiranjonnapalli@gmail.com',
				avatar:
					'https://lh3.googleusercontent.com/a/ACg8ocK_QY55U53giEAEVVbzynK6i7sYVvqYwL_hvG2snjau45eLK-q-=s96-c',
				provider_id: '117822063253329467524',
				fullname: 'R Ravikiran Jonnapalli',
			});
		});
	});
});
