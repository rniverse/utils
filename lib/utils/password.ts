// lib/utils/password.ts
//
// `argon2` is an optional dependency (native build). It is loaded lazily so that
// importing the package without it installed doesn't fail — only calling
// `password.*` does, with a clear message.

type Argon2 = {
	hash(plain: string): Promise<string>;
	verify(digest: string, plain: string): Promise<boolean>;
};

let cached: Argon2 | undefined;

async function argon(): Promise<Argon2> {
	if (cached) return cached;
	try {
		const mod = (await import('argon2')) as unknown as {
			default?: Argon2;
		} & Argon2;
		cached = mod.default ?? mod;
		return cached;
	} catch {
		throw new Error(
			'@rniverse/utils: `argon2` is an optional dependency — run `bun add argon2` to use `password`.',
		);
	}
}

/**
 * Password hashing with a consistent `(plain, digest)` argument order — argon2's
 * own `verify` takes `(digest, plain)`, a frequent source of bugs.
 */
export const password = {
	hash: async (plain: string): Promise<string> => (await argon()).hash(plain),
	verify: async (plain: string, digest: string): Promise<boolean> =>
		(await argon()).verify(digest, plain),
};
