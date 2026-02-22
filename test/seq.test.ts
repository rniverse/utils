import { describe, expect, test } from 'bun:test';
import { async$seq, getCode, sync$seq } from '@utils/seq';

describe('seq utility', () => {
	describe('getCode', () => {
		test('pads string to default length 10', () => {
			expect(getCode('1')).toBe('0000000001');
			expect(getCode('abc')).toBe('0000000abc');
		});

		test('pads to custom length', () => {
			expect(getCode('1', 5)).toBe('00001');
			expect(getCode('1', 1)).toBe('1');
		});

		test('does not truncate if already longer', () => {
			expect(getCode('12345678901', 10)).toBe('12345678901');
		});
	});

	describe('sync$seq', () => {
		test('get() returns incrementing raw bigint strings', () => {
			const next = sync$seq.get();
			expect(next()).toBe('1');
			expect(next()).toBe('2');
			expect(next()).toBe('3');
		});

		test('get({ type: "code" }) returns base-36 padded codes', () => {
			const next = sync$seq.get({ type: 'code', length: 10 });
			expect(next()).toBe('0000000001');
			expect(next()).toBe('0000000002');
		});

		test('get({ prefix }) prepends prefix with dash', () => {
			const next = sync$seq.get({ prefix: 'ERR', type: 'code', length: 6 });
			expect(next()).toBe('ERR-000001');
			expect(next()).toBe('ERR-000002');
		});

		test('next.seq() returns raw bigint generator', () => {
			const gen = sync$seq.next.seq();
			expect(gen()).toBe(1n);
			expect(gen()).toBe(2n);
			expect(gen()).toBe(3n);
		});

		test('next.code() returns prefixed code generator', () => {
			const next = sync$seq.next.code('DOC');
			expect(next()).toBe('DOC-0000000001');
			expect(next()).toBe('DOC-0000000002');
		});

		test('separate generators are independent', () => {
			const a = sync$seq.get({ type: 'code', length: 4 });
			const b = sync$seq.get({ type: 'code', length: 4 });
			expect(a()).toBe('0001');
			expect(b()).toBe('0001');
			expect(a()).toBe('0002');
			expect(b()).toBe('0002');
		});

		test('base-36 encoding for larger numbers', () => {
			const gen = sync$seq.next.seq();
			// Advance to 36
			for (let i = 0; i < 36; i++) gen();
			const next = sync$seq.get({ type: 'code', length: 4 });
			// First call is 1 in base-36 = '1'
			next();
			// Values 10+ in base-36: 10 -> 'a'
			for (let i = 0; i < 9; i++) next();
			expect(next()).toBe('000b'); // 11th call = 11 in base-36 = 'b'
		});
	});

	describe('async$seq', () => {
		test('get() returns incrementing values', async () => {
			const next = async$seq.get();
			expect(await next()).toBe('1');
			expect(await next()).toBe('2');
			expect(await next()).toBe('3');
		});

		test('get({ type: "code", prefix }) works', async () => {
			const next = async$seq.get({ prefix: 'TXN', type: 'code', length: 8 });
			expect(await next()).toBe('TXN-00000001');
			expect(await next()).toBe('TXN-00000002');
		});

		test('next.seq() returns raw bigint generator', async () => {
			const gen = async$seq.next.seq();
			expect(await gen()).toBe(1n);
			expect(await gen()).toBe(2n);
		});

		test('next.code() returns prefixed code generator', async () => {
			const next = async$seq.next.code('INV');
			expect(await next()).toBe('INV-0000000001');
			expect(await next()).toBe('INV-0000000002');
		});

		test('concurrent calls produce unique values', async () => {
			const next = async$seq.get({ type: 'code', length: 6 });
			const results = await Promise.all([
				next(),
				next(),
				next(),
				next(),
				next(),
				next(),
				next(),
				next(),
				next(),
				next(),
			]);
			const unique = new Set(results);
			expect(unique.size).toBe(10);
		});

		test('separate async generators are independent', async () => {
			const a = async$seq.get({ type: 'code', length: 4 });
			const b = async$seq.get({ type: 'code', length: 4 });
			expect(await a()).toBe('0001');
			expect(await b()).toBe('0001');
			expect(await a()).toBe('0002');
		});
	});
});
