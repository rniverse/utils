/**
 * Default argon2 settings for `Password` / `password`. Pinned explicitly
 * (they equal argon2's own defaults today) so a library upgrade can't silently
 * change how new hashes are made.
 */
export const PASSWORD_DEFAULTS = {
    type: 'argon2id',
    /** KiB. */
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
    /** bytes. */
    hashLength: 32,
};
//# sourceMappingURL=password.enum.js.map