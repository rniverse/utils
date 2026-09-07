/** Cryptographically-random opaque token, base64url-encoded. */
export declare function randomToken(bytes?: number): string;
/**
 * Cryptographically-secure random integer in `[min, max]` (inclusive), with no
 * modulo bias. Use this over `random.int` for anything security-sensitive —
 * one-time codes, secure selection, shuffles.
 */
export declare function randomInt(min: number, max: number): number;
/** SHA-256 of `value`, hex-encoded. Handy for storing a lookup hash of a token. */
export declare function sha256hex(value: string): Promise<string>;
//# sourceMappingURL=crypto.d.ts.map