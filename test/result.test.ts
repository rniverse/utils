import { describe, expect, test } from 'bun:test';
import { err, ok } from '@utils/result';

describe('result helpers', () => {
	test('ok() with no data', () => {
		expect(ok()).toEqual({ ok: true });
	});

	test('ok(data) carries the payload', () => {
		expect(ok({ n: 1 })).toEqual({ ok: true, data: { n: 1 } });
	});

	test('ok(falsy-but-defined) still carries data', () => {
		expect(ok(0)).toEqual({ ok: true, data: 0 });
		expect(ok(false)).toEqual({ ok: true, data: false });
		expect(ok('')).toEqual({ ok: true, data: '' });
	});

	test('err(error) wraps the error', () => {
		const e = new Error('x');
		expect(err(e)).toEqual({ ok: false, error: e });
	});
});
