import { describe, expect, test } from 'bun:test';
import { mask, sanitize } from '@utils/sanitize';

describe('sanitize', () => {
	test('drops default keys, shallow', () => {
		const out = sanitize({
			id: 1,
			password: 'p',
			hash: 'h',
			token: 't',
			name: 'x',
		});
		expect(out).toEqual({ id: 1, name: 'x' });
	});

	test('honours a custom key list', () => {
		const out = sanitize({ a: 1, b: 2, c: 3 }, ['b']);
		expect(out).toEqual({ a: 1, c: 3 });
	});

	test('shallow by default leaves nested secrets', () => {
		const out = sanitize({ user: { password: 'p', name: 'x' } });
		expect(out).toEqual({ user: { password: 'p', name: 'x' } });
	});

	test('deep option strips nested keys and walks arrays', () => {
		const out = sanitize(
			{ list: [{ password: 'p', ok: 1 }], nested: { token: 't', ok: 2 } },
			undefined,
			{ deep: true },
		);
		expect(out).toEqual({ list: [{ ok: 1 }], nested: { ok: 2 } } as typeof out);
	});
});

describe('mask', () => {
	test('replaces values at default keys', () => {
		expect(mask({ id: 1, password: 'hunter2', name: 'x' })).toEqual({
			id: 1,
			password: '***',
			name: 'x',
		});
	});

	test('custom mask string + key list', () => {
		expect(mask({ a: 'secret', b: 'keep' }, ['a'], '[redacted]')).toEqual({
			a: '[redacted]',
			b: 'keep',
		});
	});

	test('deep option masks nested + arrays', () => {
		const out = mask({ items: [{ secret: 's', ok: 1 }] }, undefined, '***', {
			deep: true,
		});
		expect(out).toEqual({ items: [{ secret: '***', ok: 1 }] });
	});

	test('does not mutate the input', () => {
		const input = { password: 'p' };
		mask(input);
		expect(input.password).toBe('p');
	});
});
