// lib/utils/password.ts
//
// `argon2` is an optional dependency (native build). It is loaded lazily so that
// importing the package without it installed doesn't fail — only calling
// `password.*` does, with a clear message.
let cached;
async function argon() {
    if (cached)
        return cached;
    try {
        const mod = (await import('argon2'));
        cached = mod.default ?? mod;
        return cached;
    }
    catch {
        throw new Error('@rniverse/utils: `argon2` is an optional dependency — run `bun add argon2` to use `password`.');
    }
}
/**
 * Password hashing with a consistent `(plain, digest)` argument order — argon2's
 * own `verify` takes `(digest, plain)`, a frequent source of bugs.
 */
export const password = {
    hash: async (plain) => (await argon()).hash(plain),
    verify: async (plain, digest) => (await argon()).verify(digest, plain),
};
//# sourceMappingURL=password.js.map