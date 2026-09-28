// lib/utils/password.ts
//
// `argon2` is an optional dependency (native build). It is loaded lazily so that
// importing the package without it installed doesn't fail — only calling
// `password.*` does, with a clear message.
import { PASSWORD_DEFAULTS } from '../enum/password.enum.js';
import { lazy } from './lazy.js';
// argon2's numeric algorithm ids.
const ALGORITHM = { argon2d: 0, argon2i: 1, argon2id: 2 };
// Shared by every `Password` instance. A failed import isn't cached, so
// installing argon2 later and calling again works.
const argon2 = lazy(async () => {
    try {
        const mod = (await import('argon2'));
        return mod.default ?? mod;
    }
    catch {
        throw new Error('@rniverse/utils: `argon2` is an optional dependency — run `bun add argon2` to use `password`.');
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
    settings;
    constructor(options = {}) {
        this.settings = { ...PASSWORD_DEFAULTS, ...options };
    }
    // Arrow properties, so `const { hash } = password` keeps working.
    hash = async (plain) => {
        const { type, ...costs } = this.settings;
        return (await argon2.get()).hash(plain, {
            ...costs,
            type: ALGORITHM[type],
        });
    };
    verify = async (plain, digest) => (await argon2.get()).verify(digest, plain);
}
export const password = new Password();
//# sourceMappingURL=password.js.map