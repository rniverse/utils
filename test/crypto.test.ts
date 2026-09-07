import { describe, expect, test } from 'bun:test';
import { randomInt, randomToken, sha256hex } from '@utils/crypto';

describe('randomToken', () => {
	test('default is 32 bytes → 43-char base64url (no padding)', () => {
		const t = randomToken();
		expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(t.length).toBe(43);
	});

	test('honours the byte length', () => {
		expect(randomToken(16).length).toBe(22);
	});

	test('is unique across calls', () => {
		const set = new Set(Array.from({ length: 1000 }, () => randomToken()));
		expect(set.size).toBe(1000);
	});
});

describe('sha256hex', () => {
	test('known vector for the empty string', async () => {
		expect(await sha256hex('')).toBe(
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		);
	});

	test('known vector for "abc"', async () => {
		expect(await sha256hex('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
		);
	});

	test('is deterministic', async () => {
		expect(await sha256hex('rniverse')).toBe(await sha256hex('rniverse'));
	});
});

describe('randomInt', () => {
	test('stays within the inclusive range', () => {
		for (let i = 0; i < 5000; i++) {
			const n = randomInt(1, 6);
			expect(Number.isInteger(n)).toBe(true);
			expect(n).toBeGreaterThanOrEqual(1);
			expect(n).toBeLessThanOrEqual(6);
		}
	});

	test('a single-value range returns that value', () => {
		expect(randomInt(7, 7)).toBe(7);
	});

	test('throws when max < min', () => {
		expect(() => randomInt(5, 4)).toThrow(RangeError);
	});

	test('covers every value of a small range', () => {
		const seen = new Set<number>();
		for (let i = 0; i < 2000; i++) seen.add(randomInt(0, 9));
		expect(seen.size).toBe(10);
	});

	test('roughly uniform over a die', () => {
		const counts = new Array(6).fill(0);
		const rolls = 60000;
		for (let i = 0; i < rolls; i++) counts[randomInt(0, 5)]++;
		for (const c of counts) {
			expect(c).toBeGreaterThan(rolls / 6 - 1000);
			expect(c).toBeLessThan(rolls / 6 + 1000);
		}
	});
});
