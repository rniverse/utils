import { describe, expect, test } from 'bun:test';
import { _ } from '@utils';

describe('lodash titleCase', () => {
	test('should convert simple lowercase string to title case', () => {
		expect(_.titleCase('hello world')).toBe('Hello World');
	});

	test('should convert UPPERCASE string to title case', () => {
		expect(_.titleCase('HELLO WORLD')).toBe('Hello World');
	});

	test('should convert camelCase string to title case', () => {
		expect(_.titleCase('helloWorld')).toBe('Hello World');
		expect(_.titleCase('firstName')).toBe('First Name');
	});

	test('should convert snake_case string to title case', () => {
		expect(_.titleCase('hello_world')).toBe('Hello World');
		expect(_.titleCase('first_name_last_name')).toBe('First Name Last Name');
	});

	test('should convert kebab-case string to title case', () => {
		expect(_.titleCase('hello-world')).toBe('Hello World');
		expect(_.titleCase('first-name')).toBe('First Name');
	});

	test('should handle mixed case and special characters', () => {
		expect(_.titleCase('helloWorld_test-case')).toBe('Hello World Test Case');
		expect(_.titleCase('API_KEY')).toBe('Api Key');
	});

	test('should handle strings with numbers', () => {
		expect(_.titleCase('user123name')).toBe('User 123 Name');
		expect(_.titleCase('test_case_1')).toBe('Test Case 1');
	});

	test('should handle empty string', () => {
		expect(_.titleCase('')).toBe('');
	});

	test('should handle single word', () => {
		expect(_.titleCase('hello')).toBe('Hello');
		expect(_.titleCase('WORLD')).toBe('World');
	});

	test('should handle strings with multiple spaces', () => {
		expect(_.titleCase('hello   world')).toBe('Hello World');
	});

	test('should handle strings with dots', () => {
		expect(_.titleCase('hello.world')).toBe('Hello World');
	});

	test('should handle acronyms', () => {
		expect(_.titleCase('HTTPSConnection')).toBe('Https Connection');
		expect(_.titleCase('XMLHttpRequest')).toBe('Xml Http Request');
	});

	test('should handle database column names', () => {
		expect(_.titleCase('user_id')).toBe('User Id');
		expect(_.titleCase('created_at')).toBe('Created At');
		expect(_.titleCase('is_active')).toBe('Is Active');
	});

	test('should handle API endpoint names', () => {
		expect(_.titleCase('get-user-profile')).toBe('Get User Profile');
		expect(_.titleCase('post_user_data')).toBe('Post User Data');
	});
});
