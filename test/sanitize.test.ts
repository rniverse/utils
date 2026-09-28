import { describe, expect, test } from 'bun:test';
import { MASK_PROPS } from '@enum/mask.enum';
import { mask, sanitize, secrets } from '@utils/sanitize';

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

describe('secrets / MASK_PROPS', () => {
	const withEnv = (value: string | undefined, fn: () => void) => {
		const previous = process.env.MASK_PROPS;
		if (value === undefined) delete process.env.MASK_PROPS;
		else process.env.MASK_PROPS = value;
		try {
			fn();
		} finally {
			if (previous === undefined) delete process.env.MASK_PROPS;
			else process.env.MASK_PROPS = previous;
		}
	};

	test('defaults to the built-in list, the same one the logger uses', () => {
		withEnv(undefined, () => {
			expect(secrets()).toEqual([...MASK_PROPS]);
			const out = sanitize({
				accessToken: 'a',
				refreshToken: 'r',
				authorization: 'Bearer x',
				cookie: 'c',
				name: 'x',
			});
			expect(out).toEqual({ name: 'x' });
		});
	});

	test('MASK_PROPS replaces the list (comma-separated, trimmed, blanks dropped)', () => {
		withEnv(' apiKey , pin ,, ', () => {
			expect(secrets()).toEqual(['apiKey', 'pin']);
			// password is NOT masked any more — the env var replaces, not extends
			expect(mask({ apiKey: 'k', pin: '1234', password: 'p' })).toEqual({
				apiKey: '***',
				pin: '***',
				password: 'p',
			});
		});
	});

	test('a blank MASK_PROPS counts as unset', () => {
		withEnv('   ', () => {
			expect(secrets()).toEqual([...MASK_PROPS]);
		});
	});
});
