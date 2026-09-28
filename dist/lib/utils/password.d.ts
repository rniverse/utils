import type { PasswordOptions } from '../type/password.type.js';
export type { PasswordOptions } from '../type/password.type.js';
/**
 * Password hashing with a consistent `(plain, digest)` argument order — argon2's
 * own `verify` takes `(digest, plain)`, a frequent source of bugs.
 *
 * `new Password(options)` for custom argon2 settings; the exported `password`
 * uses `PASSWORD_DEFAULTS`. `verify` needs no settings — they're stored in the
 * digest itself, so a digest made with any settings still verifies.
 */
export declare class Password {
    private readonly settings;
    constructor(options?: PasswordOptions);
    hash: (plain: string) => Promise<string>;
    verify: (plain: string, digest: string) => Promise<boolean>;
}
export declare const password: Password;
//# sourceMappingURL=password.d.ts.map