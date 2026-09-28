/**
 * Property names treated as secrets by default — masked in logs (`log`,
 * `createLogger`) and dropped / masked by `sanitize` / `mask`. Overridden at
 * runtime by the `MASK_PROPS` env var (comma-separated), which REPLACES this
 * list rather than adding to it.
 */
export const MASK_PROPS = [
    'password',
    'hash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'authorization',
    'cookie',
];
/** What masked values are replaced with. */
export const MASK_CENSOR = '***';
//# sourceMappingURL=mask.enum.js.map