/**
 * Default argon2 settings for `Password` / `password`. Pinned explicitly
 * (they equal argon2's own defaults today) so a library upgrade can't silently
 * change how new hashes are made.
 */
export declare const PASSWORD_DEFAULTS: {
    readonly type: 'argon2id';
    /** KiB. */
    readonly memoryCost: 65536;
    readonly timeCost: 3;
    readonly parallelism: 4;
    /** bytes. */
    readonly hashLength: 32;
};
//# sourceMappingURL=password.enum.d.ts.map