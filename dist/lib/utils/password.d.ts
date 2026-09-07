/**
 * Password hashing with a consistent `(plain, digest)` argument order — argon2's
 * own `verify` takes `(digest, plain)`, a frequent source of bugs.
 */
export declare const password: {
    hash: (plain: string) => Promise<string>;
    verify: (plain: string, digest: string) => Promise<boolean>;
};
//# sourceMappingURL=password.d.ts.map