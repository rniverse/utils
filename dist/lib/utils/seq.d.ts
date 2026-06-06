/**
 * Sequential code / ID generator utility.
 *
 * Provides both sync and async variants for generating
 * sequential codes, counters, and prefixed IDs.
 *
 * @example Sync — startup-time generation (error codes, enum codes)
 * ```ts
 * const next_code = sync$seq.get({ type: 'code', length: 10 });
 * next_code(); // '0000000001'
 * next_code(); // '0000000002'
 * ```
 *
 * @example Sync — with prefix
 * ```ts
 * const next_err = sync$seq.get({ prefix: 'ERR', type: 'code', length: 10 });
 * next_err(); // 'ERR-0000000001'
 * ```
 *
 * @example Async — runtime ID generation with concurrency safety
 * ```ts
 * const next_id = async$seq.get({ prefix: 'TXN', type: 'code' });
 * await next_id(); // 'TXN-0000000001'
 * ```
 */
export interface SeqOptions {
    /** Optional prefix prepended with '-' separator */
    prefix?: string;
    /** 'code' for base-36 padded string output; omit for raw bigint-as-string */
    type?: string;
    /** Pad length for 'code' type (default: 10) */
    length?: number;
    /** Radix for 'code' type (default: 36) */
    radix?: number;
}
/** Pad a string to the given length with leading zeros */
export declare const getCode: (str: string, length?: number) => string;
/** Synchronous sequence generators — for startup-time code generation */
export declare const sync$seq: {
    next: {
        seq: () => () => bigint;
        code: (prefix?: string) => () => string;
    };
    get: (options?: SeqOptions) => () => string;
};
/** Async sequence generators — for runtime ID generation with concurrency safety */
export declare const async$seq: {
    next: {
        seq: () => () => Promise<bigint>;
        code: (prefix?: string) => () => Promise<string>;
    };
    get: (options?: SeqOptions) => () => Promise<string>;
};
//# sourceMappingURL=seq.d.ts.map