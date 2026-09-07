import { describe, expect, test } from 'bun:test';
import { duration } from '@utils/duration';

describe('duration', () => {
	test('toSeconds parses each unit', () => {
		expect(duration.toSeconds('30s')).toBe(30);
		expect(duration.toSeconds('5m')).toBe(300);
		expect(duration.toSeconds('2h')).toBe(7200);
		expect(duration.toSeconds('1d')).toBe(86400);
		expect(duration.toSeconds('1w')).toBe(604800);
		expect(duration.toSeconds('1y')).toBe(365 * 86400);
	});

	test('trims surrounding whitespace', () => {
		expect(duration.toSeconds('  10m  ')).toBe(600);
	});

	test('toMs is toSeconds * 1000', () => {
		expect(duration.toMs('2s')).toBe(2000);
	});

	test('rejects malformed input', () => {
		for (const bad of ['', '10', 'd', '1.5h', '1 h', '-3m', '10mo', '1y2d']) {
			expect(() => duration.toSeconds(bad)).toThrow();
		}
	});
});
