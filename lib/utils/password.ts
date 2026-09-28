// lib/utils/password.ts
//
// `argon2` is an optional dependency (native build). It is loaded lazily so that
// importing the package without it installed doesn't fail — only calling
// `password.*` does, with a clear message.

import { PASSWORD_DEFAULTS } from '../enum/password.enum';
import type { PasswordOptions } from '../type/password.type';
import { lazy } from './lazy';

export type { PasswordOptions } from '../type/password.type';

type Argon2 = {
	hash(plain: string, options: Record<string, number>): Promise<string>;
	verify(digest: string, plain: string): Promise<boolean>;
};

// argon2's numeric algorithm ids.
const ALGORITHM = { argon2d: 0, argon2i: 1, argon2id: 2 } as const;

// Shared by every `Password` instance. A failed import isn't cached, so
// installing argon2 later and calling again works.
const argon2 = lazy(async (): Promise<Argon2> => {
	try {
		const mod = (await import('argon2')) as unknown as {
			default?: Argon2;
		} & Argon2;
		return mod.default ?? mod;
	} catch {
		throw new Error(
			'@rniverse/utils: `argon2` is an optional dependency — run `bun add argon2` to use `password`.',
		);
	}
});

/**
 * Password hashing with a consistent `(plain, digest)` argument order — argon2's
 * own `verify` takes `(digest, plain)`, a frequent source of bugs.
 *
 * `new Password(options)` for custom argon2 settings; the exported `password`
 * uses `PASSWORD_DEFAULTS`. `verify` needs no settings — they're stored in the
 * digest itself, so a digest made with any settings still verifies.
 */
export class Password {
	private readonly settings: Required<PasswordOptions>;

	constructor(options: PasswordOptions = {}) {
		this.settings = { ...PASSWORD_DEFAULTS, ...options };
	}

	// Arrow properties, so `const { hash } = password` keeps working.
	hash = async (plain: string): Promise<string> => {
		const { type, ...costs } = this.settings;
		return (await argon2.get()).hash(plain, {
			...costs,
			type: ALGORITHM[type],
		});
	};

	verify = async (plain: string, digest: string): Promise<boolean> =>
		(await argon2.get()).verify(digest, plain);
}

export const password = new Password();
